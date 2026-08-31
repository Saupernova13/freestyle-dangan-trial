extends GdUnitTestSuite
## Empty authored data must be reported and skipped, never played. Four
## minigames spin on it: nothing spawns, nothing can be hit, the timer expires
## and the attempt replays identically.

## Builds an initialised instance the way MinigameRunner's probe does. Nothing
## is added to the tree and start() is never called, so validate_data() sees
## exactly what the runner sees.
func _probe(game_type: String, type_specific: Dictionary) -> MinigameBase:
	var script: GDScript = load(MinigameRunner.MINIGAME_SCRIPTS[game_type])
	var game: MinigameBase = auto_free(script.new())
	game.initialize(MinigameData.from_dict({
		"gameType": game_type,
		"typeSpecific": type_specific,
	}))
	return game


func test_empty_data_is_rejected_for_every_minigame_that_spins_on_it() -> void:
	# Keyed by the field the editor writes, so a rename here fails loudly.
	var empty_cases := {
		"nonstop_debate": {"dialogueLines": []},
		"logic_dive": {"questions": []},
		"mass_panic_debate": {"lineGroups": []},
		"hangmans_gambit": {"answerKey": ""},
	}
	for game_type in empty_cases:
		var errors: Array[String] = _probe(game_type, empty_cases[game_type]).validate_data()
		assert_array(errors).override_failure_message(
			"%s accepted empty data" % game_type
		).is_not_empty()


func test_populated_data_is_accepted() -> void:
	var valid_cases := {
		"nonstop_debate": {"dialogueLines": [{"text": "It was you."}]},
		"logic_dive": {"questions": [{"question": "Who?"}]},
		"mass_panic_debate": {"lineGroups": [{"lines": []}]},
		"hangmans_gambit": {"answerKey": "KNIFE"},
	}
	for game_type in valid_cases:
		var errors: Array[String] = _probe(game_type, valid_cases[game_type]).validate_data()
		assert_array(errors).override_failure_message(
			"%s rejected valid data: %s" % [game_type, errors]
		).is_empty()


func test_a_whitespace_only_answer_key_is_rejected() -> void:
	# Every slot starts revealed, so _check_complete() is never reached and the
	# only way out is influence depletion.
	var errors: Array[String] = _probe("hangmans_gambit", {"answerKey": "   "}).validate_data()
	assert_array(errors).is_not_empty()


func test_minigames_without_required_data_validate_clean() -> void:
	# The stubs and the games that carry no authored payload must not be
	# skipped by a hook they do not override.
	for game_type in ["rebuttal_showdown", "psyche_taxi", "closing_argument", "debate_scrum"]:
		var errors: Array[String] = _probe(game_type, {}).validate_data()
		assert_array(errors).override_failure_message(
			"%s reported %s" % [game_type, errors]
		).is_empty()


func test_a_debate_whose_evidence_does_not_resolve_is_rejected() -> void:
	# Not the same as an empty selection, which means "all bullets": here the
	# author named ids that no longer exist, so every weak-point shot is a miss
	# and the attempt ends on the player's first correct-looking one.
	var errors: Array[String] = _probe("nonstop_debate", {
		"dialogueLines": [{"text": "It was you."}],
		"selectedBullets": ["tb_deleted_by_the_author"],
	}).validate_data()
	assert_array(errors).is_not_empty()


func test_an_empty_bullet_selection_is_accepted() -> void:
	var errors: Array[String] = _probe("nonstop_debate", {
		"dialogueLines": [{"text": "It was you."}],
		"selectedBullets": [],
	}).validate_data()
	assert_array(errors).is_empty()
