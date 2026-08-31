extends GdUnitTestSuite
## A minigame used to run two countdowns from the same time_limit, both wired to
## _on_time_expired. TimerDisplay.add_time() moved only the visible one, so a
## white-noise "+10" was theatre: the round still ended on the original
## schedule when the internal Timer reached zero.

const TIMER := MinigameBase.HudComponent.TIMER_DISPLAY


func _started_game(seconds: float, components: Array) -> MinigameBase:
	var game: MinigameBase = auto_free(MinigameBase.new())
	add_child(game)
	game.initialize(MinigameData.from_dict({"timeLimit": seconds}))
	game.start()
	if not components.is_empty():
		game.setup_standard_ui(components)
	return game


func _clock_count(game: MinigameBase) -> int:
	var count := 0
	for child in game.get_children():
		# queue_free() is deferred, so a released Timer is still a child for
		# the rest of this frame. It is stopped, and it is not a clock.
		if child is Timer and not child.is_queued_for_deletion():
			count += 1
	if game.get_hud(TIMER) != null:
		count += 1
	return count


func test_a_timed_minigame_runs_exactly_one_clock() -> void:
	assert_int(_clock_count(_started_game(30.0, [TIMER]))).is_equal(1)


func test_a_minigame_with_no_display_still_has_a_deadline() -> void:
	# The three stub minigames never call setup_standard_ui, so the internal
	# Timer is their only clock and must survive.
	var game := _started_game(30.0, [])
	assert_int(_clock_count(game)).is_equal(1)
	assert_float(game.get_time_remaining()).is_equal_approx(30.0, 0.001)


func test_add_time_moves_the_deadline_the_minigame_reads() -> void:
	var game := _started_game(30.0, [TIMER])
	game.get_hud(TIMER).add_time(10.0)
	# Not "30 plus a bonus the engine ignores": this is the clock that expires.
	assert_float(game.get_time_remaining()).is_greater(35.0)


func test_the_display_clock_is_what_ends_the_round() -> void:
	var game := _started_game(0.2, [TIMER])
	var results: Array = []
	game.minigame_completed.connect(func(success: bool, data: Dictionary):
		results.append([success, data.get("reason", "")])
	)
	for _i in range(180):
		await get_tree().process_frame
		if not results.is_empty():
			break
	assert_array(results).has_size(1)
	assert_bool(results[0][0]).is_false()
	assert_str(results[0][1]).is_equal("time_expired")


func test_pausing_stops_whichever_clock_owns_the_deadline() -> void:
	var game := _started_game(30.0, [TIMER])
	game.pause()
	var paused_at := game.get_time_remaining()
	await get_tree().process_frame
	await get_tree().process_frame
	assert_float(game.get_time_remaining()).is_equal_approx(paused_at, 0.001)
