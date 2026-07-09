class_name EvidenceCard
extends PanelContainer
## The "TRUTH BULLET" card shown when the player breaks a statement. Layout,
## styling and the appear/dismiss animations are scene-owned
## (scenes/minigames/evidence_card.tscn); this script only binds the name and
## triggers the animations.

@onready var _name: Label = %Name
@onready var _anim: AnimationPlayer = %AnimationPlayer

func show_evidence(evidence_name: String) -> void:
	_name.text = evidence_name
	_anim.play("appear")

func dismiss() -> void:
	_anim.play("dismiss")
	await _anim.animation_finished
	queue_free()
