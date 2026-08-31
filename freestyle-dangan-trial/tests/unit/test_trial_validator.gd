extends GdUnitTestSuite
## Engine half of the trial.json contract tests. These are hand-written cases
## against the fixture, not a schema check: the only artifact shared with the
## editor's suite is the fixture file itself. The one assertion that genuinely
## ties the two together is the gameType enum check in test_trial_manifest.gd.

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


## The line-type strings used to be spelled out independently in ScriptLine,
## ScriptDirector's dispatch table and here. These pin all three to one source,
## so a renamed constant fails CI instead of silently unhooking the dispatch.
func test_validator_line_types_come_from_script_line() -> void:
	assert_array(TrialValidator.LINE_TYPES).is_equal(ScriptLine.TYPES)


func test_script_line_types_list_is_complete() -> void:
	assert_array(ScriptLine.TYPES).contains_exactly_in_any_order(
		[ScriptLine.TYPE_SPEAKING, ScriptLine.TYPE_NARRATOR, ScriptLine.TYPE_MINIGAME]
	)


func test_director_dispatch_is_keyed_on_the_constants() -> void:
	var director := get_node("/root/ScriptDirector")
	assert_object(director).is_not_null()
	assert_array(director._line_handlers.keys()).contains_exactly_in_any_order(ScriptLine.TYPES)
