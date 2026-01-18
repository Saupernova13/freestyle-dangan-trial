extends Camera3D
## Bench Focus Camera Controller for Danganronpa Trial System
##
## Controls camera rotation to focus on trial bench markers one at a time.
## Navigate using arrow keys or swipe gestures.

## Duration in seconds for smooth camera rotation transitions
@export_range(0.1, 2.0, 0.1) var transition_duration: float = 0.5

## Enable or disable swipe gesture input for touch devices
@export var enable_swipe_input: bool = true

## Minimum swipe distance in pixels to trigger navigation (prevents accidental taps)
@export_range(10.0, 200.0, 5.0) var swipe_threshold: float = 50.0

# Internal variables
var bench_markers: Array[Marker3D] = []
var current_index: int = 0
var is_transitioning: bool = false
var camera_tween: Tween
var touch_start_position: Vector2 = Vector2.ZERO
var is_touching: bool = false

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

func _input(event):
	# Don't process input during transitions
	if is_transitioning:
		return

	# Arrow key navigation
	if event.is_action_pressed("ui_right"):
		navigate_to_next()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("ui_left"):
		navigate_to_previous()
		get_viewport().set_input_as_handled()

	# Swipe gesture detection
	if enable_swipe_input:
		if event is InputEventScreenTouch:
			if event.pressed:
				# Touch started - record starting position
				is_touching = true
				touch_start_position = event.position
			else:
				# Touch ended - check if it was a swipe
				if is_touching:
					var swipe_distance = event.position.x - touch_start_position.x

					# Right swipe (positive X direction) = next bench
					if swipe_distance > swipe_threshold:
						navigate_to_next()
						get_viewport().set_input_as_handled()
					# Left swipe (negative X direction) = previous bench
					elif swipe_distance < -swipe_threshold:
						navigate_to_previous()
						get_viewport().set_input_as_handled()

					is_touching = false

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

	# Get target bench marker's global position
	var target_marker = bench_markers[index]
	var target_position = target_marker.global_transform.origin

	# Calculate the rotation needed to look at the target
	# We create a temporary transform to calculate the correct rotation
	var camera_position = global_transform.origin
	var look_transform = global_transform.looking_at(target_position, Vector3.UP)
	var target_rotation = look_transform.basis.get_rotation_quaternion()

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
