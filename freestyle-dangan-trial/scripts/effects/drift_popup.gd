extends Control

## Small "+10" / "-10" feedback popup that drifts upward and fades.
## Scene-driven — see scenes/effects/drift_popup.tscn. Edit the drift distance,
## timing, and font in the scene; the caller only supplies position, text, and
## tint.

func _ready():
	var anim: AnimationPlayer = %AnimationPlayer
	anim.animation_finished.connect(func(_name): queue_free())

func setup(text: String, color: Color):
	var label: Label = %Label
	label.text = text
	label.modulate = Color(color.r, color.g, color.b, label.modulate.a)
