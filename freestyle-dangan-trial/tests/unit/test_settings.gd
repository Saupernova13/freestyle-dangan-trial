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
	# The write is debounced now, so the value is on the timer until this.
	Settings.flush_pending_save()
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
	Settings.flush_pending_save()
	var written := ConfigFile.new()
	assert_int(written.load(Settings.SAVE_PATH)).is_equal(OK)
	assert_int(written.get_value("gameplay", "text_speed", -1)).is_equal(2)


func test_a_drag_writes_once_rather_than_per_frame() -> void:
	# settings_menu wires slider.value_changed straight to the setters, so one
	# drag used to write user://settings.cfg dozens of times a second - real
	# flash wear on Android, and frame cost during an interaction that should
	# be smooth.
	Settings._ready()
	var writes := _count_writes(func() -> void:
		for i in range(30):
			Settings.voice_volume = float(i) / 30.0
	)
	assert_int(writes).is_equal(0)


func test_the_debounced_write_still_lands() -> void:
	Settings._ready()
	Settings.voice_volume = 0.42
	Settings.flush_pending_save()

	var written := ConfigFile.new()
	assert_int(written.load(Settings.SAVE_PATH)).is_equal(OK)
	assert_float(written.get_value("audio", "voice_volume", -1.0)).is_equal_approx(0.42, 0.001)


func test_the_value_applies_immediately_even_though_the_write_waits() -> void:
	# The UI has to stay responsive; only the disk write is deferred.
	Settings._ready()
	Settings.voice_volume = 0.25
	assert_float(Settings.voice_volume).is_equal_approx(0.25, 0.001)


func test_flushing_with_nothing_pending_is_harmless() -> void:
	Settings._ready()
	Settings.flush_pending_save()
	Settings.flush_pending_save()


## Modification time is the only observable the write leaves behind.
func _count_writes(action: Callable) -> int:
	Settings.flush_pending_save()
	var before := FileAccess.get_modified_time(Settings.SAVE_PATH)
	action.call()
	var after := FileAccess.get_modified_time(Settings.SAVE_PATH)
	return 0 if before == after else 1
