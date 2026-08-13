extends CanvasLayer

## Cinematic minigame title card: the banner flies in from the left, holds,
## then exits right. Layout, fonts, colors, padding and the 9-slice frame are
## all editor-owned in scenes/ui/minigame_title_card.tscn:
##   Slider (Control, anchors animated across the screen)
##     Mount (HBoxContainer, negative separation = frame/bullet overlap)
##       Frame (PanelContainer, StyleBoxTexture 9-slice — grows to fit the title)
##         Margin > Labels (VBox) > Title / Subtitle
##       Bullet (TextureRect)
## Flight, hold and background fade are all the `fly` animation. It keys the
## Slider's anchors, which are proportional, so the card clears the screen at
## any resolution.
##
## Code binds data only: title text, title color, texture variant, and Mount's
## centering offset, which depends on the content-driven banner width.

signal card_finished

@export_group("Layout")
@export var vertical_offset: float = -20.0

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

# The scene ships the blue variants; orange loads on demand.
const FRAME_ORANGE := "res://textures/ui/minigame_name_frame_orange.png"
const BULLET_ORANGE := "res://textures/ui/minigame_name_speed_bullet_orange.png"

@onready var _mount: HBoxContainer = %Mount
@onready var _frame: PanelContainer = %Frame
@onready var _bullet: TextureRect = %Bullet
@onready var _title_label: Label = %Title
@onready var _subtitle_label: Label = %Subtitle
@onready var _anim: AnimationPlayer = %AnimationPlayer

func show_title(game_type: String, game_name: String = "") -> void:
	var color: Color = title_colors.get(game_type, Color(0.8, 0.8, 0.8))
	var display_name: String = game_name if not game_name.is_empty() else title_names.get(game_type, game_type.to_upper())

	# Orange trim for nonstop debate, blue for everything else.
	if game_type == "nonstop_debate":
		var style := _frame.get_theme_stylebox("panel") as StyleBoxTexture
		if style:
			style.texture = load(FRAME_ORANGE)
		_bullet.texture = load(BULLET_ORANGE)

	_title_label.text = display_name
	_title_label.add_theme_color_override("font_color", color)
	_subtitle_label.add_theme_color_override("font_color", Color(color, 0.9))

	# The containers must recompute the banner width before it can be centred.
	_mount.reset_size()
	await get_tree().process_frame
	_mount.position = Vector2(-_mount.size.x / 2.0, -_mount.size.y / 2.0 + vertical_offset)

	_anim.play("fly")
	await _anim.animation_finished
	card_finished.emit()
	queue_free()
