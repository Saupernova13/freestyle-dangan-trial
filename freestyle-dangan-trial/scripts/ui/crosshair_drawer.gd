class_name CrosshairDrawer
extends Control
## Pure-draw control for the crosshair reticle.
## Attached to a Control node in scenes/ui/crosshair.tscn.

@export var color: Color = Color(0.4, 0.85, 1.0, 0.9)
@export var line_width: float = 1.5
@export var ring_thickness: float = 2.0

func _draw():
	var center = size / 2.0
	var radius = size.x / 2.0 - 4
	var inner_radius = radius * 0.3

	draw_arc(center, radius, 0, TAU, 32, color, ring_thickness, true)
	draw_arc(center, inner_radius, 0, TAU, 16, color, line_width, true)

	draw_line(
		Vector2(center.x, center.y - radius - 2),
		Vector2(center.x, center.y - inner_radius - 2),
		color,
		line_width,
		true
	)
	draw_line(
		Vector2(center.x, center.y + inner_radius + 2),
		Vector2(center.x, center.y + radius + 2),
		color,
		line_width,
		true
	)
	draw_line(
		Vector2(center.x - radius - 2, center.y),
		Vector2(center.x - inner_radius - 2, center.y),
		color,
		line_width,
		true
	)
	draw_line(
		Vector2(center.x + inner_radius + 2, center.y),
		Vector2(center.x + radius + 2, center.y),
		color,
		line_width,
		true
	)

	draw_circle(center, 2.0, color)
