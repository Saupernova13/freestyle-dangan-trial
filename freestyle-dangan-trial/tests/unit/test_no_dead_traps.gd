extends GdUnitTestSuite
## Two of the deleted functions were traps rather than clutter, and both are
## the kind a future edit re-adds in good faith. These pin their absence.


func _method_names(path: String) -> Array:
	var script: GDScript = load(path)
	return script.get_script_method_list().map(
		func(entry: Dictionary) -> String: return entry["name"]
	)


func test_minigame_base_has_no_wrong_answer_counterpart() -> void:
	# It took damage and did NOT finish the minigame. Paired with
	# _on_correct_answer by name - which all eight subclasses do use - it
	# ships a minigame that damages the player and then hangs, never emitting
	# minigame_completed.
	var names := _method_names("res://scripts/minigames/minigame_base.gd")
	assert_bool(names.has("_on_correct_answer")).is_true()
	assert_bool(names.has("_on_wrong_answer")).override_failure_message(
		"_on_wrong_answer is back; a minigame that pairs it with "
		+ "_on_correct_answer damages the player and then hangs"
	).is_false()


func test_the_start_menu_cannot_open_the_trial_room_with_no_trial() -> void:
	# vbox_selector._on_pressed changed scene straight to the trial room,
	# bypassing the file picker and the loading screen. The scene's one
	# [connection] resolves to texture_button.gd's _on_pressed, so this was
	# unreachable - but only by that accident.
	var names := _method_names("res://scripts/tools/vbox_selector.gd")
	assert_bool(names.has("_on_pressed")).override_failure_message(
		"vbox_selector._on_pressed is back; it opens the trial room with no trial loaded"
	).is_false()
