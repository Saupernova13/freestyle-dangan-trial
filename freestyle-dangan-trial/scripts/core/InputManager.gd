extends Node
##
## Centralized input detection. Emits semantic signals that game systems
## (ScriptDirector, minigames, HUD) react to. Avoid adding _input() handlers
## in other scripts — extend this autoload with a new signal instead.

# Aim / shoot / focus (minigame inputs)
signal shoot_pressed(position: Vector2)
signal aim_moved(position: Vector2)
signal focus_started
signal focus_ended

# Bullet selector
signal bullet_next
signal bullet_prev

# Dialogue / script flow
signal advance_pressed                # SPACE / ENTER / center-tap on dialogue
signal confirm_pressed                # SPACE / ENTER outside dialogue
signal pause_pressed                  # legacy alias for settings_toggle_requested
signal settings_toggle_requested      # ESC
signal skip_held_changed(held: bool)  # CTRL held → fast-forward mode

var cursor_position: Vector2 = Vector2.ZERO
var is_focus_active: bool = false

var _is_desktop: bool = true
var _skip_held: bool = false

func _ready():
	_is_desktop = not OS.has_feature("mobile")

func _input(event):
	_handle_motion(event)
	_handle_keyboard(event)
	_handle_mouse_buttons(event)
	_handle_touch(event)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
func _handle_motion(event: InputEvent) -> void:
	if event is InputEventMouseMotion or event is InputEventScreenDrag:
		cursor_position = event.position
		aim_moved.emit(cursor_position)

func _handle_keyboard(event: InputEvent) -> void:
	if not (event is InputEventKey):
		return
	# CTRL modifier — fast-forward / skip.
	if event.keycode == KEY_CTRL:
		var pressed: bool = event.pressed
		if pressed != _skip_held:
			_skip_held = pressed
			skip_held_changed.emit(_skip_held)
		return

	if not event.pressed:
		return

	match event.keycode:
		KEY_SPACE, KEY_ENTER:
			advance_pressed.emit()
			confirm_pressed.emit()
		KEY_ESCAPE:
			pause_pressed.emit()
			settings_toggle_requested.emit()
		KEY_Q:
			bullet_prev.emit()
		KEY_E:
			bullet_next.emit()
		KEY_F:
			_toggle_focus()

func _handle_mouse_buttons(event: InputEvent) -> void:
	if not (event is InputEventMouseButton):
		return

	if event.pressed:
		match event.button_index:
			MOUSE_BUTTON_LEFT:
				shoot_pressed.emit(event.position)
			MOUSE_BUTTON_RIGHT:
				_set_focus(true)
			MOUSE_BUTTON_WHEEL_UP:
				bullet_prev.emit()
			MOUSE_BUTTON_WHEEL_DOWN:
				bullet_next.emit()
	else:
		if event.button_index == MOUSE_BUTTON_RIGHT:
			_set_focus(false)

func _handle_touch(event: InputEvent) -> void:
	if not (event is InputEventScreenTouch):
		return
	if event.pressed:
		cursor_position = event.position
		var vp = get_viewport().get_visible_rect().size
		# Wide horizontal band → minigame shoot. Narrow center band also fires
		# advance_pressed so touch users can step through dialogue.
		if event.position.x > vp.x * 0.15 and event.position.x < vp.x * 0.85:
			shoot_pressed.emit(event.position)
		if event.position.x > vp.x / 3.0 and event.position.x < vp.x * 2.0 / 3.0:
			advance_pressed.emit()
	else:
		_set_focus(false)

func _toggle_focus() -> void:
	_set_focus(not is_focus_active)

func _set_focus(active: bool) -> void:
	if active == is_focus_active:
		return
	is_focus_active = active
	if active:
		focus_started.emit()
	else:
		focus_ended.emit()

# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------
func is_desktop() -> bool:
	return _is_desktop

func is_skip_held() -> bool:
	return _skip_held
