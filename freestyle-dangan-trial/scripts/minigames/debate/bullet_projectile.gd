class_name BulletProjectile
extends Control

## Truth bullet projectile fired toward debate panels. Scene-driven —
## see scenes/minigames/bullet_projectile.tscn.
## The script handles flight physics, trail tracking, and hit/miss detection.

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
	# Ensure the Control has a size before computing position (custom_minimum_size
	# from the scene is the floor, but explicit size avoids edge cases when
	# instantiated outside a layout container).
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
	if _trail:
		var trail_tween = create_tween()
		trail_tween.tween_property(_trail, "modulate:a", 0.0, 0.15)

	var tween = create_tween()
	tween.tween_property(self, "scale", Vector2(3.0, 3.0), 0.15)
	tween.parallel().tween_property(self, "modulate:a", 0.0, 0.15)
	tween.finished.connect(func(): queue_free())
