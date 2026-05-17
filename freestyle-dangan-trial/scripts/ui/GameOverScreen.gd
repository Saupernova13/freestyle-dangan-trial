extends CanvasLayer

## Game over overlay. Scene-driven — see scenes/ui/game_over_screen.tscn.
## Edit the button styles, layout, title text, and show/dismiss animations
## directly in the scene file.

signal retry_requested
signal return_to_menu

@onready var _retry_btn: Button = %RetryButton
@onready var _menu_btn: Button = %MenuButton
@onready var _anim: AnimationPlayer = %AnimationPlayer

func _ready():
	_retry_btn.pressed.connect(func():
		_dismiss()
		retry_requested.emit()
	)
	_menu_btn.pressed.connect(func():
		_dismiss()
		return_to_menu.emit()
	)

func show_game_over():
	if _anim and _anim.has_animation("show"):
		_anim.play("show")

func _dismiss():
	if _anim and _anim.has_animation("dismiss"):
		_anim.play("dismiss")
		await _anim.animation_finished
	queue_free()
