extends GdUnitTestSuite
## Determinism guarantees of the session-seeded RNG (GameRandom autoload).


func after_test() -> void:
	# Leave the autoload with a fresh random seed so test order can't matter.
	GameRandom.reseed(RandomNumberGenerator.new().randi())


func _sequence(rng: RandomNumberGenerator, count: int = 5) -> Array:
	var out := []
	for i in range(count):
		out.append(rng.randi())
	return out


func test_same_seed_reproduces_stream_sequences() -> void:
	GameRandom.reseed(42)
	var first_a := _sequence(GameRandom.stream("debate"))
	var first_b := _sequence(GameRandom.stream("debate"))

	GameRandom.reseed(42)
	assert_array(_sequence(GameRandom.stream("debate"))).is_equal(first_a)
	assert_array(_sequence(GameRandom.stream("debate"))).is_equal(first_b)


func test_repeated_stream_calls_differ() -> void:
	GameRandom.reseed(42)
	var first := _sequence(GameRandom.stream("debate"))
	var second := _sequence(GameRandom.stream("debate"))
	assert_array(second).is_not_equal(first)


func test_labels_are_independent_streams() -> void:
	GameRandom.reseed(42)
	var debate := _sequence(GameRandom.stream("debate"))
	GameRandom.reseed(42)
	var hangman := _sequence(GameRandom.stream("hangman"))
	assert_array(hangman).is_not_equal(debate)


func test_session_stream_is_stable_within_a_session() -> void:
	GameRandom.reseed(42)
	var first := _sequence(GameRandom.session_stream("vfx"))
	var second := _sequence(GameRandom.session_stream("vfx"))
	assert_array(second).is_equal(first)


func test_shuffle_with_is_deterministic() -> void:
	var rng_a := RandomNumberGenerator.new()
	rng_a.seed = 1234
	var rng_b := RandomNumberGenerator.new()
	rng_b.seed = 1234

	var array_a := [1, 2, 3, 4, 5, 6, 7, 8]
	var array_b := [1, 2, 3, 4, 5, 6, 7, 8]
	GameRandom.shuffle_with(array_a, rng_a)
	GameRandom.shuffle_with(array_b, rng_b)

	assert_array(array_a).is_equal(array_b)
	assert_array(array_a).contains_exactly_in_any_order([1, 2, 3, 4, 5, 6, 7, 8])
