extends CanvasLayer

## Nonstop-debate ambience overlay: darkens the scene and applies the red
## filter. The grade lives on the TintRect material and the fade timing in the
## show/dismiss clips, both in scenes/minigames/debate_ambience.tscn.

@onready var _anim: AnimationPlayer = %AnimationPlayer

func show_ambience():
	if _anim and _anim.has_animation("show"):
		_anim.play("show")

func dismiss():
	if _anim and _anim.has_animation("dismiss"):
		_anim.play("dismiss")
		await _anim.animation_finished
	queue_free()
