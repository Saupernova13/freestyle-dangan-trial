extends GdUnitTestSuite
## A hand-edited or half-written settings.cfg must cost one setting, not the
## whole settings system. ConfigFile.save() is not atomic, so a crash mid-write
## can leave a file that parses but holds the wrong types.

const BACKUP_PATH := "user://gdunit_settings_backup.cfg"

var _had_backup: bool = false


## The autoload reads a fixed path, so the real file is set aside and restored
## rather than worked around.
func before_test() -> void:
	_had_backup = FileAccess.file_exists(Settings.SAVE_PATH)
	if _had_backup:
		DirAccess.copy_absolute(Settings.SAVE_PATH, BACKUP_PATH)


func after_test() -> void:
	if _had_backup:
		DirAccess.copy_absolute(BACKUP_PATH, Settings.SAVE_PATH)
		DirAccess.remove_absolute(BACKUP_PATH)
	else:
		DirAccess.remove_absolute(Settings.SAVE_PATH)
	Settings._ready()


func _write_config(values: Dictionary) -> void:
	var config := ConfigFile.new()
	for section_key in values:
		var parts: PackedStringArray = section_key.split("/")
		config.set_value(parts[0], parts[1], values[section_key])
	assert_int(config.save(Settings.SAVE_PATH)).is_equal(OK)


func test_a_wrong_type_costs_only_that_key() -> void:
	_write_config({
		"gameplay/text_speed": "instant",
		"audio/voice_volume": 0.25,
	})
	Settings._ready()

	assert_int(Settings.text_speed).is_equal(Settings.DEFAULT_TEXT_SPEED)
	assert_float(Settings.voice_volume).is_equal_approx(0.25, 0.001)


func test_a_wrong_type_does_not_disable_saving_for_the_session() -> void:
	# The reported failure: the typed setter raised, which aborted
	# _load_settings() before it could clear _suppress_save, so _apply_and_save
	# returned early for the rest of the process. Sliders moved, labels updated
	# from the sliders, and nothing was ever applied or written again.
	_write_config({"gameplay/text_speed": "instant"})
	Settings._ready()

	assert_bool(Settings._suppress_save).is_false()

	Settings.voice_volume = 0.5
	var written := ConfigFile.new()
	assert_int(written.load(Settings.SAVE_PATH)).is_equal(OK)
	assert_float(written.get_value("audio", "voice_volume", -1.0)).is_equal_approx(0.5, 0.001)


func test_a_missing_file_leaves_settings_writable() -> void:
	# First run. Nothing is read, so the in-memory values stand and the next
	# change has to create the file - a missing file is not an error.
	DirAccess.remove_absolute(Settings.SAVE_PATH)
	Settings._ready()
	assert_bool(Settings._suppress_save).is_false()

	Settings.text_speed = 2
	var written := ConfigFile.new()
	assert_int(written.load(Settings.SAVE_PATH)).is_equal(OK)
	assert_int(written.get_value("gameplay", "text_speed", -1)).is_equal(2)
