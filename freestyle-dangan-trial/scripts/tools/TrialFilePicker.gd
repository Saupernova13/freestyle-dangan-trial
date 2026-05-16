extends Node

signal file_selected(path: String)
signal cancelled

var _file_dialog: FileDialog
var _is_mobile: bool = false

func _ready():
	_is_mobile = OS.has_feature("mobile")

func open_picker():
	if _is_mobile:
		_open_mobile_picker()
	else:
		_open_desktop_picker()

func _open_desktop_picker():
	_file_dialog = FileDialog.new()
	_file_dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	_file_dialog.access = FileDialog.ACCESS_FILESYSTEM
	_file_dialog.filters = PackedStringArray(["*.drtrial ; Danganronpa Trial Files"])
	_file_dialog.title = "Open Trial File"
	_file_dialog.size = Vector2(800, 500)
	_file_dialog.initial_position = Window.WINDOW_INITIAL_POSITION_CENTER_MAIN_WINDOW_SCREEN

	var desktop_path = OS.get_system_dir(OS.SYSTEM_DIR_DESKTOP)
	if not desktop_path.is_empty():
		_file_dialog.current_dir = desktop_path

	_file_dialog.file_selected.connect(_on_file_chosen)
	_file_dialog.canceled.connect(_on_cancelled)

	get_tree().root.add_child(_file_dialog)
	_file_dialog.popup_centered()

func _open_mobile_picker():
	var scan_dirs = [
		OS.get_system_dir(OS.SYSTEM_DIR_DOWNLOADS),
		OS.get_system_dir(OS.SYSTEM_DIR_DOCUMENTS),
		OS.get_system_dir(OS.SYSTEM_DIR_DESKTOP),
	]

	var found_files: Array = []
	for dir_path in scan_dirs:
		if dir_path.is_empty():
			continue
		_scan_directory(dir_path, found_files)

	if found_files.is_empty():
		push_warning("No .drtrial files found in Downloads/Documents")
		cancelled.emit()
		return

	if found_files.size() == 1:
		file_selected.emit(found_files[0])
		return

	_show_mobile_file_list(found_files)

func _scan_directory(path: String, results: Array, depth: int = 0):
	if depth > 2:
		return
	var dir = DirAccess.open(path)
	if not dir:
		return
	dir.list_dir_begin()
	var entry_name = dir.get_next()
	while entry_name != "":
		var full_path = path + "/" + entry_name
		if dir.current_is_dir() and not entry_name.begins_with("."):
			_scan_directory(full_path, results, depth + 1)
		elif entry_name.ends_with(".drtrial"):
			results.append(full_path)
		entry_name = dir.get_next()
	dir.list_dir_end()

func _show_mobile_file_list(files: Array):
	var overlay = CanvasLayer.new()
	overlay.layer = 30
	add_child(overlay)

	var bg = ColorRect.new()
	bg.color = Color(0, 0, 0, 0.8)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(bg)

	var panel = VBoxContainer.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	panel.custom_minimum_size = Vector2(500, 400)
	panel.add_theme_constant_override("separation", 8)
	overlay.add_child(panel)

	var title = Label.new()
	title.text = "Select Trial File"
	title.add_theme_font_size_override("font_size", 24)
	title.add_theme_color_override("font_color", Color.WHITE)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	panel.add_child(title)

	var scroll = ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(480, 300)
	panel.add_child(scroll)

	var list = VBoxContainer.new()
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(list)

	for file_path in files:
		var btn = Button.new()
		btn.text = file_path.get_file()
		btn.custom_minimum_size.y = 50
		btn.add_theme_font_size_override("font_size", 16)
		btn.pressed.connect(func():
			overlay.queue_free()
			file_selected.emit(file_path)
		)
		list.add_child(btn)

	var cancel_btn = Button.new()
	cancel_btn.text = "Cancel"
	cancel_btn.custom_minimum_size.y = 40
	cancel_btn.pressed.connect(func():
		overlay.queue_free()
		cancelled.emit()
	)
	panel.add_child(cancel_btn)

func _on_file_chosen(path: String):
	if _file_dialog:
		_file_dialog.queue_free()
		_file_dialog = null
	file_selected.emit(path)

func _on_cancelled():
	if _file_dialog:
		_file_dialog.queue_free()
		_file_dialog = null
	cancelled.emit()
