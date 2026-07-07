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
