extends GdUnitTestSuite
## FloatingLetter freed itself on drifting off screen and declared no exit
## signal, so Hangman's Gambit's list only ever grew: entries were removed on a
## click or a collision, never on an exit. Its per-frame pair scan then walked
## every freed reference - about 4,000 checks a frame by the end of a 90s hard
## round, nearly all of them misses.


func _letter() -> FloatingLetter:
	var letter: FloatingLetter = ResourceRegistry.instantiate("floating_letter")
	letter.letter = "A"
	add_child(letter)
	return letter


func test_it_announces_leaving_the_screen() -> void:
	var letter := _letter()
	var exits: Array = []
	letter.exited_screen.connect(func(node: FloatingLetter) -> void: exits.append(node))

	letter.position = Vector2(-500, 100)
	letter.velocity = Vector2(-100, 0)
	letter._process(0.1)

	assert_array(exits).is_equal([letter])


func test_it_announces_leaving_only_once() -> void:
	# _process runs again before queue_free takes effect.
	var letter := _letter()
	var exits: Array = []
	letter.exited_screen.connect(func(node: FloatingLetter) -> void: exits.append(node))

	letter.position = Vector2(-500, 100)
	letter._process(0.1)
	letter._process(0.1)

	assert_int(exits.size()).is_equal(1)


func test_a_letter_on_screen_stays_quiet() -> void:
	var letter := _letter()
	var exits: Array = []
	letter.exited_screen.connect(func(node: FloatingLetter) -> void: exits.append(node))

	letter.position = Vector2(100, 100)
	letter.velocity = Vector2(10, 0)
	letter._process(0.1)

	assert_array(exits).is_empty()
	assert_bool(letter.is_queued_for_deletion()).is_false()


func test_the_signal_matches_the_one_the_debates_already_use() -> void:
	# DebateTextPanel declares panel_exited_screen and both debates prune on
	# it; Hangman's was the one spawner that did not.
	var letter: FloatingLetter = auto_free(ResourceRegistry.instantiate("floating_letter"))
	assert_bool(letter.has_signal("exited_screen")).is_true()
