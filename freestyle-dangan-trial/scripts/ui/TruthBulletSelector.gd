extends CanvasLayer

## Spinning truth-bullet HUD shown in the bottom-left during minigames.
## Scene-driven — see scenes/ui/truth_bullet_selector.tscn.
##
## All positioning, sizing, colors, and the looping idle rotation animation
## are editable directly in the scene file via the editor.
## This script handles signal hookups, text updates, and lie-mode coloring.

@export var bullet_text_color: Color = Color(1, 1, 1, 1)
@export var lie_color: Color = Color(1.0, 0.3, 0.3)

@onready var _bullet_text: Label = %BulletText
@onready var _anim: AnimationPlayer = %AnimationPlayer

func _ready():
	TruthBulletManager.bullet_selected.connect(_on_bullet_selected)
	TruthBulletManager.lie_mode_changed.connect(_on_lie_mode_changed)
	InputManager.bullet_next.connect(func(): TruthBulletManager.cycle_next())
	InputManager.bullet_prev.connect(func(): TruthBulletManager.cycle_prev())
	visible = false

func show_selector():
	visible = true
	if _anim and not _anim.is_playing():
		_anim.play("idle")

func hide_selector():
	visible = false
	if _anim and _anim.is_playing():
		_anim.stop()

func _on_bullet_selected(_bullet: Dictionary):
	_bullet_text.text = TruthBulletManager.get_current_display_name()
	_apply_lie_color()

func _on_lie_mode_changed(_enabled: bool):
	_apply_lie_color()

func _apply_lie_color():
	var color = lie_color if TruthBulletManager.lie_mode else bullet_text_color
	_bullet_text.add_theme_color_override("font_color", color)
