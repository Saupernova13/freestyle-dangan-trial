extends CanvasLayer
## Spinning truth-bullet HUD, bottom-left during minigames. Look and the looping
## idle rotation are editor-owned; this script wires signals, updates text and
## applies lie-mode coloring.

@export var bullet_text_color: Color = Color(1, 1, 1, 1)
@export var lie_color: Color = Color(1.0, 0.3, 0.3)

@onready var _bullet_text: Label = %BulletText
@onready var _anim: AnimationPlayer = %AnimationPlayer

func _ready():
	TruthBulletManager.bullet_selected.connect(_on_bullet_selected)
	TruthBulletManager.lie_mode_changed.connect(_on_lie_mode_changed)
	InputManager.bullet_next.connect(TruthBulletManager.cycle_next)
	InputManager.bullet_prev.connect(TruthBulletManager.cycle_prev)
	# Tapping the selector cycles too, as a backup to MobileHud's buttons.
	%Anchor.gui_input.connect(_on_gui_input)
	visible = false

func _exit_tree():
	if InputManager.bullet_next.is_connected(TruthBulletManager.cycle_next):
		InputManager.bullet_next.disconnect(TruthBulletManager.cycle_next)
	if InputManager.bullet_prev.is_connected(TruthBulletManager.cycle_prev):
		InputManager.bullet_prev.disconnect(TruthBulletManager.cycle_prev)

func _on_gui_input(event: InputEvent) -> void:
	var is_tap: bool = (event is InputEventScreenTouch and event.pressed) \
		or (event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT)
	if is_tap:
		TruthBulletManager.cycle_next()

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
