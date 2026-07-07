extends GdUnitTestSuite

const FIXTURE_PATH := "res://tests/fixtures/minimal-trial/trial.json"


func _load_manifest() -> TrialManifest:
	var text := FileAccess.get_file_as_string(FIXTURE_PATH)
	var json := JSON.new()
	assert_int(json.parse(text)).is_equal(OK)
	return TrialManifest.from_dict(json.data)


func test_fixture_parses_into_typed_model() -> void:
	var manifest := _load_manifest()
	assert_str(manifest.trial_name).is_equal("Fixture Trial")
	assert_str(manifest.format_version).is_equal("4.0")
	assert_int(manifest.character_ids.size()).is_equal(17)
	assert_int(manifest.script_lines.size()).is_equal(4)
	assert_int(manifest.minigames.size()).is_equal(1)
	assert_int(manifest.truth_bullets.size()).is_equal(1)


func test_script_line_types_survive_parsing() -> void:
	var manifest := _load_manifest()
	assert_str(manifest.script_lines[0].type).is_equal(ScriptLine.TYPE_SPEAKING)
	assert_str(manifest.script_lines[1].type).is_equal(ScriptLine.TYPE_NARRATOR)
	assert_str(manifest.script_lines[3].type).is_equal(ScriptLine.TYPE_MINIGAME)
	assert_str(manifest.script_lines[3].minigame_id).is_equal("mg_fixture_debate")
	# Line 3 carries "audioFile": null in the fixture.
	assert_str(manifest.script_lines[2].audio_file).is_empty()


func test_find_minigame() -> void:
	var manifest := _load_manifest()
	var found := manifest.find_minigame("mg_fixture_debate")
	assert_object(found).is_not_null()
	assert_str(found.game_type).is_equal("nonstop_debate")
	assert_object(manifest.find_minigame("mg_nope")).is_null()


func test_non_dictionary_lines_are_skipped() -> void:
	var manifest := TrialManifest.from_dict({
		"trialName": "T",
		"characters": [],
		"script": {"lines": [{"id": "l1", "type": "narrator", "text": "hi"}, "junk", 7]},
		"metadata": {"version": "4.0"},
	})
	assert_int(manifest.script_lines.size()).is_equal(1)


func test_empty_dict_yields_empty_manifest() -> void:
	var manifest := TrialManifest.from_dict({})
	assert_str(manifest.trial_name).is_empty()
	assert_str(manifest.format_version).is_empty()
	assert_array(manifest.script_lines).is_empty()
	assert_array(manifest.minigames).is_empty()
	assert_object(manifest.find_minigame("anything")).is_null()
