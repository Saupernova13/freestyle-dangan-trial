extends Node
## Trial Loader - Handles loading and extracting .drtrial files
##
## This autoload singleton manages:
## - Extracting .drtrial (ZIP) files to temporary directory
## - Parsing trial.json and loading trial data
## - Loading character data and assets
## - Providing access to loaded trial data for gameplay

# Extracted trial data
var current_trial: Dictionary = {}
var current_trial_path: String = ""
var extract_dir: String = "user://trials/extracted/"

## Populated by load_trial() on failure so the caller (start menu, trial room)
## can surface a useful message to the user. Empty when the last load succeeded.
var last_load_error: String = ""

## Load a trial from a .drtrial file. Sets last_load_error on failure.
func load_trial(file_path: String) -> bool:
	print("Loading trial from: ", file_path)
	last_load_error = ""

	# Clear previous trial data
	current_trial = {}
	current_trial_path = ""

	# Verify file exists
	if not FileAccess.file_exists(file_path):
		last_load_error = "Trial file not found at %s" % file_path
		push_error(last_load_error)
		return false

	# Wipe any leftover files from a previous trial so stale assets can't be
	# resolved by name (Android repro: open trial A, then trial B, B referenced
	# missing assets that A had — TrialLoader picked up A's leftover files).
	_clear_extract_dir()

	# Extract ZIP archive
	if not extract_trial_archive(file_path, extract_dir):
		last_load_error = "Trial archive could not be extracted. The file may be corrupt or unreadable on this device."
		push_error(last_load_error)
		return false

	# Parse trial.json
	var trial_data = parse_trial_data(extract_dir + "trial.json")
	if trial_data.is_empty():
		last_load_error = "trial.json missing or invalid in the selected file."
		push_error(last_load_error)
		return false

	# Store loaded trial data
	current_trial = trial_data
	current_trial_path = file_path

	print("Trial loaded successfully: ", trial_data.get("trialName", "Unnamed"))
	print("  - Characters: ", trial_data.get("characters", []).size())
	print("  - Script lines: ", trial_data.get("script", {}).get("lines", []).size())
	print("  - Minigames: ", trial_data.get("minigames", []).size())
	print("  - Truth bullets: ", trial_data.get("truthBullets", []).size())

	return true

## Extract .drtrial (ZIP) file to directory
func extract_trial_archive(zip_path: String, extract_to: String) -> bool:
	print("Extracting archive to: ", extract_to)

	# Create ZIPReader
	var reader = ZIPReader.new()
	var err = reader.open(zip_path)

	if err != OK:
		push_error("Failed to open ZIP file: " + error_string(err))
		return false

	# Ensure extraction directory exists
	DirAccess.make_dir_recursive_absolute(extract_to)

	# Get list of files in archive
	var files = reader.get_files()
	print("Archive contains ", files.size(), " files")

	# Extract each file
	for file_path in files:
		# Skip directory entries (ending with /)
		if file_path.ends_with("/"):
			continue

		# Read file data from ZIP
		var data = reader.read_file(file_path)
		if data.size() == 0:
			push_warning("Empty or unreadable file: " + file_path)
			continue

		# Determine full output path
		var output_path = extract_to + file_path

		# Create parent directories if needed
		var dir_path = output_path.get_base_dir()
		DirAccess.make_dir_recursive_absolute(dir_path)

		# Write file
		var file = FileAccess.open(output_path, FileAccess.WRITE)
		if file:
			file.store_buffer(data)
			file.close()
		else:
			push_warning("Failed to write file: " + output_path)

	reader.close()
	print("Extraction complete")
	return true

## Parse trial.json file
func parse_trial_data(json_path: String) -> Dictionary:
	print("Parsing trial data: ", json_path)

	# Read JSON file
	if not FileAccess.file_exists(json_path):
		push_error("trial.json not found at: " + json_path)
		return {}

	var json_text = FileAccess.get_file_as_string(json_path)
	if json_text.is_empty():
		push_error("trial.json is empty")
		return {}

	# Parse JSON
	var json = JSON.new()
	var parse_result = json.parse(json_text)

	if parse_result != OK:
		push_error("Failed to parse trial.json: " + json.get_error_message())
		return {}

	var data = json.data

	# Validate required fields
	if not data.has("trialName"):
		push_warning("trial.json missing trialName field")

	return data

