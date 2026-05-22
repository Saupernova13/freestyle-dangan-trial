extends Camera3D
## Bench Focus Camera Controller for Danganronpa Trial System
##
## Controls camera rotation to focus on trial bench markers one at a time.
##
## PC Controls:
## - LEFT/RIGHT arrow keys: Navigate between benches
## - Click and drag: Free-look (camera springs back on release)
##
## Mobile Controls:
## - Tap left third of screen: Navigate left
## - Tap right third of screen: Navigate right
## - Hold and drag: Free-look (camera springs back on release)

## Duration in seconds for smooth camera rotation transitions
@export_range(0.1, 2.0, 0.1) var transition_duration: float = 0.2

## Enable or disable swipe gesture input for touch devices
@export var enable_swipe_input: bool = true

## Minimum swipe distance in pixels to trigger navigation (prevents accidental taps)
@export_range(10.0, 200.0, 5.0) var swipe_threshold: float = 50.0

## Camera Field of View (zoom level)
## Lower values = Zoomed In (close-up)
## Higher values = Zoomed Out (wide angle)
## Suggested: 30-60 (close), 70 (normal), 80-90 (wide)
@export_range(30.0, 120.0, 1.0) var camera_fov: float = 30.0

## Default up/down tilt offset in degrees
@export_range(-45.0, 45.0, 1.0) var default_pitch_offset: float = 0.0

## Default left/right rotation offset in degrees
@export_range(-45.0, 45.0, 1.0) var default_yaw_offset: float = 0.0

## Enable or disable free-look camera drag
@export var enable_free_look: bool = true

## Mouse/touch drag sensitivity for camera offset
@export_range(0.0001, 0.01, 0.0001) var free_look_sensitivity: float = 0.002

## Maximum pitch/yaw offset in radians (~17 degrees)
@export_range(0.1, 1.0, 0.05) var free_look_max_offset: float = 0.3

## Speed of camera spring-back when drag released
@export_range(1.0, 20.0, 0.5) var free_look_return_speed: float = 5.0

## Minimum distance for navigation swipe (prevents free-look from triggering navigation)
@export_range(10.0, 200.0, 5.0) var swipe_distance_threshold: float = 50.0

## Initial delay before hold-to-repeat starts (in seconds)
@export_range(0.1, 1.0, 0.05) var hold_repeat_initial_delay: float = 0.4

## Time between repeats when holding (in seconds)
@export_range(0.05, 0.5, 0.05) var hold_repeat_interval: float = 0.15

# Internal variables
var bench_markers: Array[Marker3D] = []
var current_index: int = 0
var is_transitioning: bool = false
var camera_tween: Tween

# Free-look state variables
var is_dragging: bool = false
var drag_start_position: Vector2 = Vector2.ZERO
var current_free_look_offset: Vector2 = Vector2.ZERO  # x=yaw, y=pitch
var target_rotation: Quaternion = Quaternion.IDENTITY

# Input tracking
var mouse_button_pressed: bool = false
var active_touch_index: int = -1
var touch_start_time: float = 0.0
var touch_moved: bool = false

# Hold-to-repeat tracking
var hold_direction: int = 0  # -1 = left/next, 1 = right/previous, 0 = none
var hold_start_time: float = 0.0
var last_repeat_time: float = 0.0
var is_holding_touch: bool = false

func _ready():
	# Get reference to Trial_Benches parent node
	# Use relative path from Camera3D (sibling to TrialRoom)
	var trial_benches = get_node_or_null("../TrialRoom/Trial_Posts/Trial_Benches")

	if not trial_benches:
		push_error("Trial_Benches node not found! Check scene structure.")
		push_error("Camera is at: " + str(get_path()))
		return

	# Collect all bench markers in order (001-016, excluding Monokuma)
	for i in range(1, 17):
		var marker_name = "Bench_Marker3D_%03d" % i

		var marker = trial_benches.get_node_or_null(marker_name)
		if marker:
			bench_markers.append(marker)
		else:
			push_warning("Bench marker not found: " + marker_name)

	if bench_markers.is_empty():
		push_error("No bench markers found! Cannot initialize camera controller.")
		return

	print("Bench Focus Camera initialized with %d markers" % bench_markers.size())

	# Focus on first bench marker immediately (no animation)
	focus_on_bench(0, false)

func _is_nav_blocked() -> bool:
	var s = ScriptDirector.current_state
	return s == ScriptDirector.State.DIALOGUE \
		or s == ScriptDirector.State.WAITING_FOR_ADVANCE \
		or s == ScriptDirector.State.MINIGAME_ACTIVE

