extends Camera3D
## Focuses the camera on one trial bench at a time.
## Arrow keys / left-right screen thirds navigate; drag free-looks and springs
## back on release. jump_to_bench() lets the script and minigames aim it.

@export_range(0.1, 2.0, 0.1) var transition_duration: float = 0.2
@export var enable_swipe_input: bool = true

## Field of view. Lower = zoomed in, higher = wide.
@export_range(30.0, 120.0, 1.0) var camera_fov: float = 30.0
@export_range(-45.0, 45.0, 1.0) var default_pitch_offset: float = 0.0
@export_range(-45.0, 45.0, 1.0) var default_yaw_offset: float = 0.0

@export var enable_free_look: bool = true
@export_range(0.0001, 0.01, 0.0001) var free_look_sensitivity: float = 0.002
@export_range(0.1, 1.0, 0.05) var free_look_max_offset: float = 0.3
@export_range(1.0, 20.0, 0.5) var free_look_return_speed: float = 5.0

@export_range(0.1, 1.0, 0.05) var hold_repeat_initial_delay: float = 0.4
@export_range(0.05, 0.5, 0.05) var hold_repeat_interval: float = 0.15

var bench_markers: Array[Marker3D] = []
# Player-navigable bench count. The Monokuma bench is appended AFTER this count,
# so script lines and minigame focus can reach it via jump_to_bench() while
# navigate_to_next/previous wrap within the first _nav_count and never land on it.
var _nav_count: int = 0
var current_index: int = 0
var is_transitioning: bool = false
var camera_tween: Tween

var is_dragging: bool = false
var drag_start_position: Vector2 = Vector2.ZERO
var current_free_look_offset: Vector2 = Vector2.ZERO  # x=yaw, y=pitch
var target_rotation: Quaternion = Quaternion.IDENTITY

var mouse_button_pressed: bool = false
var active_touch_index: int = -1
var touch_start_time: float = 0.0
var touch_moved: bool = false

var hold_direction: int = 0  # -1 = left/next, 1 = right/previous, 0 = none
var hold_start_time: float = 0.0
var last_repeat_time: float = 0.0
var is_holding_touch: bool = false

func _ready():
	var trial_benches = get_node_or_null("../TrialRoom/Trial_Posts/Trial_Benches")
	if not trial_benches:
		push_error("Trial_Benches node not found! Check scene structure.")
		push_error("Camera is at: " + str(get_path()))
		return

	for i in range(1, 17):
		var marker_name = "Bench_Marker3D_%03d" % i
		var marker = trial_benches.get_node_or_null(marker_name)
		if marker:
			bench_markers.append(marker)
		else:
			push_warning("Bench marker not found: " + marker_name)

	_nav_count = bench_markers.size()

	var monokuma_marker = trial_benches.get_node_or_null("Bench_Marker3D_017_Monokuma")
	if monokuma_marker:
		bench_markers.append(monokuma_marker)
	else:
		push_warning("Bench marker not found: Bench_Marker3D_017_Monokuma")

	if bench_markers.is_empty():
		push_error("No bench markers found! Cannot initialize camera controller.")
		return

	print("Bench Focus Camera initialized with %d markers" % bench_markers.size())
	focus_on_bench(0, false)

func _is_nav_blocked() -> bool:
	var s = ScriptDirector.current_state
	return s == ScriptDirector.State.DIALOGUE \
		or s == ScriptDirector.State.WAITING_FOR_ADVANCE \
		or s == ScriptDirector.State.MINIGAME_ACTIVE

func _is_free_look_blocked() -> bool:
	return ScriptDirector.current_state == ScriptDirector.State.MINIGAME_ACTIVE

func _process(delta):
	if not is_transitioning and not _is_nav_blocked():
		var current_hold_direction = 0
		if Input.get_action_strength("ui_left") > 0.5:
			current_hold_direction = -1
		elif Input.get_action_strength("ui_right") > 0.5:
			current_hold_direction = 1
		elif is_holding_touch:
			current_hold_direction = hold_direction

		if current_hold_direction != hold_direction:
			hold_direction = current_hold_direction
			hold_start_time = Time.get_ticks_msec() / 1000.0
			last_repeat_time = hold_start_time

		if hold_direction != 0:
			var current_time = Time.get_ticks_msec() / 1000.0
			if current_time - hold_start_time >= hold_repeat_initial_delay:
				if current_time - last_repeat_time >= hold_repeat_interval:
					if hold_direction == -1:
						navigate_to_next()
					elif hold_direction == 1:
						navigate_to_previous()
					last_repeat_time = current_time

	if is_transitioning:
		return

	# Spring the free-look offset back to zero, snapping once it's negligible.
	if not is_dragging and current_free_look_offset != Vector2.ZERO:
		current_free_look_offset = current_free_look_offset.lerp(Vector2.ZERO, free_look_return_speed * delta)
		if current_free_look_offset.length() > 0.001:
			apply_free_look_offset()
		else:
			current_free_look_offset = Vector2.ZERO
			quaternion = target_rotation

