extends CanvasLayer

var _bar_fill: ColorRect
var _bar_bg: ColorRect
var _label: Label
var _last_color: Color = Color.WHITE

func _ready():
	layer = 10

	var anchor = Control.new()
	anchor.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	anchor.offset_left = 15
	anchor.offset_bottom = -15
	anchor.offset_right = 145
	anchor.offset_top = -55
	add_child(anchor)

	var bg = PanelContainer.new()
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.05, 0.05, 0.1, 0.85)
	style.border_width_bottom = 2
	style.border_width_top = 2
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_color = Color(0.2, 0.8, 1.0, 0.6)
	style.corner_radius_top_left = 4
	style.corner_radius_top_right = 4
	style.corner_radius_bottom_left = 4
	style.corner_radius_bottom_right = 4
	style.content_margin_left = 8
	style.content_margin_right = 8
	style.content_margin_top = 6
	style.content_margin_bottom = 6
	bg.add_theme_stylebox_override("panel", style)
	anchor.add_child(bg)

	var vbox = VBoxContainer.new()
	bg.add_child(vbox)

	_label = Label.new()
	_label.text = "FOCUS"
	_label.add_theme_font_size_override("font_size", 11)
	_label.add_theme_color_override("font_color", Color(0.2, 0.8, 1.0))
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(_label)

	var bar_bg_rect = Control.new()
	bar_bg_rect.custom_minimum_size = Vector2(120, 12)
	vbox.add_child(bar_bg_rect)

	_bar_bg = ColorRect.new()
	_bar_bg.color = Color(0.0, 0.0, 0.0, 0.5)
	_bar_bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bar_bg_rect.add_child(_bar_bg)

	_bar_fill = ColorRect.new()
	_bar_fill.color = Color(0.2, 0.8, 1.0, 0.9)
	_bar_fill.set_anchors_preset(Control.PRESET_CENTER_LEFT)
	_bar_fill.grow_horizontal = Control.GROW_DIRECTION_END
	_bar_fill.custom_minimum_size = Vector2(120, 12)
	bar_bg_rect.add_child(_bar_fill)

	ConcentrateGauge.concentrate_changed.connect(_on_concentrate_changed)
	visible = false

func show_gauge():
	visible = true

func hide_gauge():
	visible = false

func _on_concentrate_changed(current: float, maximum: float):
	var pct = current / maximum if maximum > 0 else 0.0
	var new_color: Color
	if pct > 0.5:
		new_color = Color(0.2, 0.8, 1.0, 0.9)
	elif pct > 0.25:
		new_color = Color(1.0, 0.8, 0.2, 0.9)
	else:
		new_color = Color(1.0, 0.2, 0.2, 0.9)

	if new_color != _last_color:
		_last_color = new_color
		var tween = create_tween()
		tween.tween_property(_bar_fill, "color", new_color, 0.15)

	var tween = create_tween()
	tween.tween_property(_bar_fill, "custom_minimum_size:x", 120.0 * pct, 0.2)
