extends Node
## Global seeded randomness: one seed per launch drives every minigame's
## procedural variation, so a whole session replays from it.
## Set DANGAN_SEED to force a specific seed.

var seed_value: int = 0

# Keeps repeated stream() calls on one label distinct but still reproducible.
var _stream_counts: Dictionary = {}

func _ready() -> void:
	var override_seed := OS.get_environment("DANGAN_SEED")
	if override_seed != "" and override_seed.is_valid_int():
		seed_value = override_seed.to_int()
	else:
		var entropy := RandomNumberGenerator.new()
		entropy.randomize()
		seed_value = entropy.randi()
	Log.info("GameRandom", "Session seed = %d" % seed_value)

## Each call on a label yields a distinct stream, so repeated plays differ while
## one seed still reproduces the whole call sequence.
func stream(label: String) -> RandomNumberGenerator:
	var index: int = _stream_counts.get(label, 0)
	_stream_counts[label] = index + 1
	var rng := RandomNumberGenerator.new()
	rng.seed = hash("%d:%s:%d" % [seed_value, label, index])
	return rng

## Seeded by the session alone, so every call on a label repeats the identical
## sequence. For session-wide "personality" values, not per-instance rolls.
func session_stream(label: String) -> RandomNumberGenerator:
	var rng := RandomNumberGenerator.new()
	rng.seed = hash("%d:%s" % [seed_value, label])
	return rng

## Resets every stream counter, so the next stream() calls start fresh.
func reseed(value: int) -> void:
	seed_value = value
	_stream_counts.clear()

## In-place Fisher-Yates: Array.shuffle() only uses the global RNG, which the
## session seed does not drive.
static func shuffle_with(array: Array, rng: RandomNumberGenerator) -> void:
	for i in range(array.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var tmp = array[i]
		array[i] = array[j]
		array[j] = tmp
