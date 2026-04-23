extends Node

signal concentrate_changed(current: float, maximum: float)
signal concentrate_empty

var max_concentrate: float = 100.0
var current_concentrate: float = 100.0

const DRAIN_RATE: float = 30.0
const REFILL_RATE: float = 5.0

func drain(delta: float) -> bool:
	current_concentrate -= DRAIN_RATE * delta
	if current_concentrate <= 0.0:
		current_concentrate = 0.0
		concentrate_empty.emit()
		concentrate_changed.emit(current_concentrate, max_concentrate)
		return false
	concentrate_changed.emit(current_concentrate, max_concentrate)
	return true

func refill(delta: float):
	if current_concentrate < max_concentrate:
		current_concentrate = minf(current_concentrate + REFILL_RATE * delta, max_concentrate)
		concentrate_changed.emit(current_concentrate, max_concentrate)

func reset(max_val: float = 100.0):
	max_concentrate = max_val
	current_concentrate = max_val
	concentrate_changed.emit(current_concentrate, max_concentrate)

func is_empty() -> bool:
	return current_concentrate <= 0.0
