extends GdUnitTestSuite
## Engine half of the trial.json contract tests. The editor validates the same
## fixture against schema/trial.schema.json (web-ui-editor/tests/schema.test.js),
## so a contract change that only updates one side fails CI on the other.

const FIXTURE_PATH := "res://tests/fixtures/minimal-trial/trial.json"


func _load_fixture() -> Dictionary:
	var text := FileAccess.get_file_as_string(FIXTURE_PATH)
	assert_str(text).is_not_empty()
	var json := JSON.new()
	assert_int(json.parse(text)).is_equal(OK)
	return json.data


func test_fixture_passes_validation() -> void:
	var data := _load_fixture()
	assert_str(TrialValidator.check_version(data)).is_empty()
	assert_array(TrialValidator.validate(data)).is_empty()


func test_missing_script_lines_fails() -> void:
	var data := _load_fixture()
	data.erase("script")
	assert_array(TrialValidator.validate(data)).is_not_empty()


func test_newer_major_version_is_rejected() -> void:
	var data := _load_fixture()
	data["metadata"]["version"] = "5.0"
	assert_str(TrialValidator.check_version(data)).is_not_empty()


func test_missing_metadata_warns_but_passes() -> void:
	var data := _load_fixture()
	data.erase("metadata")
	assert_str(TrialValidator.check_version(data)).is_empty()
	assert_array(TrialValidator.validate(data)).is_empty()


func test_older_major_version_passes() -> void:
	var data := _load_fixture()
	data["metadata"]["version"] = "3.0"
	assert_str(TrialValidator.check_version(data)).is_empty()


func test_minigame_line_without_id_fails() -> void:
	var data := _load_fixture()
	data["script"]["lines"].append({"id": "line_bad", "type": "minigame"})
	assert_array(TrialValidator.validate(data)).is_not_empty()


func test_minigame_entry_without_game_type_fails() -> void:
	var data := _load_fixture()
	data["minigames"].append({"gameId": "mg_broken"})
	assert_array(TrialValidator.validate(data)).is_not_empty()


func test_non_array_truth_bullets_fails() -> void:
	var data := _load_fixture()
	data["truthBullets"] = {"not": "an array"}
	assert_array(TrialValidator.validate(data)).is_not_empty()


func test_unknown_line_type_warns_but_passes() -> void:
	var data := _load_fixture()
	data["script"]["lines"].append({"id": "line_future", "type": "hologram"})
	assert_array(TrialValidator.validate(data)).is_empty()
