extends Node

signal advance_pressed
signal shoot_pressed(position: Vector2)
signal aim_moved(position: Vector2)
signal bullet_next
signal bullet_prev
signal focus_started
signal focus_ended
signal pause_pressed
signal confirm_pressed

var cursor_position: Vector2 = Vector2.ZERO
var is_focus_active: bool = false

var _is_desktop: bool = true

func _ready():
	_is_desktop = not OS.has_feature("mobile")

func _input(event):
	# Cursor / aim tracking
	if event is InputEventMouseMotion:
		cursor_position = event.position
		aim_moved.emit(cursor_position)
	elif event is InputEventScreenDrag:
		cursor_position = event.position
		aim_moved.emit(cursor_position)

	# Advance dialogue
	if event is InputEventKey and event.pressed:
		match event.keycode:
			KEY_SPACE, KEY_ENTER:
				advance_pressed.emit()
				confirm_pressed.emit()
			KEY_ESCAPE:
				pause_pressed.emit()

	# Shooting (left click / tap)
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT:
			shoot_pressed.emit(event.position)
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			if not is_focus_active:
				is_focus_active = true
				focus_started.emit()

	if event is InputEventMouseButton and not event.pressed:
		if event.button_index == MOUSE_BUTTON_RIGHT:
			if is_focus_active:
				is_focus_active = false
				focus_ended.emit()

	# Touch input for shooting
	if event is InputEventScreenTouch:
		if event.pressed:
			cursor_position = event.position
			# Center tap = advance, off-center = shoot (during minigames)
			var vp = get_viewport().get_visible_rect().size
			if event.position.x > vp.x * 0.15 and event.position.x < vp.x * 0.85:
				shoot_pressed.emit(event.position)
		else:
			if is_focus_active:
				is_focus_active = false
				focus_ended.emit()

	# Bullet cycling (scroll wheel or Q/E keys)
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			bullet_prev.emit()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			bullet_next.emit()

	if event is InputEventKey and event.pressed:
		match event.keycode:
			KEY_Q:
				bullet_prev.emit()
			KEY_E:
				bullet_next.emit()
			KEY_F:
				if not is_focus_active:
					is_focus_active = true
					focus_started.emit()
				else:
					is_focus_active = false
					focus_ended.emit()

func is_desktop() -> bool:
	return _is_desktop
