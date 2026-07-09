extends PathFollow2D

## One character of the roaming background text. Scene-driven — see
## scenes/ui/roaming_char.tscn. Edit the font, size, color, and z-index on the
## Label, and the orbit speed curve in the looping `orbit` animation.
## The caller supplies only the character, its phase along the path, how long a
## full lap takes, and the travel direction.

func setup(character: String, phase: float, lap_duration: float, forward: bool, animate: bool = true) -> void:
	var label: Label = %Label
	label.text = character
	progress_ratio = phase
	if not animate:
		return

	# The orbit clip is one lap long; stretch it to lap_duration.
	var anim: AnimationPlayer = %AnimationPlayer
	anim.speed_scale = 1.0 / maxf(lap_duration, 0.01)
	anim.play("orbit", -1.0, 1.0 if forward else -1.0, not forward)
	anim.seek(phase, true)
