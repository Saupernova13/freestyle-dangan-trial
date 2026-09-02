extends GdUnitTestSuite
## `debug` and `info` had byte-identical bodies gated on one flag, and the
## output did not record which was called - so they were indistinguishable in
## a log, "leveled logging" described nothing, and there was no way to get
## info without debug.

var _restore_level: Log.Level


func before_test() -> void:
	_restore_level = Log.min_level


func after_test() -> void:
	Log.min_level = _restore_level


func test_the_levels_are_ordered() -> void:
	assert_bool(Log.Level.DEBUG < Log.Level.INFO).is_true()
	assert_bool(Log.Level.INFO < Log.Level.WARN).is_true()
	assert_bool(Log.Level.WARN < Log.Level.ERROR).is_true()


func test_the_threshold_drops_everything_below_it() -> void:
	Log.min_level = Log.Level.WARN
	assert_bool(Log.is_enabled(Log.Level.DEBUG)).is_false()
	assert_bool(Log.is_enabled(Log.Level.INFO)).is_false()
	assert_bool(Log.is_enabled(Log.Level.WARN)).is_true()
	assert_bool(Log.is_enabled(Log.Level.ERROR)).is_true()


func test_info_can_be_had_without_debug() -> void:
	# The whole point of the split. With one shared flag this was impossible.
	Log.min_level = Log.Level.INFO
	assert_bool(Log.is_enabled(Log.Level.DEBUG)).is_false()
	assert_bool(Log.is_enabled(Log.Level.INFO)).is_true()


func test_a_line_records_which_level_wrote_it() -> void:
	# Two identical-looking lines in a log are two lines nobody can triage.
	assert_str(Log._format(Log.Level.DEBUG, "Tag", "msg")).is_equal("[DEBUG][Tag] msg")
	assert_str(Log._format(Log.Level.INFO, "Tag", "msg")).is_equal("[INFO][Tag] msg")
	assert_str(Log._format(Log.Level.WARN, "Tag", "msg")).is_equal("[WARN][Tag] msg")
	assert_str(Log._format(Log.Level.ERROR, "Tag", "msg")).is_equal("[ERROR][Tag] msg")


func test_every_level_has_a_distinct_name() -> void:
	var names := Log.LEVEL_NAMES.values()
	assert_int(names.size()).is_equal(Log.Level.size())
	# Duplicated names would put the split back where it started.
	var unique := {}
	for name in names:
		unique[name] = true
	assert_int(unique.size()).is_equal(names.size())
