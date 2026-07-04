class_name TrialArchive
extends RefCounted
## Extracts .drtrial (ZIP) archives into a destination directory.

## Wipe `dest_dir` and unpack the archive into it. The wipe matters: stale
## files from a previous trial could otherwise be resolved by name (Android
## repro: trial B picked up assets left behind by trial A).
## `progress` (optional) is called with (files_done, files_total) per entry.
static func extract(zip_path: String, dest_dir: String, progress: Callable = Callable()) -> bool:
	var reader = ZIPReader.new()
	var err = reader.open(zip_path)
	if err != OK:
		push_error("Failed to open ZIP file: " + error_string(err))
		return false

	_clear_dir(dest_dir)

	var entries: Array = Array(reader.get_files()).filter(
		func(f: String) -> bool: return not f.ends_with("/"))

	for i in range(entries.size()):
		var entry: String = entries[i]
		var data: PackedByteArray = reader.read_file(entry)
		if data.size() == 0:
			push_warning("Empty or unreadable file: " + entry)
			continue

		var output_path = dest_dir + entry
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

static func _clear_dir(path: String) -> void:
	if DirAccess.dir_exists_absolute(path):
		_remove_recursive(path)
	DirAccess.make_dir_recursive_absolute(path)

static func _remove_recursive(path: String) -> void:
	var dir = DirAccess.open(path)
	if dir:
		dir.list_dir_begin()
		var file_name = dir.get_next()
		while file_name != "":
			var file_path = path + "/" + file_name
			if dir.current_is_dir():
				_remove_recursive(file_path)
			else:
				dir.remove(file_name)
			file_name = dir.get_next()
		dir.list_dir_end()
		dir.remove(path)
