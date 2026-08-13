extends Node
## Autoload facade for .drtrial loading: owns the manifest, the load signals
## and the background thread. Extraction goes to TrialArchive, character and
## sprite access to CharacterLibrary.

signal loading_progress(fraction: float, status_text: String)
signal loading_complete()
signal loading_failed(error: String)

const EXTRACT_DIR := "user://trials/extracted/"

var current_trial_path: String = ""

## Typed view of the trial (scripts/core/trial/model/). Null until one loads.
var manifest: TrialManifest = null

## Set by load_trial() on failure, empty on success, so callers can report it.
var last_load_error: String = ""

## Set when trial.json exists but fails validation, so both load paths can
## report the specific problem rather than a generic one.
var last_parse_error: String = ""

## The trial room reads this to skip its synchronous fallback load.
var loaded_async: bool = false

var characters := CharacterLibrary.new(EXTRACT_DIR + "Characters/")

var _pending_images: Dictionary = {}  # char_id -> Image, filled by the load thread
var _thread: Thread = null

## Sets last_load_error on failure.
func load_trial(file_path: String) -> bool:
	Log.info("TrialLoader", "Loading trial from: %s" % file_path)
	last_load_error = ""
	_reset_trial_state()

	if not FileAccess.file_exists(file_path):
		last_load_error = "Trial file not found at %s" % file_path
		push_error(last_load_error)
		return false

	if not TrialArchive.extract(file_path, EXTRACT_DIR):
		last_load_error = (
			"Trial archive could not be extracted. The file may be corrupt, "
			+ "unreadable, or you may lack storage permissions on this device."
		)
		push_error(last_load_error)
		return false

	var trial_data = _parse_manifest()
	if trial_data.is_empty():
		last_load_error = (
			last_parse_error
			if not last_parse_error.is_empty()
			else "trial.json missing or invalid in the selected file."
		)
		push_error(last_load_error)
		return false

	manifest = TrialManifest.from_dict(trial_data)
	current_trial_path = file_path
	Log.info("TrialLoader", "Trial loaded: %s" % manifest.trial_name)
	return true

## Extraction, JSON parse and sprite Image loading run on a worker thread;
## ImageTexture creation and signal emission are deferred to the main thread.
func load_trial_async(file_path: String) -> void:
	loaded_async = false
	last_load_error = ""
	_reset_trial_state()

	_thread = Thread.new()
	_thread.start(_load_in_thread.bind(file_path))

func load_character(character_id: String) -> Dictionary:
	return characters.get_character(character_id)

func get_sprite_texture(character_id: String, sprite_index: int) -> ImageTexture:
	return characters.get_texture(character_id, sprite_index)

## Returns "" when the file is absent.
func get_audio_path(audio_filename: String) -> String:
	if audio_filename.is_empty():
		return ""

	# Script lines keep their audio flat in Audio/.
	var flat_path = EXTRACT_DIR + "Audio/" + audio_filename
	if FileAccess.file_exists(flat_path):
		return flat_path

	# Minigame voices live under Audio/Minigames/<gameId>/ instead.
	var minigames_dir = EXTRACT_DIR + "Audio/Minigames/"
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

func get_script_lines() -> Array[ScriptLine]:
	if manifest:
		return manifest.script_lines
	var empty: Array[ScriptLine] = []
	return empty

func get_minigames() -> Array[MinigameData]:
	if manifest:
		return manifest.minigames
	var empty: Array[MinigameData] = []
	return empty

func get_truth_bullets() -> Array:
	return manifest.truth_bullets if manifest else []

func get_character_ids() -> Array:
	return manifest.character_ids if manifest else []

func _reset_trial_state() -> void:
	manifest = null
	current_trial_path = ""
	characters.clear()
	_pending_images.clear()

func _parse_manifest() -> Dictionary:
	last_parse_error = ""
	var json_path := EXTRACT_DIR + "trial.json"
	if not FileAccess.file_exists(json_path):
		push_error("trial.json not found at: " + json_path)
		return {}

	var json_text = FileAccess.get_file_as_string(json_path)
	if json_text.is_empty():
		push_error("trial.json is empty")
		return {}

	var json = JSON.new()
	if json.parse(json_text) != OK:
		last_parse_error = "trial.json is not valid JSON: " + json.get_error_message()
		push_error(last_parse_error)
		return {}

	var data = json.data
	if not data is Dictionary:
		last_parse_error = "trial.json root is not an object."
		push_error(last_parse_error)
		return {}

	# Checked against schema/trial.schema.json; see TrialValidator.
	var version_issue := TrialValidator.check_version(data)
	if not version_issue.is_empty():
		last_parse_error = version_issue
		push_error(last_parse_error)
		return {}
	var errors := TrialValidator.validate(data)
	if not errors.is_empty():
		last_parse_error = "trial.json is invalid: " + "; ".join(errors.slice(0, 3))
		push_error(last_parse_error)
		return {}
	return data

func _load_in_thread(file_path: String) -> void:
	if not FileAccess.file_exists(file_path):
		call_deferred("_finish_with_error",
			"Trial file not found: %s" % file_path)
		return

	# --- Phase 1: Extract archive (0 -> 60%) ---
	call_deferred("_report_progress", 0.0, "Extracting archive...")

	var extracted := TrialArchive.extract(file_path, EXTRACT_DIR,
		func(done: int, total: int) -> void:
			var frac := float(done) / float(max(total, 1)) * 0.6
			call_deferred("_report_progress", frac,
				"Extracting... %d / %d" % [done, total])
	)
	if not extracted:
		call_deferred("_finish_with_error",
			"Could not open trial archive. File may be corrupt.")
		return

	# --- Phase 2: Parse JSON (60 -> 65%) ---
	call_deferred("_report_progress", 0.62, "Reading trial data...")
	var trial_data := _parse_manifest()
	if trial_data.is_empty():
		call_deferred("_finish_with_error",
			last_parse_error
			if not last_parse_error.is_empty()
			else "trial.json missing or invalid in the selected file.")
		return

	manifest = TrialManifest.from_dict(trial_data)
	current_trial_path = file_path

	# --- Phase 3: Load character Images (65 -> 95%) ---
	var character_ids: Array = trial_data.get("characters", [])
	var char_count: int = max(character_ids.size(), 1)

	for i in range(character_ids.size()):
		var char_id: String = character_ids[i] if character_ids[i] is String else ""
		if char_id.is_empty() or char_id == "null":
			continue

		var img := characters.load_image(char_id, 1)
		if img:
			_pending_images[char_id] = img

		var frac := 0.65 + float(i + 1) / float(char_count) * 0.30
		call_deferred("_report_progress", frac,
			"Loading characters... %d / %d" % [i + 1, character_ids.size()])

	# --- Phase 4: Textures + completion (main thread only) ---
	call_deferred("_finalize_on_main_thread")

func _report_progress(fraction: float, status_text: String) -> void:
	loading_progress.emit(fraction, status_text)

func _finalize_on_main_thread() -> void:
	# create_from_image() allocates on the GPU, so it must be main-thread.
	for char_id in _pending_images:
		var img: Image = _pending_images[char_id]
		characters.store_texture(char_id, 1, ImageTexture.create_from_image(img))
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
