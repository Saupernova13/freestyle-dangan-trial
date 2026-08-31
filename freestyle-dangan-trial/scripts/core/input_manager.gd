extends Node
## Centralized input detection, emitting semantic signals for the rest of the
## game. Anything the whole game reacts to belongs here as a signal rather than
## as another _input() handler; input scoped to one screen or minigame stays
## local (see mass_panic_debate.gd).

# Aim / shoot / focus (minigame inputs)
signal shoot_pressed(position: Vector2)
signal aim_moved(position: Vector2)
signal focus_started
signal focus_ended

# Bullet selector
signal bullet_next
signal bullet_prev
# R / middle-click / MobileHud's button. Weak points authored with
# useNegativeBullet can only be answered with lie mode on, so without a binding
# the editor could author content no player could ever clear.
signal lie_mode_toggle_requested

# Dialogue / script flow
signal advance_pressed                # SPACE / ENTER / center-tap on dialogue
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
	# Auto-repeat would advance the script once per repeat while a key is held.
	if event.is_echo():
		return
	# CTRL is fast-forward / skip.
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
		KEY_ESCAPE:
			settings_toggle_requested.emit()
		KEY_Q:
			bullet_prev.emit()
		KEY_E:
			bullet_next.emit()
		KEY_R:
			lie_mode_toggle_requested.emit()
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
			MOUSE_BUTTON_MIDDLE:
				lie_mode_toggle_requested.emit()
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
		# The wide band shoots; the narrow centre also advances, so touch users
		# can step through dialogue.
		if event.position.x > vp.x * 0.15 and event.position.x < vp.x * 0.85:
			shoot_pressed.emit(event.position)
		if event.position.x > vp.x / 3.0 and event.position.x < vp.x * 2.0 / 3.0:
			advance_pressed.emit()
	else:
		_set_focus(false)

## Lets MobileHud drive focus mode down the same path as right-click or F.
func toggle_focus() -> void:
	set_focus(not is_focus_active)

func set_focus(active: bool) -> void:
	if active == is_focus_active:
		return
	is_focus_active = active
	if active:
		focus_started.emit()
	else:
		focus_ended.emit()

func _toggle_focus() -> void:
	toggle_focus()

func _set_focus(active: bool) -> void:
	set_focus(active)

func is_desktop() -> bool:
	return _is_desktop

## The OS delivers no key-up or button-up once the window loses focus, so held
## state would survive an alt-tab: CTRL would leave the trial fast-forwarding
## with no way to stop it short of pressing and releasing CTRL again.
func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		_release_held_state()

## Only CTRL is released here. Focus is also reachable from the F toggle and
## MobileHud, where staying on across an alt-tab is the correct behaviour, and
## the flag does not record which of the two set it.
func _release_held_state() -> void:
	if _skip_held:
		_skip_held = false
		skip_held_changed.emit(false)
