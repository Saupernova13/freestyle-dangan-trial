extends CanvasLayer

signal card_finished

var _bg: ColorRect
var _mount: Control
var _frame_rect: TextureRect
var _bullet_rect: TextureRect
var _title_label: Label
var _subtitle_label: Label

var _title_colors: Dictionary = {
	"nonstop_debate": Color(1.0, 0.5, 0.1),
	"hangmans_gambit": Color(0.7, 0.3, 1.0),
	"logic_dive": Color(0.2, 0.8, 1.0),
	"debate_scrum": Color(1.0, 0.8, 0.1),
	"mass_panic_debate": Color(1.0, 0.2, 0.2),
	"rebuttal_showdown": Color(0.9, 0.4, 0.6),
	"psyche_taxi": Color(0.2, 0.8, 0.6),
	"closing_argument": Color(0.8, 0.7, 0.2),
}

var _title_names: Dictionary = {
	"nonstop_debate": "NONSTOP DEBATE",
	"hangmans_gambit": "HANGMAN'S GAMBIT",
	"logic_dive": "LOGIC DIVE",
	"debate_scrum": "DEBATE SCRUM",
	"mass_panic_debate": "MASS PANIC DEBATE",
	"rebuttal_showdown": "REBUTTAL SHOWDOWN",
	"psyche_taxi": "PSYCHE TAXI",
	"closing_argument": "CLOSING ARGUMENT",
}

func _ready():
	layer = 25

func show_title(game_type: String, game_name: String = ""):
	var color = _title_colors.get(game_type, Color(0.8, 0.8, 0.8))
	var display_name = game_name if not game_name.is_empty() else _title_names.get(game_type, game_type.to_upper())
	var use_orange = game_type == "nonstop_debate"

	var frame_tex_path = "res://textures/ui/lower_res/minigame_name_frame_%s.png" % ("orange" if use_orange else "blue")
	var bullet_tex_path = "res://textures/ui/lower_res/minigame_name_speed_bullet_%s.png" % ("orange" if use_orange else "blue")

	var frame_tex = load(frame_tex_path)
	var bullet_tex = load(bullet_tex_path)

	if not frame_tex or not bullet_tex:
		push_error("Failed to load minigame title textures")
		queue_free()
		return

	_bg = ColorRect.new()
	_bg.color = Color(0, 0, 0, 0)
	_bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_bg)

	_mount = Control.new()
	_mount.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_mount)

	_frame_rect = TextureRect.new()
	_frame_rect.texture = frame_tex
	_frame_rect.expand_mode = TextureRect.EXPAND_FIT_HEIGHT_PROPORTIONAL
	_frame_rect.custom_minimum_size = Vector2(320, 90)
	_frame_rect.position = Vector2(0, 0)
	_frame_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_mount.add_child(_frame_rect)

	_bullet_rect = TextureRect.new()
	_bullet_rect.texture = bullet_tex
	_bullet_rect.expand_mode = TextureRect.EXPAND_FIT_HEIGHT_PROPORTIONAL
	_bullet_rect.custom_minimum_size = Vector2(180, 90)
	_bullet_rect.position.x = _frame_rect.custom_minimum_size.x - 30
	_bullet_rect.position.y = 0
	_bullet_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_mount.add_child(_bullet_rect)

	_title_label = Label.new()
	_title_label.text = display_name
	_title_label.add_theme_font_size_override("font_size", 44)
	_title_label.add_theme_color_override("font_color", color)
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_title_label.custom_minimum_size = Vector2(300, 60)
	_title_label.position = Vector2(10, 10)
	_title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_mount.add_child(_title_label)

	_subtitle_label = Label.new()
	_subtitle_label.text = "CLASS TRIAL"
	_subtitle_label.add_theme_font_size_override("font_size", 14)
	_subtitle_label.add_theme_color_override("font_color", Color(color, 0.8))
	_subtitle_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_subtitle_label.position = Vector2(10, 60)
	_subtitle_label.custom_minimum_size = Vector2(300, 20)
	_subtitle_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_mount.add_child(_subtitle_label)

	_animate()

func _animate():
	var viewport_size = get_viewport().get_visible_rect().size
	var mount_width = _frame_rect.custom_minimum_size.x + _bullet_rect.custom_minimum_size.x - 30
	var mount_height = 90.0

	var start_x = -(mount_width + 200)
	var center_x = (viewport_size.x - mount_width) / 2.0
	var end_x = viewport_size.x + 200
	var center_y = (viewport_size.y - mount_height) / 2.0 - 20

	_mount.position = Vector2(start_x, center_y)

	var tween = create_tween()

	tween.tween_property(_bg, "color:a", 0.85, 0.15)

	tween.tween_property(_mount, "position:x", center_x, 0.35).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)

	tween.tween_interval(1.2)

	tween.tween_property(_mount, "position:x", end_x, 0.25).set_ease(Tween.EASE_IN).set_trans(Tween.TRANS_CUBIC)
	tween.parallel().tween_property(_bg, "color:a", 0.0, 0.25)

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
