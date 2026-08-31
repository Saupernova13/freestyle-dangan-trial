extends GdUnitTestSuite
## Pausing was declarative only: State.PAUSED was an enum value that stopped
## nothing. A 60s Nonstop Debate kept spawning panels and counting down behind
## the settings menu, and could fail while the menu was still open.

const TIMER := MinigameBase.HudComponent.TIMER_DISPLAY


func _started_minigame() -> MinigameBase:
	var game: MinigameBase = auto_free(MinigameBase.new())
	add_child(game)
	game.initialize(MinigameData.from_dict({"timeLimit": 30}))
	game.start()
	game.setup_standard_ui([TIMER])
	ScriptDirector.on_minigame_started(game)
	return game


func after_test() -> void:
	# The autoload outlives the test; leave nothing paused or half-registered.
	while ScriptDirector.current_state == ScriptDirector.State.PAUSED:
		ScriptDirector.resume_trial()
	ScriptDirector._active_minigame = null
	ScriptDirector._pause_depth = 0
	ScriptDirector._transition_to(ScriptDirector.State.IDLE)


func test_pausing_the_trial_reaches_the_active_minigame() -> void:
	var game := _started_minigame()
	ScriptDirector.pause_trial()

	assert_int(game.state).is_equal(MinigameBase.State.PAUSED)
	# Not just this node's own _process: the overlay, its panels and the HUD
	# are all children and have to stop with it.
	assert_int(game.process_mode).is_equal(Node.PROCESS_MODE_DISABLED)

	var held := game.get_time_remaining()
	await get_tree().process_frame
	await get_tree().process_frame
	assert_float(game.get_time_remaining()).is_equal_approx(held, 0.001)


func test_resuming_restores_the_minigame() -> void:
	var game := _started_minigame()
	ScriptDirector.pause_trial()
	ScriptDirector.resume_trial()

	assert_int(game.state).is_equal(MinigameBase.State.ACTIVE)
	assert_int(game.process_mode).is_equal(Node.PROCESS_MODE_INHERIT)
	assert_bool(game.is_active).is_true()


func test_a_nested_pause_does_not_unpause_the_outer_one() -> void:
	# The settings menu can be opened on top of the game-over screen, which has
	# already paused. Closing it must not restart a trial that is meant to stay
	# stopped, and the state to return to must survive.
	ScriptDirector._transition_to(ScriptDirector.State.DIALOGUE)
	ScriptDirector.pause_trial()
	ScriptDirector.pause_trial()
	ScriptDirector.resume_trial()
	assert_int(ScriptDirector.current_state).is_equal(ScriptDirector.State.PAUSED)

	ScriptDirector.resume_trial()
	assert_int(ScriptDirector.current_state).is_equal(ScriptDirector.State.DIALOGUE)


func test_the_camera_stops_navigating_while_paused() -> void:
	# _input() takes ui_left/ui_right and marks them handled before GUI input
	# runs, so arrow keys used to spin the trial camera instead of moving the
	# focused settings slider.
	ScriptDirector._transition_to(ScriptDirector.State.DIALOGUE)
	ScriptDirector.pause_trial()
	var camera: Node = auto_free(load("res://scripts/camera/bench_focus_camera.gd").new())
	assert_bool(camera._is_nav_blocked()).is_true()
	assert_bool(camera._is_free_look_blocked()).is_true()
