extends CanvasLayer

## Cinematic minigame title card — frame + bullet textures fly in from left,
## hold, then fly out to the right. Scene-driven: scenes/ui/minigame_title_card.tscn
## Edit the node tree (background, mount, frame, bullet, labels) and the
## bg_fade_in / bg_fade_out animations in the editor.
##
## Fly-in/out positions are computed from viewport size + dynamic frame width
## (which depends on the title text), so the mount position uses Tween instead
## of AnimationPlayer — AnimationPlayer animations have fixed end values.

signal card_finished

@export_group("Animation")
@export var fly_in_duration: float = 0.35
@export var hold_duration: float = 1.2
@export var fly_out_duration: float = 0.25

@export_group("Layout")
@export var frame_height: float = 110.0
@export var bullet_width: float = 220.0
@export var bullet_overlap: float = 40.0
@export var minimum_frame_width: float = 480.0
@export var frame_text_padding: float = 140.0
@export var vertical_offset: float = -20.0

@export_group("Style")
@export var subtitle_text: String = "CLASS TRIAL"

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

@onready var _bg: ColorRect = %Background
@onready var _mount: Control = %Mount
@onready var _frame_rect: TextureRect = %Frame
@onready var _bullet_rect: TextureRect = %Bullet
@onready var _title_label: Label = %Title
@onready var _subtitle_label: Label = %Subtitle
@onready var _anim: AnimationPlayer = %AnimationPlayer

func show_title(game_type: String, game_name: String = ""):
	var color = title_colors.get(game_type, Color(0.8, 0.8, 0.8))
	var display_name = game_name if not game_name.is_empty() else title_names.get(game_type, game_type.to_upper())
	var use_orange = game_type == "nonstop_debate"

	var frame_tex_path = "res://textures/ui/lower_res/minigame_name_frame_%s.png" % ("orange" if use_orange else "blue")
	var bullet_tex_path = "res://textures/ui/lower_res/minigame_name_speed_bullet_%s.png" % ("orange" if use_orange else "blue")

	_frame_rect.texture = load(frame_tex_path)
	_bullet_rect.texture = load(bullet_tex_path)

	# Compute frame width from title text size
	var font = ThemeDB.fallback_font
	var text_size = font.get_string_size(display_name, HORIZONTAL_ALIGNMENT_LEFT, -1, _title_label.get_theme_font_size("font_size"))
	var frame_width = maxf(text_size.x + frame_text_padding, minimum_frame_width)

	# Layout mount children based on computed widths
	_frame_rect.size = Vector2(frame_width, frame_height)
	_frame_rect.position = Vector2.ZERO
	_bullet_rect.size = Vector2(bullet_width, frame_height)
	_bullet_rect.position = Vector2(frame_width - bullet_overlap, 0)

	_title_label.text = display_name
	_title_label.add_theme_color_override("font_color", color)
	_title_label.size = Vector2(frame_width, frame_height * 0.65)
	_title_label.position = Vector2(0, frame_height * 0.08)

	_subtitle_label.text = subtitle_text
	_subtitle_label.add_theme_color_override("font_color", Color(color, 0.9))
	_subtitle_label.size = Vector2(frame_width, 20)
	_subtitle_label.position = Vector2(0, frame_height * 0.72)

	_animate(frame_width)

func _animate(frame_width: float):
	var viewport_size = get_viewport().get_visible_rect().size
	var mount_width = frame_width + bullet_width - bullet_overlap

	var start_x = -(mount_width + 200)
	var center_x = (viewport_size.x - mount_width) / 2.0
	var end_x = viewport_size.x + 200
	var center_y = (viewport_size.y - frame_height) / 2.0 + vertical_offset

	_mount.position = Vector2(start_x, center_y)

	if _anim and _anim.has_animation("bg_fade_in"):
		_anim.play("bg_fade_in")

	var tween = create_tween()
	tween.tween_property(_mount, "position:x", center_x, fly_in_duration).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	tween.tween_interval(hold_duration)
	tween.tween_property(_mount, "position:x", end_x, fly_out_duration).set_ease(Tween.EASE_IN).set_trans(Tween.TRANS_CUBIC)
	tween.parallel().tween_callback(func():
		if _anim and _anim.has_animation("bg_fade_out"):
			_anim.play("bg_fade_out")
	)
	tween.finished.connect(func():
		card_finished.emit()
		queue_free()
	)

func show_result(success: bool):
	# Result card uses a simpler programmatic Label since it's a different
	# style (full-screen ALL RIGHT / WRONG flash). Could be split into its
	# own scene later if needed.
	_bg.color.a = 0.0
	_mount.visible = false

	var result_label = Label.new()
	result_label.text = "ALL RIGHT!" if success else "WRONG!"
	result_label.add_theme_font_size_override("font_size", 64)
	var color = Color(0.2, 1.0, 0.4) if success else Color(1.0, 0.2, 0.2)
	result_label.add_theme_color_override("font_color", color)
	result_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	result_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	result_label.set_anchors_preset(Control.PRESET_CENTER)
	result_label.grow_horizontal = Control.GROW_DIRECTION_BOTH
	result_label.grow_vertical = Control.GROW_DIRECTION_BOTH
	result_label.modulate.a = 0.0
	result_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(result_label)

	var tween = create_tween()
	tween.tween_property(_bg, "color:a", 0.7, 0.15)
	tween.parallel().tween_property(result_label, "modulate:a", 1.0, 0.1)
	tween.parallel().tween_property(result_label, "scale", Vector2(1.0, 1.0), 0.2).from(Vector2(2.0, 2.0)).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	tween.tween_interval(1.0)
	tween.tween_property(_bg, "color:a", 0.0, 0.3)
	tween.parallel().tween_property(result_label, "modulate:a", 0.0, 0.3)
	tween.finished.connect(func():
		card_finished.emit()
		queue_free()
	)
