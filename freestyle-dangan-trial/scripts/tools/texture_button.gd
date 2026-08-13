extends TextureButton

var _picker: Node

func _on_pressed() -> void:
	_picker = preload("res://scripts/tools/trial_file_picker.gd").new()
	add_child(_picker)
	_picker.file_selected.connect(_on_trial_file_selected)
	_picker.cancelled.connect(_on_picker_cancelled)
	_picker.load_failed.connect(_on_picker_load_failed)
	_picker.open_picker()

func _on_trial_file_selected(path: String):
	# Validate before leaving the start menu, which can show a toast; a failure
	# past this point just yields a blank trial room.
	if not _is_valid_trial(path):
		_on_picker_load_failed("Selected file isn't a valid .drtrial archive.")
		return

	TrialLoader.set_meta("pending_trial_path", path)
	_cleanup_picker()
	get_tree().change_scene_to_file("res://scenes/ui/loading_screen.tscn")

func _is_valid_trial(path: String) -> bool:
	if not FileAccess.file_exists(path):
		push_error("Trial file vanished before validation: %s" % path)
		return false
	# Cheapest check available: ZIPReader opens it and trial.json is present.
	var reader := ZIPReader.new()
	var err := reader.open(path)
	if err != OK:
		push_error("ZIPReader.open failed for %s: %s" % [path, error_string(err)])
		return false
	var has_trial_json := false
	for f in reader.get_files():
		if f.ends_with("trial.json"):
			has_trial_json = true
			break
	reader.close()
	if not has_trial_json:
		push_error("Archive %s does not contain trial.json" % path)
	return has_trial_json

func _on_picker_cancelled():
	_cleanup_picker()

func _on_picker_load_failed(message: String):
	MobileToast.show_message(get_tree().root, message, true)
	_cleanup_picker()

func _cleanup_picker():
	if _picker:
		_picker.queue_free()
		_picker = null
