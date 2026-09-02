extends GdUnitTestSuite
## ScriptDirector is an autoload, so it survives reload_current_scene() and
## change_scene_to_file(). start_trial() reset the script and the line index and
## nothing else, so state from the previous run reached the next one.


func after_test() -> void:
	ScriptDirector.reset()
	ScriptDirector.script_lines = []


func _dirty_everything() -> void:
	ScriptDirector.is_typewriter_active = true
	ScriptDirector._active_minigame = auto_free(Node.new())
	ScriptDirector._settings_menu = auto_free(Node.new())
	ScriptDirector._auto_advance_timer = 4.2
	ScriptDirector._skip_held = true
	ScriptDirector._skip_timer = 1.5
	ScriptDirector._pause_depth = 2
	ScriptDirector._pre_pause_state = ScriptDirector.State.MINIGAME_ACTIVE
	ScriptDirector.current_line_index = 12


func test_reset_clears_every_transient_field() -> void:
	_dirty_everything()

	ScriptDirector.reset()

	# A player who died mid-typewriter retried with this still true, and their
	# first advance press was eaten as a typewriter skip.
	assert_bool(ScriptDirector.is_typewriter_active).is_false()
	# One who died holding CTRL kept fast-forwarding into the reloaded scene.
	assert_bool(ScriptDirector._skip_held).is_false()
	assert_float(ScriptDirector._skip_timer).is_equal(0.0)
	assert_float(ScriptDirector._auto_advance_timer).is_equal(0.0)
	assert_object(ScriptDirector._active_minigame).is_null()
	assert_object(ScriptDirector._settings_menu).is_null()
	assert_int(ScriptDirector._pause_depth).is_equal(0)
	assert_int(ScriptDirector._pre_pause_state).is_equal(ScriptDirector.State.IDLE)
	assert_int(ScriptDirector.current_line_index).is_equal(-1)
	assert_int(ScriptDirector.current_state).is_equal(ScriptDirector.State.IDLE)


func test_starting_a_trial_resets_first() -> void:
	# The retry path reloads the scene, and start_trial is what runs on the way
	# back in - so it has to be the thing that clears the previous run.
	_dirty_everything()

	ScriptDirector.start_trial()

	assert_bool(ScriptDirector.is_typewriter_active).is_false()
	assert_bool(ScriptDirector._skip_held).is_false()
	assert_object(ScriptDirector._active_minigame).is_null()


func test_reset_is_safe_to_call_twice() -> void:
	ScriptDirector.reset()
	ScriptDirector.reset()
	assert_int(ScriptDirector.current_state).is_equal(ScriptDirector.State.IDLE)
