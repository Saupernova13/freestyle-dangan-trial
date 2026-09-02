extends GdUnitTestSuite
## A line that names an audio file and plays none was swallowed at three
## consecutive layers with nothing logged: get_audio_path returned "", the
## decode returned null, and play_voice_line returned quietly either way. The
## author heard silence and had nowhere to look.


func before_test() -> void:
	AudioManager.clear_cache()


func after_test() -> void:
	AudioManager.clear_cache()


func test_a_missing_voice_line_is_reported() -> void:
	AudioManager.play_voice_line("no_such_line.mp3")
	assert_int(AudioManager._warned.size()).is_equal(1)


func test_the_same_missing_line_is_reported_once() -> void:
	# A line replays on every skip and every retry, so warning per call would
	# bury the first report under its own repeats.
	for _i in range(10):
		AudioManager.play_voice_line("no_such_line.mp3")
	assert_int(AudioManager._warned.size()).is_equal(1)


func test_different_missing_lines_are_each_reported() -> void:
	AudioManager.play_voice_line("one.mp3")
	AudioManager.play_voice_line("two.mp3")
	assert_int(AudioManager._warned.size()).is_equal(2)


func test_an_empty_filename_is_not_a_problem() -> void:
	# Most lines carry no audio at all; that is not an authoring mistake.
	AudioManager.play_voice_line("")
	assert_int(AudioManager._warned.size()).is_equal(0)


func test_the_duration_lookup_reports_the_same_way() -> void:
	# NonstopDebate sizes its panel crossings from this, so a missing file
	# silently changes the pacing.
	assert_float(AudioManager.get_voice_line_duration("no_such_line.mp3")).is_equal(-1.0)
	assert_int(AudioManager._warned.size()).is_equal(1)


func test_an_empty_filename_has_no_duration_and_says_nothing() -> void:
	assert_float(AudioManager.get_voice_line_duration("")).is_equal(-1.0)
	assert_int(AudioManager._warned.size()).is_equal(0)


func test_clearing_the_cache_clears_the_reports_too() -> void:
	# The warnings name the previous trial's filenames.
	AudioManager.play_voice_line("no_such_line.mp3")
	AudioManager.clear_cache()
	assert_int(AudioManager._warned.size()).is_equal(0)
