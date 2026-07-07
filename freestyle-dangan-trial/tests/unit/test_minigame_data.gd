extends GdUnitTestSuite


func test_defaults_from_empty_dict() -> void:
	var mg := MinigameData.from_dict({})
	assert_str(mg.game_id).is_empty()
	assert_str(mg.name).is_empty()
	assert_str(mg.game_type).is_empty()
	assert_str(mg.difficulty).is_equal("medium")
	assert_float(mg.time_limit).is_equal(60.0)
	assert_str(mg.fail_comment).is_empty()
	assert_bool(mg.type_specific.is_empty()).is_true()


func test_typed_fields_parse() -> void:
	var mg := MinigameData.from_dict({
		"gameId": "mg_1",
		"name": "Who did it?",
		"gameType": "nonstop_debate",
		"difficulty": "hard",
		"timeLimit": 45,
		"failComment": "Wrong!",
		"typeSpecific": {"dialogueLines": [{"text": "line"}]},
	})
	assert_str(mg.game_id).is_equal("mg_1")
	assert_str(mg.name).is_equal("Who did it?")
	assert_str(mg.game_type).is_equal("nonstop_debate")
	assert_str(mg.difficulty).is_equal("hard")
	assert_float(mg.time_limit).is_equal(45.0)
	assert_str(mg.fail_comment).is_equal("Wrong!")
	assert_int(mg.type_specific.get("dialogueLines", []).size()).is_equal(1)


func test_null_and_wrong_types_fall_back() -> void:
	var mg := MinigameData.from_dict({
		"gameId": null,
		"difficulty": 3,
		"timeLimit": "soon",
		"typeSpecific": [],
	})
	assert_str(mg.game_id).is_empty()
	assert_str(mg.difficulty).is_equal("medium")
	assert_float(mg.time_limit).is_equal(60.0)
	assert_bool(mg.type_specific.is_empty()).is_true()
