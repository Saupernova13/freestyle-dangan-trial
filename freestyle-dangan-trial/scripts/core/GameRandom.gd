extends Node
##
## Global seeded randomness. One seed is chosen per game launch and drives all
## minigame procedural variation, so an entire session is reproducible from it.
## Set the DANGAN_SEED environment variable to force a specific seed.

var seed_value: int = 0

# Per-label call counter so repeated stream() calls with the same label still
# produce distinct (but reproducible) streams.
var _stream_counts: Dictionary = {}

func _ready() -> void:
	var override_seed := OS.get_environment("DANGAN_SEED")
	if override_seed != "" and override_seed.is_valid_int():
		seed_value = override_seed.to_int()
	else:
		var entropy := RandomNumberGenerator.new()
		entropy.randomize()
		seed_value = entropy.randi()
	print("GameRandom: session seed = ", seed_value)

## Returns a fresh RNG for `label`. Each call with the same label yields a
## distinct stream (so repeated plays of one minigame differ), while the same
## seed always reproduces the same sequence of calls.
func stream(label: String) -> RandomNumberGenerator:
	var index: int = _stream_counts.get(label, 0)
	_stream_counts[label] = index + 1
	var rng := RandomNumberGenerator.new()
	rng.seed = hash("%d:%s:%d" % [seed_value, label, index])
	return rng

## Force a specific seed (e.g. for testing). Resets all stream counters so the
## next stream() calls start fresh.
func reseed(value: int) -> void:
	seed_value = value
	_stream_counts.clear()

## Fisher-Yates shuffle of `array` in place using `rng` — the engine's built-in
## Array.shuffle() can only use the global RNG, which would not be seed-driven.
static func shuffle_with(array: Array, rng: RandomNumberGenerator) -> void:
	for i in range(array.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var tmp = array[i]
		array[i] = array[j]
		array[j] = tmp