func _process(delta):
	# Handle hold-to-repeat navigation
	if not is_transitioning and not _is_nav_blocked():
		# Check for keyboard hold
		var current_hold_direction = 0
		if Input.get_action_strength("ui_left") > 0.5:
			current_hold_direction = -1
		elif Input.get_action_strength("ui_right") > 0.5:
			current_hold_direction = 1
		elif is_holding_touch:
			current_hold_direction = hold_direction

		# If direction changed, reset timing
		if current_hold_direction != hold_direction:
			hold_direction = current_hold_direction
			hold_start_time = Time.get_ticks_msec() / 1000.0
			last_repeat_time = hold_start_time

		# Process hold-to-repeat
		if hold_direction != 0:
			var current_time = Time.get_ticks_msec() / 1000.0
			var time_held = current_time - hold_start_time

			# Check if we should repeat
			if time_held >= hold_repeat_initial_delay:
				var time_since_last = current_time - last_repeat_time
				if time_since_last >= hold_repeat_interval:
					# Execute repeat navigation
					if hold_direction == -1:
						navigate_to_next()
					elif hold_direction == 1:
						navigate_to_previous()
					last_repeat_time = current_time

	# Don't apply free-look during transitions
	if is_transitioning:
		return

	# Spring-back animation for free-look offset
	if not is_dragging and current_free_look_offset != Vector2.ZERO:
		# Smoothly lerp offset back to zero
		current_free_look_offset = current_free_look_offset.lerp(Vector2.ZERO, free_look_return_speed * delta)

		# Apply the offset to camera rotation
		if current_free_look_offset.length() > 0.001:  # Only apply if offset is significant
			apply_free_look_offset()
		else:
			# Snap to target rotation when very close to zero
			current_free_look_offset = Vector2.ZERO
			quaternion = target_rotation

## Apply free-look offset to camera rotation
func apply_free_look_offset():
	if target_rotation == Quaternion.IDENTITY:
		return

	# Convert target rotation to Euler angles
	var euler = target_rotation.get_euler()

	# Apply free-look offset (clamped to max offset)
	var clamped_offset = Vector2(
		clamp(current_free_look_offset.x, -free_look_max_offset, free_look_max_offset),
		clamp(current_free_look_offset.y, -free_look_max_offset, free_look_max_offset)
	)

	euler.y += clamped_offset.x  # Yaw (left/right)
	euler.x += clamped_offset.y  # Pitch (up/down)

	# Convert back to quaternion and apply
	quaternion = Quaternion.from_euler(euler)

func _input(event):
	# Don't process input during transitions
	if is_transitioning:
		return

	# Arrow key navigation blocked during dialogue
	if not _is_nav_blocked():
		if event.is_action_pressed("ui_right"):
			navigate_to_previous()
			get_viewport().set_input_as_handled()
		elif event.is_action_pressed("ui_left"):
			navigate_to_next()
			get_viewport().set_input_as_handled()

	# Mouse input for free-look only (PC)
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				# Mouse button pressed - start free-look drag (only if not in minigame)
				if not _is_nav_blocked():
					mouse_button_pressed = true
					is_dragging = true
					drag_start_position = event.position
			else:
				# Mouse button released - end drag and spring back
				mouse_button_pressed = false
				is_dragging = false

	elif event is InputEventMouseMotion and mouse_button_pressed and enable_free_look and not is_transitioning and not _is_nav_blocked():
		# Mouse drag - apply free-look offset
		var delta = event.relative
		current_free_look_offset.x -= delta.x * free_look_sensitivity  # Yaw (inverted to match drag direction)
		current_free_look_offset.y -= delta.y * free_look_sensitivity  # Pitch (inverted)
		apply_free_look_offset()

	# Touch input for taps and free-look (Mobile)
	if enable_swipe_input:
		if event is InputEventScreenTouch:
			if event.pressed and active_touch_index == -1:
				# Touch started - record starting position and time
				active_touch_index = event.index
				drag_start_position = event.position
				touch_start_time = Time.get_ticks_msec() / 1000.0
				touch_moved = false
				is_dragging = true

				# Check if touch is in navigation zone (blocked during dialogue)
				if not _is_nav_blocked():
					var viewport_width = get_viewport().get_visible_rect().size.x
					var tap_x = event.position.x
					if tap_x < viewport_width / 3.0:
						# Left navigation zone
						is_holding_touch = true
						hold_direction = -1
						navigate_to_next()
						get_viewport().set_input_as_handled()
					elif tap_x > (viewport_width * 2.0 / 3.0):
						# Right navigation zone
						is_holding_touch = true
						hold_direction = 1
						navigate_to_previous()
						get_viewport().set_input_as_handled()
			elif not event.pressed and event.index == active_touch_index:
				# Touch ended - reset all states
				is_dragging = false
				is_holding_touch = false
				hold_direction = 0
				active_touch_index = -1

		elif event is InputEventScreenDrag and event.index == active_touch_index and enable_free_look and not is_transitioning and not _is_nav_blocked():
			# Touch drag - apply free-look offset (like mouse drag)
			touch_moved = true

			# Cancel hold-to-repeat if user starts dragging
			if is_holding_touch and event.relative.length() > 10.0:
				is_holding_touch = false
				hold_direction = 0

			var delta = event.relative
			current_free_look_offset.x -= delta.x * free_look_sensitivity  # Yaw (inverted to match drag direction)
			current_free_look_offset.y -= delta.y * free_look_sensitivity  # Pitch (inverted)
			apply_free_look_offset()

