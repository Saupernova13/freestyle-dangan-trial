extends CanvasLayer

## FOCUS / Concentrate gauge. Defaults to top-right of the screen (next to timer/turn area).
## Position, size, and colors are exposed as @export so they can be edited in the inspector.

@export_group("Layout")
@export var anchor_preset: int = Control.PRESET_TOP_RIGHT  ## PRESET_TOP_RIGHT = 2, PRESET_BOTTOM_LEFT = 0
@export var offset_left: float = -150.0
@export var offset_top: float = 55.0
@export var offset_right: float = -20.0
@export var offset_bottom: float = 110.0
@export var bar_size: Vector2 = Vector2(130, 12)

@export_group("Style")
@export var label_text: String = "FOCUS"
@export var label_font_size: int = 11
@export var label_color: Color = Color(0.2, 0.8, 1.0)
@export var bg_color: Color = Color(0.05, 0.05, 0.1, 0.85)
@export var border_color: Color = Color(0.2, 0.8, 1.0, 0.6)
@export var fill_high_color: Color = Color(0.2, 0.8, 1.0, 0.9)
@export var fill_mid_color: Color = Color(1.0, 0.8, 0.2, 0.9)
@export var fill_low_color: Color = Color(1.0, 0.2, 0.2, 0.9)

var _bar_fill: ColorRect
var _bar_bg: ColorRect
var _label: Label
var _last_color: Color = Color.WHITE

func _ready():
	layer = 10

	var anchor = Control.new()
	# Apply the preset, then override offsets so the user's @export values take effect
	anchor.set_anchors_preset(anchor_preset, false)
	anchor.offset_left = offset_left
	anchor.offset_top = offset_top
	anchor.offset_right = offset_right
	anchor.offset_bottom = offset_bottom
	anchor.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(anchor)

	var bg = PanelContainer.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	var style = StyleBoxFlat.new()
	style.bg_color = bg_color
	style.border_width_bottom = 2
	style.border_width_top = 2
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_color = border_color
	style.corner_radius_top_left = 4
	style.corner_radius_top_right = 4
	style.corner_radius_bottom_left = 4
	style.corner_radius_bottom_right = 4
	style.content_margin_left = 8
	style.content_margin_right = 8
	style.content_margin_top = 6
	style.content_margin_bottom = 6
	bg.add_theme_stylebox_override("panel", style)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	anchor.add_child(bg)

	var vbox = VBoxContainer.new()
	vbox.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bg.add_child(vbox)

	_label = Label.new()
	_label.text = label_text
	_label.add_theme_font_size_override("font_size", label_font_size)
	_label.add_theme_color_override("font_color", label_color)
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vbox.add_child(_label)

	var bar_bg_rect = Control.new()
	bar_bg_rect.custom_minimum_size = bar_size
	bar_bg_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vbox.add_child(bar_bg_rect)

	_bar_bg = ColorRect.new()
	_bar_bg.color = Color(0.0, 0.0, 0.0, 0.5)
	_bar_bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	_bar_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar_bg_rect.add_child(_bar_bg)

	_bar_fill = ColorRect.new()
	_bar_fill.color = fill_high_color
	_bar_fill.set_anchors_preset(Control.PRESET_CENTER_LEFT)
	_bar_fill.grow_horizontal = Control.GROW_DIRECTION_END
	_bar_fill.custom_minimum_size = bar_size
	_bar_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
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
		new_color = fill_high_color
	elif pct > 0.25:
		new_color = fill_mid_color
	else:
		new_color = fill_low_color

	if new_color != _last_color:
		_last_color = new_color
		var tween = create_tween()
		tween.tween_property(_bar_fill, "color", new_color, 0.15)

	var tween = create_tween()
	tween.tween_property(_bar_fill, "custom_minimum_size:x", bar_size.x * pct, 0.2)
