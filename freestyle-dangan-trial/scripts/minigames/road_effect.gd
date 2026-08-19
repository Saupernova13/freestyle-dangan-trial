class_name RoadEffect
extends Control

## Scrolling road decoration behind the LogicDive minigame, attached in
## scenes/minigames/logic_dive_overlay.tscn.
##
## `scroll_phase` runs 0 -> 1 over one dash period, driven by that scene's
## looping road_scroll animation. Normalized, so it stays seamless at any
## dash/gap length; change the clip's length to change the speed.

@export var dash_length: float = 40.0
@export var gap_length: float = 30.0
@export var bg_color: Color = Color(0.05, 0.0, 0.15, 0.85)
@export var dash_color: Color = Color(0.3, 0.3, 0.5, 0.6)
@export var side_line_color: Color = Color(0.2, 0.2, 0.4, 0.3)

var scroll_phase: float = 0.0:
	set(value):
		scroll_phase = value
		queue_redraw()

func _draw():
	draw_rect(Rect2(Vector2.ZERO, size), bg_color)

	var cx = size.x / 2.0
	var total = dash_length + gap_length
	var y = fmod(scroll_phase * total, total) - total
	while y < size.y + total:
		draw_rect(Rect2(cx - 2, y, 4, dash_length), dash_color)
		y += total

	draw_rect(Rect2(size.x * 0.25, 0, 2, size.y), side_line_color)
	draw_rect(Rect2(size.x * 0.75, 0, 2, size.y), side_line_color)
