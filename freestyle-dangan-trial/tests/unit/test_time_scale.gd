extends GdUnitTestSuite
## Engine.time_scale had four uncoordinated writers, all assigning absolutely.
## Whichever released last won, and a listener freed mid-hold never released at
## all - which left the whole trial running at 0.3.


func after_test() -> void:
	TimeScale.release_all()


func test_the_slowest_request_wins() -> void:
	TimeScale.request(&"focus", 0.3)
	assert_float(Engine.time_scale).is_equal_approx(0.3, 0.0001)

	# An impact frame during focus mode must still read as an impact.
	TimeScale.request(&"impact", 0.1)
	assert_float(Engine.time_scale).is_equal_approx(0.1, 0.0001)


func test_releasing_one_holder_leaves_the_others_in_force() -> void:
	# The exact bug behind the second half of the report: holding Shift for
	# slow-time and then clicking and releasing right-mouse used to snap the
	# scale back to 1.0 while ConcentrateGauge kept draining, so the player
	# burned the focus meter and got nothing for it.
	TimeScale.request(&"slow_time", 0.4)
	TimeScale.request(&"focus", 0.3)
	TimeScale.release(&"focus")
	assert_float(Engine.time_scale).is_equal_approx(0.4, 0.0001)

	TimeScale.release(&"slow_time")
	assert_float(Engine.time_scale).is_equal_approx(1.0, 0.0001)


func test_releasing_a_key_nobody_holds_is_harmless() -> void:
	# Teardown releases unconditionally rather than tracking whether it ever
	# held a request, so this has to be a no-op.
	TimeScale.release(&"never_requested")
	assert_float(Engine.time_scale).is_equal_approx(1.0, 0.0001)


func test_release_all_recovers_from_holders_that_were_freed() -> void:
	TimeScale.request(&"focus", 0.3)
	TimeScale.request(&"slow_time", 0.4)
	TimeScale.release_all()
	assert_float(Engine.time_scale).is_equal_approx(1.0, 0.0001)
