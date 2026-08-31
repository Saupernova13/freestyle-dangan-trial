class_name BulletDrawer
extends Control
## Pure-draw control for the truth bullet projectile.
## Attached to a Control node in scenes/minigames/bullet_projectile.tscn.

@export var outer_color: Color = Color(1.0, 0.85, 0.2, 1.0)
@export var inner_color: Color = Color(1.0, 1.0, 0.8, 1.0)
@export var outer_radius: float = 6.0
@export var inner_radius: float = 3.0

func _draw():
	var center = size / 2.0
	draw_circle(center, outer_radius, outer_color)
	draw_circle(center, inner_radius, inner_color)
