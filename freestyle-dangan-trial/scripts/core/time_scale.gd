class_name TimeScale
extends RefCounted
## The single owner of Engine.time_scale.
##
## Four sites used to assign it absolutely, with no ref-counting and no
## save/restore, so whichever released last won. The crosshair's focus mode is
## the dangerous one: its node is freed with the minigame, so a player still
## holding right-mouse when the game ends left the trial running at 0.3 for
## good - typewriter, camera tweens and every timer stretched, with no way back
## short of finding another minigame with a crosshair.
##
## Callers request a scale under a key and release the same key. Nothing writes
## Engine.time_scale directly.

## key -> requested scale. Never assigned to from outside.
static var _requests: Dictionary = {}


## The slowest outstanding request wins, so an impact frame still reads as an
## impact while focus mode is held rather than being cancelled by it.
static func request(key: StringName, scale: float) -> void:
	_requests[key] = scale
	_apply()


## Safe to call for a key that was never requested, which is what lets a
## teardown release unconditionally without tracking whether it ever held one.
static func release(key: StringName) -> void:
	_requests.erase(key)
	_apply()


## For a scene change or a game-over, where the nodes holding requests are about
## to be freed and their releases will never run.
static func release_all() -> void:
	_requests.clear()
	_apply()


static func _apply() -> void:
	var scale := 1.0
	for key in _requests:
		scale = minf(scale, _requests[key])
	Engine.time_scale = scale
