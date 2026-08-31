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
	assert_int(TrialLoader.get_script_lines().size()).is_equal(4)
	assert_int(TrialLoader.get_minigames().size()).is_equal(1)
	assert_int(TrialLoader.get_truth_bullets().size()).is_equal(1)

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
	assert_int(TrialLoader.get_script_lines().size()).is_equal(4)
	assert_str(TrialLoader.current_trial_path).is_equal(path)


func test_async_load_of_a_missing_file_fails_without_completing() -> void:
	monitor_signals(TrialLoader, false)
	TrialLoader.load_trial_async("user://gdunit_no_such_trial.drtrial")
	await assert_signal(TrialLoader).is_emitted("loading_failed")

	assert_bool(TrialLoader.is_loading()).is_false()
	assert_bool(TrialLoader.loaded_async).is_false()
	assert_str(TrialLoader.last_load_error).is_not_empty()
	assert_object(TrialLoader.manifest).is_null()
