extends CanvasLayer
## Blue vignette shown while slow-time is held. Tint and fade timing are in
## the scene's show/dismiss animations.

@onready var _anim: AnimationPlayer = %AnimationPlayer

func show_vignette():
	_anim.play("show")

func hide_vignette():
	_anim.play("dismiss")
