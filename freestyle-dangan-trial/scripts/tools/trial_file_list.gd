class_name TrialFileList
extends CanvasLayer
## Fallback trial chooser, shown only on mobile when the native file dialog is
## unavailable. Layout is scene-owned; populate() adds one row per file.

signal file_chosen(path: String)
signal cancelled

@onready var _list: VBoxContainer = %List
@onready var _cancel: Button = %CancelButton

func _ready():
	_cancel.pressed.connect(func(): cancelled.emit())

func populate(files: Array) -> void:
	for file_path in files:
		var row: Button = ResourceRegistry.instantiate("trial_file_row")
		row.text = file_path.get_file()
		row.pressed.connect(func(): file_chosen.emit(file_path))
		_list.add_child(row)
