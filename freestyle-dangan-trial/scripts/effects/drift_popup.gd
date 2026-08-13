extends Control

## Small "+10" / "-10" popup that drifts up and fades. Drift distance, timing
## and font are scene-owned; the caller supplies position, text and tint.

func _ready():
	var anim: AnimationPlayer = %AnimationPlayer
	anim.animation_finished.connect(func(_name): queue_free())

func setup(text: String, color: Color):
	var label: Label = %Label
	label.text = text
	label.modulate = Color(color.r, color.g, color.b, label.modulate.a)
