class_name EvidenceCard
extends PanelContainer
## The "TRUTH BULLET" card shown on a break. Layout, styling and the
## appear/dismiss animations are scene-owned; this binds the name and plays
## the clips.

@onready var _name: Label = %Name
@onready var _anim: AnimationPlayer = %AnimationPlayer

func show_evidence(evidence_name: String) -> void:
	_name.text = evidence_name
	_anim.play("appear")

func dismiss() -> void:
	_anim.play("dismiss")
	await _anim.animation_finished
	queue_free()
