extends CanvasLayer

## Nonstop-debate ambience overlay: darkens the scene and applies the red
## debate filter. Scene-driven — see scenes/minigames/debate_ambience.tscn.
## Edit the grade (tint, desaturation, vignette) on the TintRect material and
## the fade timing in the show/dismiss animations.

@onready var _anim: AnimationPlayer = %AnimationPlayer

func show_ambience():
	if _anim and _anim.has_animation("show"):
		_anim.play("show")

func dismiss():
	if _anim and _anim.has_animation("dismiss"):
		_anim.play("dismiss")
		await _anim.animation_finished
	queue_free()
