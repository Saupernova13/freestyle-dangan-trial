extends Camera3D

# Camera settings (exported for inspector customization)
@export var rotation_speed: float = 0.005
@export var zoom_speed: float = 0.1
@export var pan_speed: float = 0.01
@export var min_zoom: float = 2.0
@export var max_zoom: float = 20.0
@export var invert_y: bool = false

# Camera state
var camera_rotation: Vector2 = Vector2.ZERO
var camera_distance: float = 10.0
var camera_target: Vector3 = Vector3.ZERO
var is_rotating: bool = false
var is_panning: bool = false
var last_mouse_position: Vector2 = Vector2.ZERO

# Touch state
var touch_points: Dictionary = {}
var last_pinch_distance: float = 0.0

func _ready():
	# Initialize camera position
	camera_target = Vector3.ZERO
	camera_rotation = Vector2(-PI/6, PI/4)  # Start at a nice angle
	update_camera_transform()

func _input(event):
	# Mouse button press
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			is_rotating = event.pressed
			last_mouse_position = event.position

		elif event.button_index == MOUSE_BUTTON_MIDDLE:
			is_panning = event.pressed
			last_mouse_position = event.position

		elif event.button_index == MOUSE_BUTTON_WHEEL_UP:
			zoom_camera(-zoom_speed)

		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			zoom_camera(zoom_speed)

	# Mouse motion
	elif event is InputEventMouseMotion:
		var delta_mouse = event.position - last_mouse_position
		last_mouse_position = event.position

		if is_rotating:
			rotate_camera(delta_mouse * rotation_speed)

		elif is_panning:
			pan_camera(delta_mouse * pan_speed)

func _unhandled_input(event):
	if event is InputEventScreenTouch:
		if event.pressed:
			touch_points[event.index] = event.position
		else:
			touch_points.erase(event.index)
			last_pinch_distance = 0.0

	elif event is InputEventScreenDrag:
		touch_points[event.index] = event.position

		# Single finger = rotate
		if touch_points.size() == 1:
			var delta = event.relative
			rotate_camera(delta * rotation_speed * 2.0)

		# Two fingers = pinch to zoom or pan
		elif touch_points.size() == 2:
			var touch_positions = touch_points.values()
			var current_distance = touch_positions[0].distance_to(touch_positions[1])

			# Pinch zoom
			if last_pinch_distance > 0:
				var pinch_delta = current_distance - last_pinch_distance
				zoom_camera(-pinch_delta * zoom_speed * 0.01)

			last_pinch_distance = current_distance

			# Two finger pan
			var center_delta = event.relative
			pan_camera(center_delta * pan_speed)

func rotate_camera(delta: Vector2):
	camera_rotation.x -= delta.y * (1.0 if not invert_y else -1.0)
	camera_rotation.y -= delta.x

	# Clamp vertical rotation to prevent flipping
	camera_rotation.x = clamp(camera_rotation.x, -PI/2 + 0.1, PI/2 - 0.1)

	update_camera_transform()

func zoom_camera(delta: float):
	camera_distance += delta
	camera_distance = clamp(camera_distance, min_zoom, max_zoom)
	update_camera_transform()

func pan_camera(delta: Vector2):
	var right = -transform.basis.x
	var up = transform.basis.y

	camera_target += right * delta.x + up * delta.y
	update_camera_transform()

func update_camera_transform():
	# Calculate position based on rotation and distance
	var offset = Vector3(
		cos(camera_rotation.y) * cos(camera_rotation.x),
		sin(camera_rotation.x),
		sin(camera_rotation.y) * cos(camera_rotation.x)
	) * camera_distance

	position = camera_target + offset
	look_at(camera_target, Vector3.UP)
