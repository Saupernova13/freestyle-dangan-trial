extends CanvasLayer

signal card_finished

## Cinematic minigame title card. Frame + bullet fly in from the left, pause,
## then fly out to the right. NonstopDebate uses the orange variant; all other
## minigames use blue. Tweak timing and sizing in the inspector.

@export_group("Animation")
@export var fly_in_duration: float = 0.35
@export var hold_duration: float = 1.2
@export var fly_out_duration: float = 0.25
@export var bg_fade_in_duration: float = 0.15
@export var bg_fade_out_duration: float = 0.25
@export var bg_max_alpha: float = 0.85

@export_group("Layout")
@export var title_font_size: int = 44
@export var subtitle_font_size: int = 14
@export var frame_height: float = 110.0
@export var bullet_width: float = 220.0
@export var bullet_overlap: float = 40.0
@export var minimum_frame_width: float = 480.0
@export var frame_text_padding: float = 140.0
@export var vertical_offset: float = -20.0

@export_group("Style")
@export var subtitle_text: String = "CLASS TRIAL"
@export var text_outline_color: Color = Color(0, 0, 0, 0.8)
@export var title_outline_size: int = 4
@export var subtitle_outline_size: int = 3

@export_group("Title Colors")
@export var title_colors: Dictionary = {
	"nonstop_debate": Color(1.0, 0.5, 0.1),
	"hangmans_gambit": Color(0.7, 0.3, 1.0),
	"logic_dive": Color(0.2, 0.8, 1.0),
	"debate_scrum": Color(1.0, 0.8, 0.1),
	"mass_panic_debate": Color(1.0, 0.2, 0.2),
	"rebuttal_showdown": Color(0.9, 0.4, 0.6),
	"psyche_taxi": Color(0.2, 0.8, 0.6),
	"closing_argument": Color(0.8, 0.7, 0.2),
}

@export var title_names: Dictionary = {
	"nonstop_debate": "NONSTOP DEBATE",
	"hangmans_gambit": "HANGMAN'S GAMBIT",
	"logic_dive": "LOGIC DIVE",
	"debate_scrum": "DEBATE SCRUM",
	"mass_panic_debate": "MASS PANIC DEBATE",
	"rebuttal_showdown": "REBUTTAL SHOWDOWN",
	"psyche_taxi": "PSYCHE TAXI",
	"closing_argument": "CLOSING ARGUMENT",
}

var _bg: ColorRect
var _mount: Control
var _frame_rect: TextureRect
var _bullet_rect: TextureRect
var _title_label: Label
var _subtitle_label: Label

func _ready():
	layer = 25

func show_title(game_type: String, game_name: String = ""):
	var color = title_colors.get(game_type, Color(0.8, 0.8, 0.8))
	var display_name = game_name if not game_name.is_empty() else title_names.get(game_type, game_type.to_upper())
	var use_orange = game_type == "nonstop_debate"

	var frame_tex_path = "res://textures/ui/lower_res/minigame_name_frame_%s.png" % ("orange" if use_orange else "blue")
	var bullet_tex_path = "res://textures/ui/lower_res/minigame_name_speed_bullet_%s.png" % ("orange" if use_orange else "blue")

	var frame_tex = load(frame_tex_path)
	var bullet_tex = load(bullet_tex_path)

	if not frame_tex or not bullet_tex:
		push_error("Failed to load minigame title textures")
		queue_free()
		return

	# Measure text to size frame to fit the title
	var font = ThemeDB.fallback_font
	var text_size = font.get_string_size(display_name, HORIZONTAL_ALIGNMENT_LEFT, -1, title_font_size)
	var frame_width = maxf(text_size.x + frame_text_padding, minimum_frame_width)

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
	_frame_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_frame_rect.stretch_mode = TextureRect.STRETCH_SCALE
	_frame_rect.size = Vector2(frame_width, frame_height)
	_frame_rect.position = Vector2(0, 0)
	_frame_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_mount.add_child(_frame_rect)

	_bullet_rect = TextureRect.new()
	_bullet_rect.texture = bullet_tex
	_bullet_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_bullet_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_bullet_rect.size = Vector2(bullet_width, frame_height)
	_bullet_rect.position = Vector2(frame_width - bullet_overlap, 0)
	_bullet_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_mount.add_child(_bullet_rect)

	_title_label = Label.new()
	_title_label.text = display_name
	_title_label.add_theme_font_size_override("font_size", title_font_size)
	_title_label.add_theme_color_override("font_color", color)
	_title_label.add_theme_constant_override("outline_size", title_outline_size)
	_title_label.add_theme_color_override("font_outline_color", text_outline_color)
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_title_label.size = Vector2(frame_width, frame_height * 0.65)
	_title_label.position = Vector2(0, frame_height * 0.08)
	_title_label.z_index = 10
	_title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_mount.add_child(_title_label)

	_subtitle_label = Label.new()
	_subtitle_label.text = subtitle_text
	_subtitle_label.add_theme_font_size_override("font_size", subtitle_font_size)
	_subtitle_label.add_theme_color_override("font_color", Color(color, 0.9))
	_subtitle_label.add_theme_constant_override("outline_size", subtitle_outline_size)
	_subtitle_label.add_theme_color_override("font_outline_color", text_outline_color)
	_subtitle_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_subtitle_label.position = Vector2(0, frame_height * 0.72)
	_subtitle_label.size = Vector2(frame_width, 20)
	_subtitle_label.z_index = 10
	_subtitle_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_mount.add_child(_subtitle_label)

	_animate(frame_width)

func _animate(frame_width: float):
	var viewport_size = get_viewport().get_visible_rect().size
	var mount_width = frame_width + bullet_width - bullet_overlap

	var start_x = -(mount_width + 200)
	var center_x = (viewport_size.x - mount_width) / 2.0
	var end_x = viewport_size.x + 200
	var center_y = (viewport_size.y - frame_height) / 2.0 + vertical_offset

	_mount.position = Vector2(start_x, center_y)

	var tween = create_tween()

	tween.tween_property(_bg, "color:a", bg_max_alpha, bg_fade_in_duration)

	tween.tween_property(_mount, "position:x", center_x, fly_in_duration).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)

	tween.tween_interval(hold_duration)

	tween.tween_property(_mount, "position:x", end_x, fly_out_duration).set_ease(Tween.EASE_IN).set_trans(Tween.TRANS_CUBIC)
	tween.parallel().tween_property(_bg, "color:a", 0.0, bg_fade_out_duration)

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
