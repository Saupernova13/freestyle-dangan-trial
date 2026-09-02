class_name TrialArchive
extends RefCounted
## Extracts .drtrial (ZIP) archives into a destination directory.

## "" on success, otherwise why the extraction cannot be trusted. A bool could
## not distinguish "nothing was written" from "most of it was", and the caller
## needs to say which - a half-extracted trial plays with characters missing.
##
## Wipes `dest_dir`, which matters: leftovers resolve by name, and on Android
## trial B was seen picking up trial A's assets. The wipe happens only after
## the archive is known to be worth extracting.
## `progress` is called with (files_done, files_total) per entry.
static func extract(zip_path: String, dest_dir: String, progress: Callable = Callable()) -> String:
	var reader = ZIPReader.new()
	var err = reader.open(zip_path)
	if err != OK:
		push_error("Failed to open ZIP file: " + error_string(err))
		return "The trial file could not be opened (%s)." % error_string(err)

	var entries: Array = Array(reader.get_files()).filter(
		func(f: String) -> bool: return not f.ends_with("/"))

	# Before _clear_dir: a tampered archive must be reported, never partially
	# applied, and must not take the installed trial down with it.
	for entry in entries:
		var reason: String = _rejection_reason(entry, dest_dir)
		if not reason.is_empty():
			push_error("Refusing to extract %s: %s in entry '%s'" % [zip_path, reason, entry])
			reader.close()
			return "This trial file contains an unsafe entry name (%s)." % reason

	# Before the wipe, for the same reason as the entry check: a valid but
	# empty archive would otherwise destroy the previously extracted trial and
	# still report success.
	if entries.is_empty():
		reader.close()
		return "This trial file is empty."

	_clear_dir(dest_dir)

	var failed: Array[String] = []

	for i in range(entries.size()):
		var entry: String = entries[i]
		var data: PackedByteArray = reader.read_file(entry)
		if data.size() == 0:
			push_warning("Empty or unreadable file: " + entry)
			continue

		var output_path = dest_dir + entry
		var dir_err := DirAccess.make_dir_recursive_absolute(output_path.get_base_dir())
		if dir_err != OK:
			push_error("Failed to create %s: %s" % [output_path.get_base_dir(), error_string(dir_err)])
			failed.append(entry)
			continue
		var file = FileAccess.open(output_path, FileAccess.WRITE)
		if file:
			file.store_buffer(data)
			file.close()
		else:
			var write_err = FileAccess.get_open_error()
			push_error("Failed to write file %s (err %d: %s)" % [output_path, write_err, error_string(write_err)])
			# Counted, not just logged. A partial extraction used to report
			# success, so the trial played with characters silently missing.
			failed.append(entry)

		if progress.is_valid():
			progress.call(i + 1, entries.size())

	reader.close()
	if not failed.is_empty():
		return (
			"Extraction incomplete: %d of %d files could not be written. "
			% [failed.size(), entries.size()]
			+ "You may be out of storage space, or lack permission to write here."
		)
	return ""

## Empty when the entry is safe to write, otherwise why it is not. A .drtrial
## is a distribution format, so archives arrive from third parties by design and
## every entry name is untrusted input: without this an entry can traverse out
## of dest_dir and Godot passes the segments through to the OS.
static func _rejection_reason(entry: String, dest_dir: String) -> String:
	if entry.is_empty():
		return "empty name"
	# ZIP names are specified to use "/" only, but the Windows API also accepts
	# "\\", so allowing it would leave traversal open through the back door.
	if entry.contains("\\"):
		return "backslash"
	# Covers a drive letter and a "res://"-style prefix as well as a leading "/".
	if entry.is_absolute_path() or entry.contains(":"):
		return "absolute path"
	if ".." in entry.split("/"):
		return "'..' path segment"
	# Belt and braces: whatever the segment checks missed, the joined path must
	# still land inside dest_dir.
	var root: String = dest_dir.simplify_path().rstrip("/") + "/"
	if not (dest_dir + entry).simplify_path().begins_with(root):
		return "resolves outside the destination"
	return ""

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
