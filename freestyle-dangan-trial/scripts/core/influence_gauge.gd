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
	var was_above_zero := current_influence > 0.0
	current_influence = max(0.0, current_influence - amount)
	damage_taken.emit(amount)
	influence_changed.emit(current_influence, max_influence)

	# On the transition only. The floor is clamped but the test was `<= 0`, so
	# every further hit at zero re-emitted this - and TrialRoomManager wires it
	# straight to _on_game_over, which instantiates a fresh game_over_screen
	# each time. Two hits in one frame stacked two screens: the player dismissed
	# one and found another behind it.
	if was_above_zero and current_influence <= 0.0:
		influence_depleted.emit()
