extends CanvasLayer

var bar_bg: ColorRect
var bar_fill: ColorRect
var bar_damage_flash: ColorRect
var label: Label

var _max_width: float = 300.0
var _bar_height: float = 20.0
var _margin: Vector2 = Vector2(20, 20)

func _ready():
	layer = 10

	var container = Control.new()
	container.set_anchors_preset(Control.PRESET_TOP_LEFT)
	add_child(container)

	bar_bg = ColorRect.new()
	bar_bg.color = Color(0.15, 0.05, 0.05, 0.8)
	bar_bg.position = _margin
	bar_bg.size = Vector2(_max_width, _bar_height)
	container.add_child(bar_bg)

	bar_fill = ColorRect.new()
	bar_fill.color = Color(0.9, 0.2, 0.5, 1.0)
	bar_fill.position = _margin
	bar_fill.size = Vector2(_max_width, _bar_height)
	container.add_child(bar_fill)

	bar_damage_flash = ColorRect.new()
	bar_damage_flash.color = Color(1.0, 1.0, 1.0, 0.0)
	bar_damage_flash.position = _margin
	bar_damage_flash.size = Vector2(_max_width, _bar_height)
	container.add_child(bar_damage_flash)

	label = Label.new()
	label.text = "INFLUENCE"
	label.position = Vector2(_margin.x, _margin.y + _bar_height + 2)
	label.add_theme_font_size_override("font_size", 12)
	label.add_theme_color_override("font_color", Color(0.9, 0.2, 0.5))
	container.add_child(label)

	InfluenceGauge.influence_changed.connect(_on_influence_changed)
	InfluenceGauge.damage_taken.connect(_on_damage_taken)

	visible = false

func show_gauge():
	visible = true

func hide_gauge():
	visible = false

func _on_influence_changed(current: float, maximum: float):
	var pct = current / maximum if maximum > 0 else 0.0
	var target_width = _max_width * pct
	var tween = create_tween()
	tween.tween_property(bar_fill, "size:x", target_width, 0.3).set_ease(Tween.EASE_OUT)

	if pct < 0.25:
		bar_fill.color = Color(1.0, 0.1, 0.1, 1.0)
	elif pct < 0.5:
		bar_fill.color = Color(1.0, 0.4, 0.3, 1.0)
	else:
		bar_fill.color = Color(0.9, 0.2, 0.5, 1.0)

func _on_damage_taken(_amount: float):
	bar_damage_flash.color.a = 0.8
	var tween = create_tween()
	tween.tween_property(bar_damage_flash, "color:a", 0.0, 0.3)
