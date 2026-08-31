extends CanvasLayer
## Crosshair HUD. CrosshairDrawer on %CrosshairNode/Drawer paints the reticle;
## this handles aim smoothing, the focus-mode time scale, and the pulse.

@export var crosshair_size: float = 32.0
@export var normal_follow_speed: float = 20.0
@export var focus_follow_speed: float = 8.0
@export var focus_time_scale: float = 0.3

@onready var _crosshair_node: Control = %CrosshairNode
@onready var _anim: AnimationPlayer = %AnimationPlayer

var _target_pos: Vector2 = Vector2.ZERO
var _current_pos: Vector2 = Vector2.ZERO
var _is_focus_mode: bool = false

func _ready():
	InputManager.aim_moved.connect(_on_aim_moved)
	InputManager.focus_started.connect(_on_focus_started)
	InputManager.focus_ended.connect(_on_focus_ended)

	var vp_size = get_viewport().get_visible_rect().size
	_current_pos = vp_size / 2.0
	_target_pos = _current_pos

	visible = false

func _process(delta):
	if not visible:
		return

	var speed = focus_follow_speed if _is_focus_mode else normal_follow_speed
	_current_pos = _current_pos.lerp(_target_pos, speed * delta)
	_crosshair_node.position = _current_pos - Vector2(crosshair_size / 2, crosshair_size / 2)

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
	Engine.time_scale = focus_time_scale
	if _anim and _anim.has_animation("focus_pulse"):
		_anim.play("focus_pulse")

func _on_focus_ended():
	_is_focus_mode = false
	Engine.time_scale = 1.0
	if _anim and _anim.is_playing():
		_anim.stop()
		_crosshair_node.scale = Vector2.ONE

func get_aim_position() -> Vector2:
	return _current_pos
