extends Camera3D

# Camera settings (exported for inspector customization)
@export var rotation_speed: float = 0.005
@export var touch_rotation_speed: float = 0.01
@export var invert_y: bool = false

# Camera state
var camera_yaw: float = 0.0  # Horizontal rotation (left/right)
var camera_pitch: float = 0.0  # Vertical rotation (up/down)
var is_rotating: bool = false
var last_mouse_position: Vector2 = Vector2.ZERO

# Touch state
var touch_points: Dictionary = {}

func _ready():
	# Set camera position Y to 0.275 and preserve X/Z
	position.y = 0.275

	# Initialize rotation from current values
	camera_yaw = rotation.y
	camera_pitch = rotation.x

func _input(event):
	# Mouse button press
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			is_rotating = event.pressed
			last_mouse_position = event.position

	# Mouse motion
	elif event is InputEventMouseMotion:
		var delta_mouse = event.position - last_mouse_position
		last_mouse_position = event.position

		if is_rotating:
			# Horizontal: Swipe left = turn left, swipe right = turn right
			camera_yaw -= delta_mouse.x * rotation_speed

			# Vertical: Swipe up = look up, swipe down = look down
			camera_pitch -= delta_mouse.y * rotation_speed * (1.0 if not invert_y else -1.0)

			update_camera_rotation()

func _unhandled_input(event):
	if event is InputEventScreenTouch:
		if event.pressed:
			touch_points[event.index] = event.position
		else:
			touch_points.erase(event.index)

	elif event is InputEventScreenDrag:
		touch_points[event.index] = event.position

		# Single finger drag = rotate camera
		if touch_points.size() == 1:
			var delta = event.relative

			# Horizontal: Swipe left = turn left, swipe right = turn right
			camera_yaw -= delta.x * touch_rotation_speed

			# Vertical: Swipe up = look up, swipe down = look down
			camera_pitch -= delta.y * touch_rotation_speed * (1.0 if not invert_y else -1.0)

			update_camera_rotation()

func update_camera_rotation():
	# Clamp pitch to prevent camera flipping
	camera_pitch = clamp(camera_pitch, -PI/2 + 0.1, PI/2 - 0.1)

	rotation.y = camera_yaw
	rotation.x = camera_pitch
