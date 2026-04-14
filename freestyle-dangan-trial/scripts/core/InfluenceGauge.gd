extends Node

signal influence_changed(current: float, maximum: float)
signal influence_depleted
signal damage_taken(amount: float)

var max_influence: float = 100.0
var current_influence: float = 100.0

var _damage_values: Dictionary = {
	"easy": 10.0,
	"medium": 20.0,
	"hard": 30.0
}

func reset(max_val: float = 100.0):
	max_influence = max_val
	current_influence = max_val
	influence_changed.emit(current_influence, max_influence)

func take_damage(difficulty: String = "medium"):
	var amount = _damage_values.get(difficulty, 20.0)
	take_damage_raw(amount)

func take_damage_raw(amount: float):
	current_influence = max(0.0, current_influence - amount)
	damage_taken.emit(amount)
	influence_changed.emit(current_influence, max_influence)
	AudioManager.play_sfx("influence_damage")

	if current_influence <= 0:
		influence_depleted.emit()

func heal(amount: float):
	current_influence = min(max_influence, current_influence + amount)
	influence_changed.emit(current_influence, max_influence)

func get_percentage() -> float:
	if max_influence <= 0:
		return 0.0
	return current_influence / max_influence

func is_alive() -> bool:
	return current_influence > 0
