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


func test_a_known_difficulty_survives() -> void:
	for difficulty in MinigameData.DIFFICULTIES:
		var mg := MinigameData.from_dict({"difficulty": difficulty})
		assert_str(mg.difficulty).is_equal(difficulty)


func test_an_unknown_difficulty_normalises_rather_than_mistuning_four_tables() -> void:
	# "Hard" with a capital H used to pass every check and then fall back
	# independently in the spawn interval, the difficulty multiplier, the
	# floating-letter speed and the damage per wrong answer - a minigame tuned
	# to medium in four dimensions, with nothing said.
	for raw in ["Hard", "hardcore", "", 3]:
		var mg := MinigameData.from_dict({"gameId": "mg_1", "difficulty": raw})
		assert_str(mg.difficulty).override_failure_message(
			"%s was not normalised" % [raw]
		).is_equal(MinigameData.DEFAULT_DIFFICULTY)


func test_an_absent_difficulty_is_not_an_authoring_mistake() -> void:
	# Absent means "use the default", so it must not warn.
	var mg := MinigameData.from_dict({"gameId": "mg_1"})
	assert_str(mg.difficulty).is_equal(MinigameData.DEFAULT_DIFFICULTY)


func test_every_difficulty_keys_every_tuning_table() -> void:
	# One list, four consumers. A difficulty the model accepts but a table does
	# not know is the same silent mistuning by another route.
	for difficulty in MinigameData.DIFFICULTIES:
		assert_bool(MinigameConfig.DIFFICULTY_MULTIPLIERS.has(difficulty)).override_failure_message(
			"DIFFICULTY_MULTIPLIERS has no '%s'" % difficulty
		).is_true()
		assert_bool(MinigameConfig.FLOATING_LETTER_SPEEDS.has(difficulty)).override_failure_message(
			"FLOATING_LETTER_SPEEDS has no '%s'" % difficulty
		).is_true()
