extends CanvasLayer

## Game over overlay. Button styles, layout, title text and the show/dismiss
## animations are all editable in scenes/ui/game_over_screen.tscn.

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
