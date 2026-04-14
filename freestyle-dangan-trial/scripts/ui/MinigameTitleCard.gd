extends CanvasLayer

signal card_finished

var _bg: ColorRect
var _title_label: Label
var _subtitle_label: Label
var _line_top: ColorRect
var _line_bottom: ColorRect

var _title_colors: Dictionary = {
	"nonstop_debate": Color(1.0, 0.5, 0.1),
	"hangmans_gambit": Color(0.7, 0.3, 1.0),
	"logic_dive": Color(0.2, 0.8, 1.0),
	"debate_scrum": Color(1.0, 0.8, 0.1),
	"mass_panic_debate": Color(1.0, 0.2, 0.2),
}

var _title_names: Dictionary = {
	"nonstop_debate": "NONSTOP DEBATE",
	"hangmans_gambit": "HANGMAN'S GAMBIT",
	"logic_dive": "LOGIC DIVE",
	"debate_scrum": "DEBATE SCRUM",
	"mass_panic_debate": "MASS PANIC DEBATE",
}

func _ready():
	layer = 25

func show_title(game_type: String, game_name: String = ""):
	var color = _title_colors.get(game_type, Color(0.8, 0.8, 0.8))
	var display_name = game_name if not game_name.is_empty() else _title_names.get(game_type, game_type.to_upper())

	_bg = ColorRect.new()
	_bg.color = Color(0, 0, 0, 0)
	_bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_bg)

	_line_top = ColorRect.new()
	_line_top.color = color
	_line_top.size = Vector2(0, 3)
	_line_top.position = Vector2(0, 310)
	_line_top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_line_top)

	_line_bottom = ColorRect.new()
	_line_bottom.color = color
	_line_bottom.size = Vector2(0, 3)
	_line_bottom.position = Vector2(1280, 410)
	_line_bottom.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_line_bottom)

	_title_label = Label.new()
	_title_label.text = display_name
	_title_label.add_theme_font_size_override("font_size", 52)
	_title_label.add_theme_color_override("font_color", color)
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_title_label.set_anchors_preset(Control.PRESET_CENTER)
	_title_label.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_title_label.grow_vertical = Control.GROW_DIRECTION_BOTH
	_title_label.modulate.a = 0.0
	_title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_title_label)

	_subtitle_label = Label.new()
	_subtitle_label.text = "CLASS TRIAL"
	_subtitle_label.add_theme_font_size_override("font_size", 16)
	_subtitle_label.add_theme_color_override("font_color", Color(color, 0.6))
	_subtitle_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_subtitle_label.set_anchors_preset(Control.PRESET_CENTER)
	_subtitle_label.position.y = 40
	_subtitle_label.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_subtitle_label.modulate.a = 0.0
	_subtitle_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_subtitle_label)

	_animate()

func _animate():
	var tween = create_tween()

	# Fade in background
	tween.tween_property(_bg, "color:a", 0.85, 0.2)

	# Lines sweep in from opposite sides
	tween.parallel().tween_property(_line_top, "size:x", 1280.0, 0.3).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	tween.parallel().tween_property(_line_bottom, "position:x", 0.0, 0.3).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	tween.parallel().tween_property(_line_bottom, "size:x", 1280.0, 0.3).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)

	# Title slams in
	tween.tween_property(_title_label, "modulate:a", 1.0, 0.15)
	tween.parallel().tween_property(_title_label, "scale", Vector2(1.0, 1.0), 0.2).from(Vector2(1.5, 1.5)).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)

	# Subtitle fades in
	tween.tween_property(_subtitle_label, "modulate:a", 1.0, 0.2)

	# Hold
	tween.tween_interval(1.2)

	# Fade out everything
	tween.tween_property(_bg, "color:a", 0.0, 0.3)
	tween.parallel().tween_property(_title_label, "modulate:a", 0.0, 0.3)
	tween.parallel().tween_property(_subtitle_label, "modulate:a", 0.0, 0.3)
	tween.parallel().tween_property(_line_top, "modulate:a", 0.0, 0.3)
	tween.parallel().tween_property(_line_bottom, "modulate:a", 0.0, 0.3)

	tween.finished.connect(func():
		card_finished.emit()
		queue_free()
	)

func show_result(success: bool):
	_bg = ColorRect.new()
	_bg.color = Color(0, 0, 0, 0)
	_bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_bg)

	_title_label = Label.new()
	_title_label.text = "ALL RIGHT!" if success else "WRONG!"
	_title_label.add_theme_font_size_override("font_size", 64)
	var color = Color(0.2, 1.0, 0.4) if success else Color(1.0, 0.2, 0.2)
	_title_label.add_theme_color_override("font_color", color)
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_title_label.set_anchors_preset(Control.PRESET_CENTER)
	_title_label.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_title_label.grow_vertical = Control.GROW_DIRECTION_BOTH
	_title_label.modulate.a = 0.0
	_title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_title_label)

	var tween = create_tween()
	tween.tween_property(_bg, "color:a", 0.7, 0.15)
	tween.parallel().tween_property(_title_label, "modulate:a", 1.0, 0.1)
	tween.parallel().tween_property(_title_label, "scale", Vector2(1.0, 1.0), 0.2).from(Vector2(2.0, 2.0)).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	tween.tween_interval(1.0)
	tween.tween_property(_bg, "color:a", 0.0, 0.3)
	tween.parallel().tween_property(_title_label, "modulate:a", 0.0, 0.3)
	tween.finished.connect(func():
		card_finished.emit()
		queue_free()
	)
