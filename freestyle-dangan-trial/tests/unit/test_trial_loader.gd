extends GdUnitTestSuite
## Integration test of the synchronous load path: pack the fixture trial into
## a real .drtrial zip, load it through the TrialLoader autoload, and check
## the typed manifest and character data come out the other side.

const FIXTURE_DIR := "res://tests/fixtures/minimal-trial/"
const ZIP_PATH := "user://gdunit_smoke_fixture.drtrial"
const FIXTURE_FILES := [
	"trial.json",
	"Characters/Fixture_Chan/character.json",
	"Characters/Fixture_Chan/sprite_01.png",
	"TruthBullets/tb_fixture.png",
]


func before_test() -> void:
	var packer := ZIPPacker.new()
	assert_int(packer.open(ZIP_PATH)).is_equal(OK)
	for f in FIXTURE_FILES:
		packer.start_file(f)
		packer.write_file(FileAccess.get_file_as_bytes(FIXTURE_DIR + f))
		packer.close_file()
	packer.close()


func after_test() -> void:
	DirAccess.remove_absolute(ZIP_PATH)


func test_load_trial_builds_typed_manifest() -> void:
	var ok := TrialLoader.load_trial(ProjectSettings.globalize_path(ZIP_PATH))
	assert_bool(ok).is_true()
	assert_str(TrialLoader.last_load_error).is_empty()

	var manifest: TrialManifest = TrialLoader.manifest
	assert_object(manifest).is_not_null()
	assert_str(manifest.trial_name).is_equal("Fixture Trial")
	# Shape, not arithmetic: the accessors must reach the parsed manifest.
	assert_array(TrialLoader.get_script_lines()).is_not_empty()
	assert_array(TrialLoader.get_minigames()).is_not_empty()
	assert_array(TrialLoader.get_truth_bullets()).is_not_empty()

	var character := TrialLoader.load_character("FC_20000101_FIXTUR")
	assert_str(character.get("name", "")).is_equal("Fixture")


func test_async_load_publishes_one_coherent_manifest() -> void:
	var path := ProjectSettings.globalize_path(ZIP_PATH)
	# Monitoring must start before the load: the worker hands off with
	# call_deferred, so the signal can land on the very next frame. auto_free
	# stays off - TrialLoader is an autoload and must outlive the test.
	monitor_signals(TrialLoader, false)
	TrialLoader.load_trial_async(path)
	# The second call lands while the first is in flight and must be ignored
	# outright rather than resetting state the worker is still writing.
	TrialLoader.load_trial_async(path)
	await assert_signal(TrialLoader).is_emitted("loading_complete")

	assert_bool(TrialLoader.is_loading()).is_false()
	assert_bool(TrialLoader.loaded_async).is_true()
	var manifest: TrialManifest = TrialLoader.manifest
	assert_object(manifest).is_not_null()
	assert_str(manifest.trial_name).is_equal("Fixture Trial")
	assert_array(TrialLoader.get_script_lines()).is_not_empty()
	assert_str(TrialLoader.current_trial_path).is_equal(path)


func test_async_load_of_a_missing_file_fails_without_completing() -> void:
	# assert_signal().is_emitted(name) matches only an emission carrying no
	# arguments, and loading_failed carries the message, so the outcome is
	# captured directly rather than pinning the test to that exact string.
	var failures: Array[String] = []
	var completions: Array[int] = [0]
	var on_failed := func(message: String) -> void: failures.append(message)
	var on_complete := func() -> void: completions[0] += 1
	TrialLoader.loading_failed.connect(on_failed)
	TrialLoader.loading_complete.connect(on_complete)

	TrialLoader.load_trial_async("user://gdunit_no_such_trial.drtrial")
	# The worker hands off with call_deferred, so this lands within a frame or
	# two. The bound makes a regression fail rather than hang.
	for _i in range(60):
		await get_tree().process_frame
		if not failures.is_empty():
			break
	TrialLoader.loading_failed.disconnect(on_failed)
	TrialLoader.loading_complete.disconnect(on_complete)

	assert_array(failures).is_not_empty()
	assert_int(completions[0]).is_equal(0)
	assert_bool(TrialLoader.is_loading()).is_false()
	assert_bool(TrialLoader.loaded_async).is_false()
	assert_str(TrialLoader.last_load_error).is_not_empty()
	assert_object(TrialLoader.manifest).is_null()


func test_loading_a_trial_clears_the_audio_cache() -> void:
	# Every trial extracts to the same directory, so the cache is keyed on paths
	# two trials share: without this, trial B plays trial A's line_001.mp3 even
	# though extraction overwrote the file on disk.
	AudioManager._audio_cache["user://gdunit_stale_voice.wav"] = AudioStreamWAV.new()
	assert_bool(TrialLoader.load_trial(ProjectSettings.globalize_path(ZIP_PATH))).is_true()
	assert_int(AudioManager._audio_cache.size()).is_equal(0)


func test_a_missing_file_sets_a_load_error_naming_the_path() -> void:
	# last_load_error is what the picker and the loading screen show. Nothing
	# asserted it, so a change that emptied it would surface as a silent
	# failure in the UI rather than a red test.
	var missing := ProjectSettings.globalize_path("user://gdunit_no_such_trial.drtrial")
	assert_bool(TrialLoader.load_trial(missing)).is_false()
	assert_str(TrialLoader.last_load_error).contains("not found")
	assert_str(TrialLoader.last_load_error).contains(missing)


func test_unparseable_trial_json_sets_a_parse_error_and_surfaces_it() -> void:
	var packer := ZIPPacker.new()
	var broken := "user://gdunit_broken_fixture.drtrial"
	assert_int(packer.open(broken)).is_equal(OK)
	packer.start_file("trial.json")
	packer.write_file("{ not json".to_utf8_buffer())
	packer.close_file()
	packer.close()

	assert_bool(TrialLoader.load_trial(ProjectSettings.globalize_path(broken))).is_false()
	assert_str(TrialLoader.last_parse_error).contains("not valid JSON")
	# The load error carries the parse error rather than a generic message,
	# which is the difference between "this trial is broken" and "why".
	assert_str(TrialLoader.last_load_error).is_equal(TrialLoader.last_parse_error)
	DirAccess.remove_absolute(broken)


func test_a_trial_json_that_is_not_an_object_is_reported_as_such() -> void:
	var packer := ZIPPacker.new()
	var broken := "user://gdunit_array_fixture.drtrial"
	assert_int(packer.open(broken)).is_equal(OK)
	packer.start_file("trial.json")
	packer.write_file("[1, 2, 3]".to_utf8_buffer())
	packer.close_file()
	packer.close()

	assert_bool(TrialLoader.load_trial(ProjectSettings.globalize_path(broken))).is_false()
	assert_str(TrialLoader.last_parse_error).contains("not an object")
	DirAccess.remove_absolute(broken)