## Navigate to the next bench marker (wraps around to first)
func navigate_to_next():
	if bench_markers.is_empty():
		return

	current_index = (current_index + 1) % bench_markers.size()
	focus_on_bench(current_index, true)

## Navigate to the previous bench marker (wraps around to last)
func navigate_to_previous():
	if bench_markers.is_empty():
		return

	current_index = (current_index - 1 + bench_markers.size()) % bench_markers.size()
	focus_on_bench(current_index, true)

## Focus camera on specified bench marker
## @param index: Index of the bench marker to focus on (0-based)
## @param animate: Whether to smoothly tween the camera or snap instantly
func focus_on_bench(index: int, animate: bool):
	if index < 0 or index >= bench_markers.size():
		push_warning("Invalid bench index: %d" % index)
		return

	# Reset free-look offset when changing bench
	current_free_look_offset = Vector2.ZERO

	# Set camera position and FOV
	global_position = Vector3(0, 0.275, 0)
	fov = camera_fov

	# Get target bench marker's global position
	var target_marker = bench_markers[index]
	var target_position = target_marker.global_transform.origin

	# Calculate the rotation needed to look at the target
	var look_transform = global_transform.looking_at(target_position, Vector3.UP)
	target_rotation = look_transform.basis.get_rotation_quaternion()

	# Apply default tilt offsets to target rotation
	var euler = target_rotation.get_euler()
	euler.x += deg_to_rad(default_pitch_offset)
	euler.y += deg_to_rad(default_yaw_offset)
	target_rotation = Quaternion.from_euler(euler)

	if animate:
		# Block input during transition
		is_transitioning = true

		# Kill any existing tween
		if camera_tween:
			camera_tween.kill()

		# Create smooth rotation tween
		camera_tween = create_tween()
		camera_tween.set_ease(Tween.EASE_IN_OUT)
		camera_tween.set_trans(Tween.TRANS_CUBIC)

		# Tween the quaternion for smooth rotation
		camera_tween.tween_property(self, "quaternion", target_rotation, transition_duration)

		# Unlock input when tween completes
		camera_tween.finished.connect(func(): is_transitioning = false)
	else:
		# Instant rotation (used on initialization)
		quaternion = target_rotation
		is_transitioning = false

	# Debug output
	print("Focused on bench %d: %s" % [index + 1, target_marker.name])

	# Notify TrialRoomManager of bench focus change
	var trial_manager = get_node_or_null("../TrialRoom")  # TrialRoom sibling node
	if trial_manager and trial_manager.has_method("on_bench_focused"):
		trial_manager.on_bench_focused(index)

## Get the currently focused bench marker index (0-based)
func get_current_index() -> int:
	return current_index

## Get the currently focused bench marker node
func get_current_marker() -> Marker3D:
	if current_index >= 0 and current_index < bench_markers.size():
		return bench_markers[current_index]
	return null

## Jump directly to a specific bench marker by index
## @param index: 0-based index (0 = Bench_Marker3D_001, 16 = Bench_Marker3D_017_Monokuma)
## @param animate: Whether to animate the transition
func jump_to_bench(index: int, animate: bool = true):
	if index >= 0 and index < bench_markers.size():
		current_index = index
		focus_on_bench(current_index, animate)