## Load character data by ID
## Returns character dictionary or empty dict if not found
func load_character(character_id: String) -> Dictionary:
	if character_id.is_empty() or character_id == "null":
		return {}

	# Search for character folder by ID
	var characters_dir = extract_dir + "Characters/"

	if not DirAccess.dir_exists_absolute(characters_dir):
		push_warning("Characters directory not found")
		return {}

	# Iterate through character folders
	var dir = DirAccess.open(characters_dir)
	if dir:
		dir.list_dir_begin()
		var folder_name = dir.get_next()

		while folder_name != "":
			if dir.current_is_dir():
				var char_json_path = characters_dir + folder_name + "/character.json"

				if FileAccess.file_exists(char_json_path):
					var char_data = parse_character_json(char_json_path)

					if char_data.get("id", "") == character_id:
						# Add folder path for asset loading
						char_data["folder_path"] = characters_dir + folder_name
						dir.list_dir_end()
						return char_data

			folder_name = dir.get_next()

		dir.list_dir_end()

	push_warning("Character not found: " + character_id)
	return {}

## Parse character.json file
func parse_character_json(json_path: String) -> Dictionary:
	var json_text = FileAccess.get_file_as_string(json_path)
	if json_text.is_empty():
		return {}

	var json = JSON.new()
	var parse_result = json.parse(json_text)

	if parse_result != OK:
		return {}

	return json.data

## Get sprite path for character
func get_character_sprite(character_id: String, sprite_index: int) -> String:
	var char_data = load_character(character_id)
	if char_data.is_empty():
		return ""

	var folder_path = char_data.get("folder_path", "")
	if folder_path.is_empty():
		return ""

	var sprite_file = "sprite_%02d.png" % sprite_index
	var sprite_path = folder_path + "/" + sprite_file

	if FileAccess.file_exists(sprite_path):
		return sprite_path

	return ""

## Get audio path for script line
func get_audio_path(audio_filename: String) -> String:
	if audio_filename.is_empty():
		return ""

	var audio_path = extract_dir + "Audio/" + audio_filename

	if FileAccess.file_exists(audio_path):
		return audio_path

	return ""

## Get truth bullet image path
func get_truth_bullet_image(image_filename: String) -> String:
	if image_filename.is_empty():
		return ""

	var image_path = extract_dir + "TruthBullets/" + image_filename

	if FileAccess.file_exists(image_path):
		return image_path

	return ""

## Clean up extracted files
func cleanup_extracted_files():
	print("Cleaning up extracted files...")

	var dir = DirAccess.open("user://trials/")
	if dir and DirAccess.dir_exists_absolute(extract_dir):
		# Recursively remove extracted directory
		_remove_directory_recursive(extract_dir)

	current_trial = {}
	current_trial_path = ""

## Wipe the extract dir so a fresh load can't pick up stale files from the
## previous trial. Safe to call when the dir doesn't exist yet.
func _clear_extract_dir() -> void:
	if DirAccess.dir_exists_absolute(extract_dir):
		_remove_directory_recursive(extract_dir)
	DirAccess.make_dir_recursive_absolute(extract_dir)

## Recursively remove directory and all contents
func _remove_directory_recursive(path: String):
	var dir = DirAccess.open(path)
	if dir:
		dir.list_dir_begin()
		var file_name = dir.get_next()

		while file_name != "":
			var file_path = path + "/" + file_name

			if dir.current_is_dir():
				_remove_directory_recursive(file_path)
			else:
				dir.remove(file_name)

			file_name = dir.get_next()

		dir.list_dir_end()
		dir.remove(path)

## Get current trial data
func get_trial_data() -> Dictionary:
	return current_trial

## Check if a trial is currently loaded
func is_trial_loaded() -> bool:
	return not current_trial.is_empty()

## Get trial name
func get_trial_name() -> String:
	return current_trial.get("trialName", "")

## Get script lines
func get_script_lines() -> Array:
	var script = current_trial.get("script", {})
	return script.get("lines", [])

## Get minigames
func get_minigames() -> Array:
	return current_trial.get("minigames", [])

## Get truth bullets
func get_truth_bullets() -> Array:
	return current_trial.get("truthBullets", [])

## Get character IDs
func get_character_ids() -> Array:
	return current_trial.get("characters", [])
