extends GdUnitTestSuite
## The depletion signals fired on every hit at zero, not on the transition to
## it. TrialRoomManager wires influence_depleted straight to _on_game_over,
## which instantiates a fresh game_over_screen each time - so two hits in one
## frame stacked two screens, and the player dismissed one to find another
## behind it.


func _count(signal_ref: Signal) -> Array[int]:
	var hits: Array[int] = [0]
	signal_ref.connect(func() -> void: hits[0] += 1)
	return hits


func after_test() -> void:
	InfluenceGauge.reset()
	ConcentrateGauge.reset()


func test_influence_depleted_fires_once_however_many_hits_land() -> void:
	InfluenceGauge.reset(100.0)
	var hits := _count(InfluenceGauge.influence_depleted)

	InfluenceGauge.take_damage_raw(100.0)
	assert_int(hits[0]).is_equal(1)

	# MinigameBase._on_wrong_answer damages without ending the minigame, and
	# two of the minigames damage without finishing at all, so further hits
	# stay possible in the window before cleanup.
	InfluenceGauge.take_damage_raw(20.0)
	InfluenceGauge.take_damage_raw(20.0)
	assert_int(hits[0]).is_equal(1)


func test_influence_depleted_fires_again_after_a_reset() -> void:
	InfluenceGauge.reset(100.0)
	var hits := _count(InfluenceGauge.influence_depleted)
	InfluenceGauge.take_damage_raw(100.0)

	# A retry starts a fresh trial, and the next defeat is a real one.
	InfluenceGauge.reset(100.0)
	InfluenceGauge.take_damage_raw(100.0)
	assert_int(hits[0]).is_equal(2)


func test_influence_still_clamps_at_zero() -> void:
	InfluenceGauge.reset(50.0)
	InfluenceGauge.take_damage_raw(80.0)
	assert_float(InfluenceGauge.current_influence).is_equal(0.0)


func test_a_hit_that_does_not_empty_the_gauge_stays_quiet() -> void:
	InfluenceGauge.reset(100.0)
	var hits := _count(InfluenceGauge.influence_depleted)
	InfluenceGauge.take_damage_raw(30.0)
	assert_int(hits[0]).is_equal(0)


func test_concentrate_empty_fires_once_while_slow_time_is_held() -> void:
	ConcentrateGauge.reset(100.0)
	var hits := _count(ConcentrateGauge.concentrate_empty)

	# drain() is called every frame the player holds slow-time.
	for _i in range(200):
		ConcentrateGauge.drain(0.1)

	assert_int(hits[0]).is_equal(1)
	assert_float(ConcentrateGauge.current_concentrate).is_equal(0.0)


func test_concentrate_drain_still_reports_when_it_is_spent() -> void:
	ConcentrateGauge.reset(100.0)
	assert_bool(ConcentrateGauge.drain(0.1)).is_true()
	for _i in range(200):
		ConcentrateGauge.drain(0.1)
	assert_bool(ConcentrateGauge.drain(0.1)).is_false()
