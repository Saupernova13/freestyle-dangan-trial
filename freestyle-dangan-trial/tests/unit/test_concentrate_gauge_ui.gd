extends GdUnitTestSuite
## drain() emits on every frame slow-time is held and refill() on every frame
## after, and the bar answered each emission with a fresh 0.2s Tween - roughly
## 60 Tween objects a second, about a dozen live at once, all animating the
## same property against each other.


func _gauge() -> CanvasLayer:
	var gauge: CanvasLayer = auto_free(ResourceRegistry.instantiate("concentrate_gauge"))
	add_child(gauge)
	return gauge


func test_the_bar_follows_the_value_without_allocating_a_tween() -> void:
	var gauge := _gauge()

	gauge._on_concentrate_changed(50.0, 100.0)

	assert_float(gauge._bar_fill.offset_right).is_equal_approx(gauge.bar_width * 0.5, 0.01)
	assert_array(gauge.get_tree().get_processed_tweens()).is_empty()


func test_a_frame_of_draining_does_not_leave_tweens_behind() -> void:
	var gauge := _gauge()

	# One second of holding slow-time, at 60fps.
	for i in range(60):
		gauge._on_concentrate_changed(100.0 - i, 100.0)

	assert_array(gauge.get_tree().get_processed_tweens()).is_empty()
	assert_float(gauge._bar_fill.offset_right).is_equal_approx(gauge.bar_width * 0.41, 0.01)


func test_an_empty_gauge_reads_zero() -> void:
	var gauge := _gauge()
	gauge._on_concentrate_changed(0.0, 100.0)
	assert_float(gauge._bar_fill.offset_right).is_equal(0.0)


func test_a_zero_maximum_does_not_divide_by_zero() -> void:
	var gauge := _gauge()
	gauge._on_concentrate_changed(0.0, 0.0)
	assert_float(gauge._bar_fill.offset_right).is_equal(0.0)


func test_the_tier_advances_even_without_an_animation_player() -> void:
	# _last_tier used to be set inside the `and _anim` branch, so a null
	# AnimationPlayer would have left the tier stuck and re-evaluated the same
	# transition forever.
	var gauge := _gauge()
	gauge._anim = null

	gauge._on_concentrate_changed(10.0, 100.0)
	assert_int(gauge._last_tier).is_equal(0)
	gauge._on_concentrate_changed(90.0, 100.0)
	assert_int(gauge._last_tier).is_equal(2)
