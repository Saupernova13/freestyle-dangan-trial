extends GdUnitTestSuite
## The start menu's arrow keys used to move a glow that had nothing to do with
## focus, Enter only wrote a debug line, and set_input_as_handled() suppressed
## the GUI stage where Godot would have moved focus. Boot the game, never touch
## the mouse, and there was no way in.

const SELECTOR_SCRIPT := "res://scripts/tools/vbox_selector.gd"


func _menu(button_count: int) -> VBoxContainer:
	var box := VBoxContainer.new()
	box.set_script(load(SELECTOR_SCRIPT))
	for i in range(button_count):
		var button := Button.new()
		button.text = "Entry %d" % i
		button.custom_minimum_size = Vector2(200, 60)
		box.add_child(button)
	add_child(auto_free(box))
	return box


func test_the_first_entry_holds_focus_so_the_arrow_keys_have_somewhere_to_go() -> void:
	var box := _menu(2)
	await await_idle_frame()
	assert_bool(box.buttons[0].has_focus()).override_failure_message(
		"nothing had focus, so ui_up/ui_down have no starting point"
	).is_true()


func test_the_highlight_follows_focus_rather_than_a_private_index() -> void:
	var box := _menu(2)
	await await_idle_frame()
	assert_bool(box.buttons[0].material is ShaderMaterial).is_true()
	assert_object(box.buttons[1].material).is_null()

	# Whatever moves focus - Tab, the gamepad, a mouse click - moves the glow.
	box.buttons[1].grab_focus()
	await await_idle_frame()
	assert_object(box.buttons[0].material).is_null()
	assert_bool(box.buttons[1].material is ShaderMaterial).is_true()


func test_godots_own_navigation_reaches_the_next_entry() -> void:
	# find_valid_focus_neighbor is what ui_down resolves. It only finds a
	# neighbour that can take focus, which is why focus_mode is set explicitly.
	var box := _menu(3)
	await await_idle_frame()
	assert_bool(box.buttons[0].find_valid_focus_neighbor(SIDE_BOTTOM) == box.buttons[1]).is_true()
	assert_bool(box.buttons[1].find_valid_focus_neighbor(SIDE_BOTTOM) == box.buttons[2]).is_true()


func test_every_entry_can_take_focus() -> void:
	var box := _menu(2)
	await await_idle_frame()
	for button in box.buttons:
		assert_int(button.focus_mode).is_equal(Control.FOCUS_ALL)


func test_the_menu_no_longer_intercepts_input_ahead_of_the_gui_stage() -> void:
	# An _input() here runs before the GUI stage, so a set_input_as_handled()
	# in it silently disables ui_up/ui_down/ui_accept for the whole menu.
	var script: GDScript = load(SELECTOR_SCRIPT)
	var names: Array = script.get_script_method_list().map(
		func(entry: Dictionary) -> String: return entry["name"]
	)
	assert_bool(names.has("_input")).override_failure_message(
		"vbox_selector declares _input() again; focus navigation is suppressed"
	).is_false()


func test_a_menu_with_no_buttons_does_not_crash() -> void:
	# The old handler did `% buttons.size()` with no empty guard: one deleted
	# node away from a modulo by zero on every keypress.
	var box := _menu(0)
	await await_idle_frame()
	assert_array(box.buttons).is_empty()
