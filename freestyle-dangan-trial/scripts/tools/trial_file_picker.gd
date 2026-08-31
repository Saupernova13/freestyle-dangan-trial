extends Node
## File picker for .drtrial files: Godot's FileDialog on desktop, the native
## SAF picker on Android. A custom file-list browser is the last resort, used
## only when the native dialog is unavailable.

signal file_selected(path: String)
signal cancelled
signal load_failed(message: String)

const IMPORTED_TRIAL_PATH := "user://imported_trial.drtrial"

var _file_dialog: FileDialog
var _is_mobile: bool = false
## Top-level scan roots that could not be opened, so an unreadable folder is
## not reported to the user as an empty one.
var _scan_errors: Array[String] = []

func _ready():
	_is_mobile = OS.has_feature("mobile")

func open_picker():
	if _is_mobile:
		# Some Android versions and providers still need this alongside SAF.
		# Asking every open is safe: Android re-prompts only if undecided.
		_request_storage_permissions()
		_open_mobile_picker()
	else:
		_open_desktop_picker()

func _request_storage_permissions() -> void:
	# Returns immediately; the result arrives via OS.request_permissions_result.
	# No await needed: the picker can't appear until the prompt is dismissed.
	if OS.has_method("request_permissions"):
		var granted = OS.request_permissions()
		Log.info("TrialFilePicker", "Requested permissions, granted=%s" % str(granted))

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
	# On Android this routes through SAF, which grants access to the picked file
	# itself. open_picker() still asks for storage permission first: some
	# versions and providers need it to read what SAF hands back.
	if DisplayServer.has_feature(DisplayServer.FEATURE_NATIVE_DIALOG_FILE):
		var filters = PackedStringArray(["*.drtrial,*.json ; Trial Files"])
		var err = DisplayServer.file_dialog_show(
			"Open Trial File",
			"",
			"",
			false,
			DisplayServer.FILE_DIALOG_MODE_OPEN_FILE,
			filters,
			_on_native_file_selected
		)
		if err != OK:
			push_error("DisplayServer.file_dialog_show failed: %d" % err)
			load_failed.emit("Could not open the file picker (error %d)." % err)
			cancelled.emit()
		return

	# Scoped storage finds nothing on Android 11+; kept for older devices.
	_open_legacy_directory_scan()

## Set by _copy_to_user_dir(): the attempted path plus the Godot error code.
var _last_copy_error_detail: String = ""

func _on_native_file_selected(status: bool, selected_paths: PackedStringArray, _filter_index: int):
	if not status or selected_paths.is_empty():
		cancelled.emit()
		return

	var picked = selected_paths[0]
	Log.info("TrialFilePicker", "SAF returned path: %s" % picked)
	var local_copy = _copy_to_user_dir(picked)
	if local_copy.is_empty():
		var msg = "Could not read selected file. %s" % _last_copy_error_detail
		load_failed.emit(msg.strip_edges())
		cancelled.emit()
		return
	file_selected.emit(local_copy)

## A content:// URI's permission expires, so the pick is copied into
## user://imported_trial.drtrial. Returns the writable path, or "" on failure
## with _last_copy_error_detail set.
func _copy_to_user_dir(source_path: String) -> String:
	_last_copy_error_detail = ""

	# get_file_as_bytes() handles Android content URIs. It returns empty on some
	# older drivers and providers, so the fallback reopens the file and reads it
	# through FileAccess instead.
	var data := FileAccess.get_file_as_bytes(source_path)
	var err := FileAccess.get_open_error()
	if data.is_empty():
		Log.warn("TrialFilePicker", "get_file_as_bytes returned empty (err %d), trying FileAccess.open" % err)
		var src := FileAccess.open(source_path, FileAccess.READ)
		var open_err := FileAccess.get_open_error()
		if src == null:
			_last_copy_error_detail = "open err %d on %s" % [open_err, source_path]
			push_error("Could not open source file: %s (err %d)" % [source_path, open_err])
			return ""
		data = src.get_buffer(src.get_length())
		src.close()

	if data.is_empty():
		_last_copy_error_detail = "0-byte read from %s" % source_path
		push_error("Source file read returned 0 bytes: %s" % source_path)
		return ""

	var dst := FileAccess.open(IMPORTED_TRIAL_PATH, FileAccess.WRITE)
	if dst == null:
		var write_err := FileAccess.get_open_error()
		_last_copy_error_detail = "write err %d at %s" % [write_err, IMPORTED_TRIAL_PATH]
		push_error("Could not write to %s (err %d)" % [IMPORTED_TRIAL_PATH, write_err])
		return ""

	dst.store_buffer(data)
	dst.close()

	# A write can report success and still leave the file empty.
	if not FileAccess.file_exists(IMPORTED_TRIAL_PATH):
		_last_copy_error_detail = "imported file missing after copy"
		push_error("Imported file missing after copy: %s" % IMPORTED_TRIAL_PATH)
		return ""
	var verify := FileAccess.open(IMPORTED_TRIAL_PATH, FileAccess.READ)
	if verify == null:
		_last_copy_error_detail = "imported file not readable: err %d" % FileAccess.get_open_error()
		push_error("Imported file not readable after copy: %s" % IMPORTED_TRIAL_PATH)
		return ""
	var size := verify.get_length()
	verify.close()
	if size == 0:
		_last_copy_error_detail = "imported file is 0 bytes"
		push_error("Imported file is 0 bytes: %s" % IMPORTED_TRIAL_PATH)
		return ""

	Log.info("TrialFilePicker", "Copied %d bytes from %s to %s" % [size, source_path, IMPORTED_TRIAL_PATH])
	return IMPORTED_TRIAL_PATH

func _open_legacy_directory_scan():
	var scan_dirs = [
		OS.get_system_dir(OS.SYSTEM_DIR_DOWNLOADS),
		OS.get_system_dir(OS.SYSTEM_DIR_DOCUMENTS),
		OS.get_system_dir(OS.SYSTEM_DIR_DESKTOP),
	]

	var found_files: Array = []
	_scan_errors.clear()
	for dir_path in scan_dirs:
		if dir_path.is_empty():
			continue
		_scan_directory(dir_path, found_files)

	if found_files.is_empty():
		if not _scan_errors.is_empty():
			# Scoped storage denies these reads outright on Android 11+, and the
			# recovery is to grant the permission - which "nothing found" hides.
			push_warning("Could not read scan directories: %s" % ", ".join(_scan_errors))
			load_failed.emit(
				"Could not read Downloads or Documents - storage permission may be denied."
			)
		else:
			push_warning("No .drtrial files found in Downloads/Documents and native picker unavailable")
			load_failed.emit("No .drtrial files found in Downloads or Documents.")
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
		push_warning("Cannot scan %s: %s" % [path, error_string(DirAccess.get_open_error())])
		# Only a scan root counts: an unreadable subfolder deep inside Downloads
		# is ordinary and must not turn a genuine empty result into a warning.
		if depth == 0:
			_scan_errors.append(path)
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
	var list: TrialFileList = ResourceRegistry.instantiate("trial_file_list")
	add_child(list)
	list.file_chosen.connect(func(path: String):
		list.queue_free()
		file_selected.emit(path)
	)
	list.cancelled.connect(func():
		list.queue_free()
		cancelled.emit()
	)
	list.populate(files)

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
