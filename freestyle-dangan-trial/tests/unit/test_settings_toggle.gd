extends GdUnitTestSuite
## ESC has to both open and close the settings menu. InputManager consumes the
## key during the _input stage, so the menu's own _unhandled_input could never
## see it - ScriptDirector's toggle is the only thing that can close it.


## The menu is parented to ScriptDirector and identified by its contract rather
## than its class, which the autoload also only knows duck-typed.
func _open_menus() -> Array[Node]:
	var found: Array[Node] = []
	for child in ScriptDirector.get_children():
		if child.has_signal("closed") and child.has_method("close"):
			found.append(child)
	return found


func after_test() -> void:
	for menu in _open_menus():
		menu.free()


func test_the_settings_toggle_opens_then_closes() -> void:
	InputManager.settings_toggle_requested.emit()
	await get_tree().process_frame
	assert_array(_open_menus()).has_size(1)

	InputManager.settings_toggle_requested.emit()
	# close() plays an animation before freeing itself, so this takes a few
	# frames. Bounded, so a regression fails rather than hangs.
	for _i in range(180):
		await get_tree().process_frame
		if _open_menus().is_empty():
			break
	assert_array(_open_menus()).is_empty()