func apply_free_look_offset():
	if target_rotation == Quaternion.IDENTITY:
		return

	var euler = target_rotation.get_euler()
	var clamped_offset = Vector2(
		clamp(current_free_look_offset.x, -free_look_max_offset, free_look_max_offset),
		clamp(current_free_look_offset.y, -free_look_max_offset, free_look_max_offset)
	)
	euler.y += clamped_offset.x
	euler.x += clamped_offset.y
	quaternion = Quaternion.from_euler(euler)

func _input(event):
	if is_transitioning:
		return

	if not _is_nav_blocked():
		if event.is_action_pressed("ui_right"):
			navigate_to_previous()
			get_viewport().set_input_as_handled()
		elif event.is_action_pressed("ui_left"):
			navigate_to_next()
			get_viewport().set_input_as_handled()

	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				if not _is_free_look_blocked():
					mouse_button_pressed = true
					is_dragging = true
					drag_start_position = event.position
			else:
				mouse_button_pressed = false
				is_dragging = false

	elif event is InputEventMouseMotion and mouse_button_pressed and enable_free_look and not is_transitioning and not _is_free_look_blocked():
		# Offsets invert the drag delta so the view follows the finger/cursor.
		current_free_look_offset.x -= event.relative.x * free_look_sensitivity
		current_free_look_offset.y -= event.relative.y * free_look_sensitivity
		apply_free_look_offset()

	if enable_swipe_input:
		if event is InputEventScreenTouch:
			if event.pressed and active_touch_index == -1:
				active_touch_index = event.index
				drag_start_position = event.position
				touch_start_time = Time.get_ticks_msec() / 1000.0
				touch_moved = false
				is_dragging = true

				# Left / right screen thirds are the navigation zones.
				if not _is_nav_blocked():
					var viewport_width = get_viewport().get_visible_rect().size.x
					var tap_x = event.position.x
					if tap_x < viewport_width / 3.0:
						is_holding_touch = true
						hold_direction = -1
						navigate_to_next()
						get_viewport().set_input_as_handled()
					elif tap_x > (viewport_width * 2.0 / 3.0):
						is_holding_touch = true
						hold_direction = 1
						navigate_to_previous()
						get_viewport().set_input_as_handled()
			elif not event.pressed and event.index == active_touch_index:
				is_dragging = false
				is_holding_touch = false
				hold_direction = 0
				active_touch_index = -1

		elif event is InputEventScreenDrag and event.index == active_touch_index and enable_free_look and not is_transitioning and not _is_free_look_blocked():
			touch_moved = true
			# A real drag cancels the hold-to-repeat that a tap in a nav zone started.
			if is_holding_touch and event.relative.length() > 10.0:
				is_holding_touch = false
				hold_direction = 0

			current_free_look_offset.x -= event.relative.x * free_look_sensitivity
			current_free_look_offset.y -= event.relative.y * free_look_sensitivity
			apply_free_look_offset()

func navigate_to_next():
	if _nav_count <= 0:
		return
	current_index = (current_index + 1) % _nav_count
	focus_on_bench(current_index, true)

func navigate_to_previous():
	if _nav_count <= 0:
		return
	current_index = (current_index - 1 + _nav_count) % _nav_count
	focus_on_bench(current_index, true)

## Point the camera at bench `index` (0-based), tweening the rotation unless
## `animate` is false. Notifies TrialRoom so the focused speaker's name/portrait
## update during free navigation.
func focus_on_bench(index: int, animate: bool):
	if index < 0 or index >= bench_markers.size():
		push_warning("Invalid bench index: %d" % index)
		return

	current_free_look_offset = Vector2.ZERO
	global_position = Vector3(0, 0.275, 0)
	fov = camera_fov

	var target_marker = bench_markers[index]
	var look_transform = global_transform.looking_at(target_marker.global_transform.origin, Vector3.UP)
	target_rotation = look_transform.basis.get_rotation_quaternion()

	var euler = target_rotation.get_euler()
	euler.x += deg_to_rad(default_pitch_offset)
	euler.y += deg_to_rad(default_yaw_offset)
	target_rotation = Quaternion.from_euler(euler)

	if animate:
		is_transitioning = true
		if camera_tween:
			camera_tween.kill()
		camera_tween = create_tween()
		camera_tween.set_ease(Tween.EASE_IN_OUT)
		camera_tween.set_trans(Tween.TRANS_CUBIC)
		camera_tween.tween_property(self, "quaternion", target_rotation, transition_duration)
		camera_tween.finished.connect(func(): is_transitioning = false)
	else:
		quaternion = target_rotation
		is_transitioning = false

	print("Focused on bench %d: %s" % [index + 1, target_marker.name])

	var trial_manager = get_node_or_null("../TrialRoom")
	if trial_manager and trial_manager.has_method("on_bench_focused"):
		trial_manager.on_bench_focused(index)

## Jump directly to bench `index` (0-based; 16 = Monokuma).
func jump_to_bench(index: int, animate: bool = true):
	if index >= 0 and index < bench_markers.size():
		current_index = index
		focus_on_bench(current_index, animate)
