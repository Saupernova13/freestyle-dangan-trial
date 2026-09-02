extends GdUnitTestSuite
## BulletProjectile.missed had no listener, and the miss path queue_free()s
## while the hit path awaits an animation. Panels scroll, so a shot fired at
## one near the screen edge can leave the viewport before it arrives - and
## that shot resolved to nothing at all: a correct answer scored as neither
## right nor wrong, with the projectile disappearing silently.


func _projectile() -> BulletProjectile:
	var node: BulletProjectile = auto_free(ResourceRegistry.instantiate("bullet_projectile"))
	add_child(node)
	await await_idle_frame()
	return node


func test_a_bullet_that_reaches_its_target_reports_a_hit() -> void:
	var projectile := await _projectile()
	# Counted into Arrays: a GDScript lambda captures a local by value, so
	# `hits += 1` inside one increments a copy and the test passes either way.
	var hits: Array = []
	var misses: Array = []
	projectile.hit_target.connect(func() -> void: hits.append(true))
	projectile.missed.connect(func() -> void: misses.append(true))

	# Fired at a point it starts inside, so the first tick is already a hit.
	projectile.fire(Vector2(100, 100), Vector2(110, 100))
	projectile._process(0.016)

	assert_int(hits.size()).is_equal(1)
	assert_int(misses.size()).is_equal(0)


func test_a_bullet_that_leaves_the_screen_reports_a_miss() -> void:
	var projectile := await _projectile()
	var misses: Array = []
	projectile.missed.connect(func() -> void: misses.append(true))

	# Aimed off-screen, so it flies past everything and exits.
	projectile.fire(Vector2(100, 100), Vector2(-10000, 100))
	projectile._process(1.0)

	assert_int(misses.size()).override_failure_message(
		"a bullet that left the screen reported nothing; the shot resolves to nothing"
	).is_equal(1)


func test_a_shot_resolves_exactly_once() -> void:
	# Both signals run the same handler now, so a projectile that somehow
	# emitted both would score the panel twice.
	var projectile := await _projectile()
	var resolved: Array = []
	var resolve := func() -> void: resolved.append(true)
	projectile.hit_target.connect(resolve)
	projectile.missed.connect(resolve)

	projectile.fire(Vector2(100, 100), Vector2(-10000, 100))
	projectile._process(1.0)
	# _is_moving is cleared on either branch, so further ticks are inert.
	projectile._process(1.0)
	projectile._process(1.0)

	assert_int(resolved.size()).is_equal(1)


func test_nonstop_debate_acts_on_a_miss_as_well_as_a_hit() -> void:
	# The connection itself, not just the signal: a projectile with no `missed`
	# listener is the defect.
	var source := FileAccess.get_file_as_string("res://scripts/minigames/nonstop_debate.gd")
	assert_str(source).contains("projectile.missed.connect")
