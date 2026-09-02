extends GdUnitTestSuite
## A skipped line used to advance by calling advance_to_next_line from inside
## itself, so recursion depth equalled the length of the run. TrialValidator
## deliberately lets unknown line types through with only a warning, and
## check_version deliberately accepts a newer minor - so this input is
## permitted by design and the engine has to survive it.

## Above Godot's default debug/settings/gdscript/max_call_stack of 1024, so a
## recursive skip exceeds the limit rather than sitting just under it.
const UNKNOWN_RUN := 2000


func _lines_from(dicts: Array) -> Array[ScriptLine]:
	var lines: Array[ScriptLine] = []
	for d in dicts:
		lines.append(ScriptLine.from_dict(d))
	return lines


## Drives ScriptDirector directly; start_trial() would need a whole trial.
func _play(dicts: Array) -> void:
	ScriptDirector.script_lines = _lines_from(dicts)
	ScriptDirector.current_line_index = -1
	ScriptDirector.advance_to_next_line()


func after_test() -> void:
	ScriptDirector.script_lines = []
	ScriptDirector.current_line_index = -1
	ScriptDirector._transition_to(ScriptDirector.State.IDLE)


func test_a_long_run_of_unknown_types_is_stepped_over() -> void:
	var dicts: Array = []
	for i in range(UNKNOWN_RUN):
		dicts.append({"id": "u%d" % i, "type": "hologram"})
	dicts.append({"id": "n1", "type": "narrator", "text": "Reached."})

	_play(dicts)

	# Recursing once per line used to overflow the stack well before here.
	assert_int(ScriptDirector.current_line_index).is_equal(UNKNOWN_RUN)
	assert_int(ScriptDirector.current_state).is_equal(ScriptDirector.State.WAITING_FOR_ADVANCE)


func test_a_script_of_nothing_but_unknown_types_ends_the_trial() -> void:
	var dicts: Array = []
	for i in range(UNKNOWN_RUN):
		dicts.append({"id": "u%d" % i, "type": "hologram"})

	_play(dicts)

	assert_int(ScriptDirector.current_state).is_equal(ScriptDirector.State.TRIAL_COMPLETE)


func test_a_minigame_line_with_no_id_is_skipped_not_recursed() -> void:
	# A handful, not a thousand: this handler warns per line, and the depth
	# property is already pinned by the unknown-type case above - both go
	# through the same loop.
	var dicts: Array = []
	for i in range(5):
		dicts.append({"id": "m%d" % i, "type": "minigame", "minigameId": ""})
	dicts.append({"id": "n1", "type": "narrator", "text": "Reached."})

	_play(dicts)

	assert_int(ScriptDirector.current_line_index).is_equal(5)
	assert_int(ScriptDirector.current_state).is_equal(ScriptDirector.State.WAITING_FOR_ADVANCE)


func test_a_playable_line_still_stops_the_walk() -> void:
	_play([
		{"id": "n1", "type": "narrator", "text": "First."},
		{"id": "n2", "type": "narrator", "text": "Second."},
	])

	assert_int(ScriptDirector.current_line_index).is_equal(0)


func test_line_started_still_fires_for_a_skipped_line() -> void:
	# Listeners key their per-line effects off this, and skipping quietly is
	# not the same as never mentioning the line.
	var seen: Array[String] = []
	var on_started := func(line: ScriptLine) -> void: seen.append(line.id)
	ScriptDirector.line_started.connect(on_started)
	_play([
		{"id": "u1", "type": "hologram"},
		{"id": "n1", "type": "narrator", "text": "Reached."},
	])
	ScriptDirector.line_started.disconnect(on_started)

	assert_array(seen).is_equal(["u1", "n1"])
