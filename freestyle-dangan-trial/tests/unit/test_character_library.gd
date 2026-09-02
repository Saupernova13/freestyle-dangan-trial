extends GdUnitTestSuite
## Three distinct failures - an unreadable file, malformed JSON, and a root
## that is not an object - collapsed into an empty dict with nothing logged,
## and the caller then reported "Character not found" for a file it had just
## read and failed to parse. The author went hunting for a wrong id instead of
## the trailing comma the parser had already diagnosed and thrown away.

const DIR := "user://gdunit_charlib/"


func _write_character(folder: String, text: String) -> void:
	DirAccess.make_dir_recursive_absolute(DIR + folder)
	var f := FileAccess.open(DIR + folder + "/character.json", FileAccess.WRITE)
	f.store_string(text)
	f.close()


func before_test() -> void:
	_remove_dir()
	DirAccess.make_dir_recursive_absolute(DIR)


func after_test() -> void:
	_remove_dir()


func _remove_dir() -> void:
	var dir := DirAccess.open(DIR)
	if not dir:
		return
	dir.list_dir_begin()
	var name := dir.get_next()
	while name != "":
		if dir.current_is_dir():
			DirAccess.remove_absolute(DIR + name + "/character.json")
			DirAccess.remove_absolute(DIR + name)
		name = dir.get_next()
	dir.list_dir_end()
	DirAccess.remove_absolute(DIR)


func test_a_readable_character_is_found() -> void:
	_write_character("Kyoko", '{"id": "kyoko", "name": "Kyoko", "surname": "K"}')
	var library := CharacterLibrary.new(DIR)

	assert_str(library.get_character("kyoko").get("name", "")).is_equal("Kyoko")


func test_malformed_json_does_not_masquerade_as_a_missing_character() -> void:
	# A truncated hand-edit. Godot's parser accepts a trailing comma, so that
	# particular slip is not the one that breaks it.
	_write_character("Kyoko", '{"id": "kyoko", "name": ')
	var library := CharacterLibrary.new(DIR)

	assert_dict(library.get_character("kyoko")).is_empty()


func test_a_non_object_root_is_handled_rather_than_raising() -> void:
	# `return json.data` on a -> Dictionary function used to raise a
	# return-type error; trial_loader.gd already guarded this and the guard was
	# never carried across.
	_write_character("Kyoko", '["kyoko"]')
	var library := CharacterLibrary.new(DIR)

	assert_dict(library.get_character("kyoko")).is_empty()


func test_an_empty_file_is_handled() -> void:
	_write_character("Kyoko", "")
	var library := CharacterLibrary.new(DIR)

	assert_dict(library.get_character("kyoko")).is_empty()


func test_one_broken_file_does_not_hide_a_good_one() -> void:
	# The scan must keep walking: a broken folder earlier in the listing used
	# to be indistinguishable from the character simply not existing.
	_write_character("Broken", "{ not json")
	_write_character("Kyoko", '{"id": "kyoko", "name": "Kyoko", "surname": "K"}')
	var library := CharacterLibrary.new(DIR)

	assert_str(library.get_character("kyoko").get("name", "")).is_equal("Kyoko")


func test_a_genuinely_absent_character_is_still_reported_absent() -> void:
	_write_character("Kyoko", '{"id": "kyoko", "name": "Kyoko", "surname": "K"}')
	var library := CharacterLibrary.new(DIR)

	assert_dict(library.get_character("makoto")).is_empty()
