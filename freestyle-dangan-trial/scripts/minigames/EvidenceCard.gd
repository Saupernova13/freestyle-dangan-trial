class_name EvidenceCard
extends PanelContainer
## The "TRUTH BULLET" card shown when the player breaks a statement. Layout,
## styling and the pop-in are scene-owned (scenes/minigames/evidence_card.tscn);
## show_evidence() sets the name and plays the pop. The caller fades it out.

@onready var _name: Label = %Name
@onready var _anim: AnimationPlayer = %AnimationPlayer

func show_evidence(evidence_name: String) -> void:
	_name.text = evidence_name
	_anim.play("appear")
