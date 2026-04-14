class_name BulletProjectile
extends Control

signal hit_target
signal missed

var _start_pos: Vector2
var _target_pos: Vector2
var _speed: float = 1500.0
var _is_moving: bool = false
var _direction: Vector2

func _ready():
	custom_minimum_size = Vector2(16, 16)
	size = Vector2(16, 16)

	var drawer = BulletDrawer.new()
	drawer.size = Vector2(16, 16)
	add_child(drawer)

func fire(from: Vector2, to: Vector2):
	_start_pos = from
	_target_pos = to
	position = from - size / 2
	_direction = (to - from).normalized()
	_is_moving = true
	visible = true

	AudioManager.play_sfx("bullet_fire")

func _process(delta):
	if not _is_moving:
		return

	position += _direction * _speed * delta
	var center = position + size / 2

	if center.distance_to(_target_pos) < 30.0:
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
	var tween = create_tween()
	tween.tween_property(self, "scale", Vector2(3.0, 3.0), 0.15)
	tween.parallel().tween_property(self, "modulate:a", 0.0, 0.15)
	tween.finished.connect(func(): queue_free())


class BulletDrawer extends Control:
	func _draw():
		var center = size / 2.0
		draw_circle(center, 6.0, Color(1.0, 0.85, 0.2, 1.0))
		draw_circle(center, 3.0, Color(1.0, 1.0, 0.8, 1.0))
