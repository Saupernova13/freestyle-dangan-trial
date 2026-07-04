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
	current_trial = {}
	current_trial_path = ""

	if not FileAccess.file_exists(file_path):
		last_load_error = "Trial file not found at %s" % file_path
		push_error(last_load_error)
		return false

	if not _extract_archive(file_path):
		last_load_error = "Trial archive could not be extracted. The file may be corrupt, unreadable, or you may lack storage permissions on this device."
		push_error(last_load_error)
		return false

	var trial_data = parse_trial_data(extract_dir + "trial.json")
	if trial_data.is_empty():
		last_load_error = "trial.json missing or invalid in the selected file."
		push_error(last_load_error)
		return false

	current_trial = trial_data
	current_trial_path = file_path
	print("Trial loaded: ", trial_data.get("trialName", "Unnamed"))
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

## Wipe the extract dir and unpack the .drtrial ZIP into it. The wipe matters:
## stale files from a previous trial could otherwise be resolved by name
## (Android repro: trial B picked up assets left behind by trial A).
## `progress` (optional) is called with (files_done, files_total) per entry.
func _extract_archive(zip_path: String, progress: Callable = Callable()) -> bool:
	var reader = ZIPReader.new()
	var err = reader.open(zip_path)
	if err != OK:
		push_error("Failed to open ZIP file: " + error_string(err))
		return false

	_clear_extract_dir()

	var entries: Array = Array(reader.get_files()).filter(
		func(f: String) -> bool: return not f.ends_with("/"))

	for i in range(entries.size()):
		var entry: String = entries[i]
		var data: PackedByteArray = reader.read_file(entry)
		if data.size() == 0:
			push_warning("Empty or unreadable file: " + entry)
			continue

		var output_path = extract_dir + entry
		DirAccess.make_dir_recursive_absolute(output_path.get_base_dir())
		var file = FileAccess.open(output_path, FileAccess.WRITE)
		if file:
			file.store_buffer(data)
			file.close()
		else:
			var write_err = FileAccess.get_open_error()
			push_error("Failed to write file %s (err %d: %s)" % [output_path, write_err, error_string(write_err)])

		if progress.is_valid():
			progress.call(i + 1, entries.size())

	reader.close()
	return true

## Parse trial.json file
func parse_trial_data(json_path: String) -> Dictionary:
	print("Parsing trial data: ", json_path)

	if not FileAccess.file_exists(json_path):
		push_error("trial.json not found at: " + json_path)
		return {}

	var json_text = FileAccess.get_file_as_string(json_path)
	if json_text.is_empty():
		push_error("trial.json is empty")
		return {}

	var json = JSON.new()
	var parse_result = json.parse(json_text)

	if parse_result != OK:
		push_error("Failed to parse trial.json: " + json.get_error_message())
		return {}

	var data = json.data

	if not data.has("trialName"):
		push_warning("trial.json missing trialName field")

	return data

## Load character data by ID
## Returns character dictionary or empty dict if not found
func load_character(character_id: String) -> Dictionary:
	if character_id.is_empty() or character_id == "null":
		return {}

	if _char_data_cache.has(character_id):
		return _char_data_cache[character_id]

	var characters_dir = extract_dir + "Characters/"

	if not DirAccess.dir_exists_absolute(characters_dir):
		push_warning("Characters directory not found")
		return {}

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
						char_data["folder_path"] = characters_dir + folder_name
						dir.list_dir_end()
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

	# Primary: flat Audio/ directory (used by script lines)
	var flat_path = extract_dir + "Audio/" + audio_filename
	if FileAccess.file_exists(flat_path):
		return flat_path

	# Fallback: scan Audio/Minigames/<gameId>/ subdirectories for nonstop debate voices
	var minigames_dir = extract_dir + "Audio/Minigames/"
	var dir = DirAccess.open(minigames_dir)
	if dir:
		dir.list_dir_begin()
		var subdir = dir.get_next()
		while not subdir.is_empty():
			if dir.current_is_dir():
				var candidate = minigames_dir + subdir + "/" + audio_filename
				if FileAccess.file_exists(candidate):
					dir.list_dir_end()
					return candidate
			subdir = dir.get_next()
		dir.list_dir_end()

	return ""

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

func _load_in_thread(file_path: String) -> void:
	if not FileAccess.file_exists(file_path):
		call_deferred("_finish_with_error",
			"Trial file not found: %s" % file_path)
		return

	# --- Phase 1: Extract archive (0 → 60%) ---
	call_deferred("_report_progress", 0.0, "Extracting archive...")

	var extracted := _extract_archive(file_path, func(done: int, total: int) -> void:
		var frac := float(done) / float(max(total, 1)) * 0.6
		call_deferred("_report_progress", frac,
			"Extracting... %d / %d" % [done, total])
	)
	if not extracted:
		call_deferred("_finish_with_error",
			"Could not open trial archive. File may be corrupt.")
		return

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
