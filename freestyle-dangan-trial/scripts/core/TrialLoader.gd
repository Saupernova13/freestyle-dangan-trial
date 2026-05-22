extends Node
## Trial Loader - Handles loading and extracting .drtrial files
##
## This autoload singleton manages:
## - Extracting .drtrial (ZIP) files to temporary directory
## - Parsing trial.json and loading trial data
## - Loading character data and assets
## - Providing access to loaded trial data for gameplay

# Async loading signals
signal loading_progress(fraction: float, status_text: String)
signal loading_complete()
signal loading_failed(error: String)

# Extracted trial data
var current_trial: Dictionary = {}
var current_trial_path: String = ""
var extract_dir: String = "user://trials/extracted/"

## Populated by load_trial() on failure so the caller (start menu, trial room)
## can surface a useful message to the user. Empty when the last load succeeded.
var last_load_error: String = ""

# Async loading state
var loaded_async: bool = false

# Caches populated by load_trial_async
var _char_data_cache: Dictionary = {}    # char_id -> char dict (with folder_path)
var _char_sprite_cache: Dictionary = {}  # "char_id:sprite_idx" -> ImageTexture
var _pending_images: Dictionary = {}     # temp during thread: "char_id:1" -> Image

var _thread: Thread = null

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
		last_load_error = "Trial archive could not be extracted. The file may be corrupt, unreadable, or you may lack storage permissions on this device."
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

## Async version of load_trial(). Runs extraction, JSON parse, and sprite
## Image loading in a background thread. ImageTexture creation and signal
## emission happen on the main thread via call_deferred.
func load_trial_async(file_path: String) -> void:
	loaded_async = false
	_char_data_cache.clear()
	_char_sprite_cache.clear()
	_pending_images.clear()
	last_load_error = ""
	current_trial = {}
	current_trial_path = ""

	_thread = Thread.new()
	_thread.start(_load_in_thread.bind(file_path))

## Return cached ImageTexture for a character sprite, or null if not cached.
func get_cached_texture(character_id: String, sprite_index: int) -> ImageTexture:
	return _char_sprite_cache.get("%s:%d" % [character_id, sprite_index], null)

## Cache an ImageTexture for a character sprite (called by TrialRoomManager
## after a runtime load so subsequent uses of the same sprite are instant).
func cache_texture(character_id: String, sprite_index: int, texture: ImageTexture) -> void:
	_char_sprite_cache["%s:%d" % [character_id, sprite_index]] = texture

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
	var mkdir_err = DirAccess.make_dir_recursive_absolute(extract_to)
	if mkdir_err != OK:
		push_error("Failed to create extraction directory %s (err %d: %s)" % [extract_to, mkdir_err, error_string(mkdir_err)])
		return false

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
			var write_err = FileAccess.get_open_error()
			push_error("Failed to write file %s (err %d: %s)" % [output_path, write_err, error_string(write_err)])

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

	# Check cache first
	if _char_data_cache.has(character_id):
		return _char_data_cache[character_id]

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
						# Cache before returning
						_char_data_cache[character_id] = char_data
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

# ============================================================================
# PRIVATE THREAD METHODS (for async loading)
# ============================================================================

func _load_in_thread(file_path: String) -> void:
	if not FileAccess.file_exists(file_path):
		call_deferred("_finish_with_error",
			"Trial file not found: %s" % file_path)
		return

	# --- Phase 1: Extract archive (0 → 60%) ---
	call_deferred("_report_progress", 0.0, "Extracting archive...")
	_clear_extract_dir()

	var reader := ZIPReader.new()
	if reader.open(file_path) != OK:
		call_deferred("_finish_with_error",
			"Could not open trial archive. File may be corrupt.")
		return

	var all_files: Array = reader.get_files()
	var file_entries: Array = all_files.filter(
		func(f: String) -> bool: return not f.ends_with("/"))
	var total_files: int = max(file_entries.size(), 1)

	DirAccess.make_dir_recursive_absolute(extract_dir)

	for i in range(file_entries.size()):
		var entry: String = file_entries[i]
		var data: PackedByteArray = reader.read_file(entry)
		if data.size() > 0:
			var out_path: String = extract_dir + entry
			DirAccess.make_dir_recursive_absolute(out_path.get_base_dir())
			var f := FileAccess.open(out_path, FileAccess.WRITE)
			if f:
				f.store_buffer(data)
				f.close()
		var frac := float(i + 1) / float(total_files) * 0.6
		call_deferred("_report_progress", frac,
			"Extracting... %d / %d" % [i + 1, file_entries.size()])

	reader.close()

	# --- Phase 2: Parse JSON (60 → 65%) ---
	call_deferred("_report_progress", 0.62, "Reading trial data...")
	var trial_data := parse_trial_data(extract_dir + "trial.json")
	if trial_data.is_empty():
		call_deferred("_finish_with_error",
			"trial.json missing or invalid in the selected file.")
		return

	current_trial = trial_data
	current_trial_path = file_path

	# --- Phase 3: Load character Images (65 → 95%) ---
	var character_ids: Array = trial_data.get("characters", [])
	var char_count: int = max(character_ids.size(), 1)

	for i in range(character_ids.size()):
		var char_id: String = character_ids[i] if character_ids[i] is String else ""
		if char_id.is_empty() or char_id == "null":
			continue

		# load_character() now populates _char_data_cache automatically
		var char_data := load_character(char_id)
		if char_data.is_empty():
			continue

		var sprite_path: String = (
			char_data.get("folder_path", "") + "/sprite_01.png")
		if FileAccess.file_exists(sprite_path):
			var img := Image.load_from_file(sprite_path)
			if img:
				_pending_images["%s:1" % char_id] = img

		var frac := 0.65 + float(i + 1) / float(char_count) * 0.30
		call_deferred("_report_progress", frac,
			"Loading characters... %d / %d" % [i + 1, character_ids.size()])

	# Phase 4 (texture creation + completion) must run on main thread
	call_deferred("_finalize_on_main_thread")

func _report_progress(fraction: float, status_text: String) -> void:
	loading_progress.emit(fraction, status_text)

func _finalize_on_main_thread() -> void:
	# ImageTexture.create_from_image() requires the main thread (GPU alloc)
	for key in _pending_images:
		var img: Image = _pending_images[key]
		_char_sprite_cache[key] = ImageTexture.create_from_image(img)
	_pending_images.clear()

	_thread.wait_to_finish()
	_thread = null
	loaded_async = true
	loading_progress.emit(1.0, "Ready!")
	loading_complete.emit()

func _finish_with_error(error_msg: String) -> void:
	if _thread:
		_thread.wait_to_finish()
		_thread = null
	last_load_error = error_msg
	loading_failed.emit(error_msg)
