extends GdUnitTestSuite
## MinigameBase's two shared guarantees, both of which break the trial rather
## than the minigame when they fail.


class ProbeSignal:
	extends Node
	signal fired


func _game() -> MinigameBase:
	var game: MinigameBase = auto_free(MinigameBase.new())
	game.initialize(MinigameData.from_dict({"gameId": "mg_p", "gameType": "nonstop_debate"}))
	add_child(game)
	return game


func test_finish_reports_once_however_many_times_it_is_called() -> void:
	# Two paths can race to end a minigame - a correct hit and the timer, or
	# influence depletion and a wrong answer. A second minigame_completed
	# advances the script a second time, skipping the line after the minigame.
	var game := _game()
	var results: Array = []
	game.minigame_completed.connect(
		func(success: bool, _data: Dictionary) -> void: results.append(success)
	)

	game._finish(true, {})
	game._finish(false, {"reason": "time_expired"})
	game._on_time_expired()

	assert_array(results).is_equal([true])


func test_the_first_result_is_the_one_that_counts() -> void:
	var game := _game()
	var results: Array = []
	game.minigame_completed.connect(
		func(success: bool, _data: Dictionary) -> void: results.append(success)
	)
	game._finish(false, {"reason": "influence_depleted"})
	game._finish(true, {})
	assert_array(results).is_equal([false])


func test_a_fail_result_carries_the_authored_fail_comment() -> void:
	var game: MinigameBase = auto_free(MinigameBase.new())
	game.initialize(
		MinigameData.from_dict({"gameId": "mg_p", "failComment": "You missed it."})
	)
	add_child(game)
	var seen: Array = []
	game.minigame_completed.connect(
		func(_success: bool, data: Dictionary) -> void: seen.append(data)
	)
	game._finish(false, {"reason": "time_expired"})
	assert_str(seen[0].get("failComment", "")).is_equal("You missed it.")


func test_cleanup_disconnects_every_managed_connection() -> void:
	# A minigame is rebuilt for each attempt, but the autoloads it connects to
	# outlive it. A handler left connected fires on a freed instance next
	# attempt, so the retry breaks rather than the attempt that leaked it.
	var game := _game()
	var source: ProbeSignal = auto_free(ProbeSignal.new())
	add_child(source)
	var calls: Array = []
	var handler := func() -> void: calls.append(true)

	game.connect_managed(source.fired, handler)
	source.fired.emit()
	assert_int(calls.size()).is_equal(1)

	game.cleanup()
	assert_bool(source.fired.is_connected(handler)).is_false()
	source.fired.emit()
	assert_int(calls.size()).is_equal(1)


func test_connecting_the_same_handler_twice_still_disconnects() -> void:
	# connect_managed skips a duplicate connect but records the pair either
	# way, so cleanup must not disconnect something already disconnected.
	var game := _game()
	var source: ProbeSignal = auto_free(ProbeSignal.new())
	add_child(source)
	var handler := func() -> void: pass

	game.connect_managed(source.fired, handler)
	game.connect_managed(source.fired, handler)
	game.cleanup()
	assert_bool(source.fired.is_connected(handler)).is_false()
