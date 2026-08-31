extends CanvasLayer
## Game over overlay. Button styles, layout, title text and the show/dismiss
## animations are all editable in scenes/ui/game_over_screen.tscn.

signal retry_requested
signal return_to_menu

@onready var _retry_btn: Button = %RetryButton
@onready var _menu_btn: Button = %MenuButton
@onready var _anim: AnimationPlayer = %AnimationPlayer

var _dismissing: bool = false

func _ready():
	_retry_btn.pressed.connect(func():
		await _dismiss()
		retry_requested.emit()
	)
	_menu_btn.pressed.connect(func():
		await _dismiss()
		return_to_menu.emit()
	)

func show_game_over():
	if _anim and _anim.has_animation("show"):
		_anim.play("show")

## Both listeners tear the scene down, so the caller must await this or the
## dismiss animation is cut off in the same frame it starts.
func _dismiss():
	if _dismissing:
		return
	_dismissing = true
	# The animation now has a real window to play in, so the buttons stay
	# clickable during it; disable them or a second press reloads twice.
	_retry_btn.disabled = true
	_menu_btn.disabled = true
	if _anim and _anim.has_animation("dismiss"):
		_anim.play("dismiss")
		await _anim.animation_finished
	queue_free()
