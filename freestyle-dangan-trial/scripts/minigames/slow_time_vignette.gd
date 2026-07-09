extends CanvasLayer

## Blue vignette shown while the player holds slow-time in a debate.
## Scene-driven — see scenes/minigames/slow_time_vignette.tscn. Edit the tint
## and the fade timing in the scene's show/dismiss animations.

@onready var _anim: AnimationPlayer = %AnimationPlayer

func show_vignette():
	_anim.play("show")

func hide_vignette():
	_anim.play("dismiss")
