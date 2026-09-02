class_name BulletProjectile
extends Control
## Truth bullet fired at a debate panel; the look is scene-owned in
## scenes/minigames/bullet_projectile.tscn. This script does flight, the
## trail, and hit detection.

## Both resolve the shot. The projectile decides nothing: the judgement was
## made when the player pulled the trigger, so whichever of these fires, the
## caller has to act on it.
signal hit_target
signal missed

@export var speed: float = 1500.0
@export var hit_radius: float = 30.0
@export var trail_max_points: int = 8

@onready var _trail: Line2D = %Trail

var _start_pos: Vector2
var _target_pos: Vector2
var _is_moving: bool = false
var _direction: Vector2
var _trail_points: Array = []

func fire(from: Vector2, to: Vector2):
	# Set explicitly, because instantiating outside a layout container leaves
	# size at zero and the position maths needs it.
	if size.x <= 0 or size.y <= 0:
		size = Vector2(16, 16)
	_start_pos = from
	_target_pos = to
	position = from - size / 2
	_direction = (to - from).normalized()
	_trail_points.clear()
	_trail.points = PackedVector2Array()
	_is_moving = true
	visible = true

func _process(delta):
	if not _is_moving:
		return

	position += _direction * speed * delta
	var center = position + size / 2

	_trail_points.append(center)
	if _trail_points.size() > trail_max_points:
		_trail_points.pop_front()
	var local_pts: Array = []
	for pt in _trail_points:
		local_pts.append(pt - position)
	_trail.points = PackedVector2Array(local_pts)

	if center.distance_to(_target_pos) < hit_radius:
		_is_moving = false
		hit_target.emit()
		_play_hit_effect()
		return

	var vp = get_viewport_rect().size
	if center.x < -50 or center.x > vp.x + 50 or center.y < -50 or center.y > vp.y + 50:
		_is_moving = false
		missed.emit()
		queue_free()

func _play_hit_effect():
	_is_moving = false
	var anim: AnimationPlayer = %AnimationPlayer
	anim.play("hit")
	await anim.animation_finished
	queue_free()
