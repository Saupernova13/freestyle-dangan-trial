extends CanvasLayer

var crosshair_node: Control
var _target_pos: Vector2 = Vector2.ZERO
var _current_pos: Vector2 = Vector2.ZERO
var _is_focus_mode: bool = false

const NORMAL_FOLLOW_SPEED: float = 20.0
const FOCUS_FOLLOW_SPEED: float = 8.0
const CROSSHAIR_SIZE: float = 32.0

func _ready():
	layer = 15

	crosshair_node = Control.new()
	crosshair_node.custom_minimum_size = Vector2(CROSSHAIR_SIZE, CROSSHAIR_SIZE)
	crosshair_node.size = Vector2(CROSSHAIR_SIZE, CROSSHAIR_SIZE)
	add_child(crosshair_node)

	var drawer = CrosshairDrawer.new()
	drawer.size = Vector2(CROSSHAIR_SIZE, CROSSHAIR_SIZE)
	crosshair_node.add_child(drawer)

	InputManager.aim_moved.connect(_on_aim_moved)
	InputManager.focus_started.connect(_on_focus_started)
	InputManager.focus_ended.connect(_on_focus_ended)

	var vp_size = Vector2(1280, 720)
	_current_pos = vp_size / 2.0
	_target_pos = _current_pos

	visible = false

func _process(delta):
	if not visible:
		return

	var speed = FOCUS_FOLLOW_SPEED if _is_focus_mode else NORMAL_FOLLOW_SPEED
	_current_pos = _current_pos.lerp(_target_pos, speed * delta)
	crosshair_node.position = _current_pos - Vector2(CROSSHAIR_SIZE / 2, CROSSHAIR_SIZE / 2)

func show_crosshair():
	visible = true
	Input.mouse_mode = Input.MOUSE_MODE_HIDDEN

func hide_crosshair():
	visible = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func _on_aim_moved(pos: Vector2):
	_target_pos = pos

func _on_focus_started():
	_is_focus_mode = true
	Engine.time_scale = 0.3

func _on_focus_ended():
	_is_focus_mode = false
	Engine.time_scale = 1.0

func get_position() -> Vector2:
	return _current_pos


class CrosshairDrawer extends Control:
	func _draw():
		var center = size / 2.0
		var radius = size.x / 2.0 - 4
		var color = Color(0.4, 0.85, 1.0, 0.9)
		var inner_radius = radius * 0.3

		draw_arc(center, radius, 0, TAU, 32, color, 2.0, true)
		draw_arc(center, inner_radius, 0, TAU, 16, color, 1.5, true)

		draw_line(Vector2(center.x, center.y - radius - 2), Vector2(center.x, center.y - inner_radius - 2), color, 1.5, true)
		draw_line(Vector2(center.x, center.y + inner_radius + 2), Vector2(center.x, center.y + radius + 2), color, 1.5, true)
		draw_line(Vector2(center.x - radius - 2, center.y), Vector2(center.x - inner_radius - 2, center.y), color, 1.5, true)
		draw_line(Vector2(center.x + inner_radius + 2, center.y), Vector2(center.x + radius + 2, center.y), color, 1.5, true)

		draw_circle(center, 2.0, color)
