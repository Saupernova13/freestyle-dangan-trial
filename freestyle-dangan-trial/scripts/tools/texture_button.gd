extends TextureButton

var _picker: Node

func _on_pressed() -> void:
	_picker = preload("res://scripts/tools/TrialFilePicker.gd").new()
	add_child(_picker)
	_picker.file_selected.connect(_on_trial_file_selected)
	_picker.cancelled.connect(_on_picker_cancelled)
	_picker.open_picker()

func _on_trial_file_selected(path: String):
	# Store the selected path for TrialRoomManager to read
	TrialLoader.set_meta("pending_trial_path", path)
	_cleanup_picker()
	get_tree().change_scene_to_file("res://scenes/thh_trial_room_1.tscn")

func _on_picker_cancelled():
	_cleanup_picker()

func _cleanup_picker():
	if _picker:
		_picker.queue_free()
		_picker = null
