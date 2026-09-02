extends CanvasLayer
## BREAK! sequence: freezes the viewport, cracks and shatters it over black,
## then zooms the BREAK! text past the camera. One break_sequence timeline in
## scenes/minigames/break_shatter.tscn; this script captures the screenshot and
## starts the animation.

@onready var _frozen: TextureRect = %FrozenFrame
@onready var _anim: AnimationPlayer = %AnimationPlayer

## impact_uv is the refuted panel's screen UV; cracks radiate from it.
## Awaitable: it returns when the sequence has played, which is how
## nonstop_debate sequences the evidence card after it.
func play_break(impact_uv: Vector2 = Vector2(0.5, 0.5)):
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	_frozen.texture = ImageTexture.create_from_image(img)
	var mat := _frozen.material as ShaderMaterial
	if mat:
		mat.set_shader_parameter("impact_center", impact_uv)
	visible = true
	if _anim and _anim.has_animation("break_sequence"):
		_anim.play("break_sequence")
		await _anim.animation_finished
	queue_free()
