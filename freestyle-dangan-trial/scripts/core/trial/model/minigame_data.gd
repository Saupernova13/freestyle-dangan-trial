class_name MinigameData
extends RefCounted
## One entry from trial.json's minigames catalog. Common fields are typed;
## type_specific stays a Dictionary, because its shape belongs to each
## minigame rather than to the loader.

## The only difficulties any lookup table knows. An unrecognised one used to
## fall back silently in four independent places - spawn interval, difficulty
## multiplier, floating-letter speed and damage per wrong answer - so "Hard"
## with a capital H produced a minigame tuned to medium in four dimensions and
## said nothing.
const DIFFICULTIES := ["easy", "medium", "hard"]
const DEFAULT_DIFFICULTY := "medium"

## 0 means no time limit, which MinigameBase already treats as the absence of a
## timer at both gates. An hour is well past any authored round and stops a
## stray 999999 from making a timer nothing will ever see expire.
const DEFAULT_TIME_LIMIT := 60.0
const MAX_TIME_LIMIT := 3600.0

var game_id: String = ""
var name: String = ""
var game_type: String = ""
var difficulty: String = DEFAULT_DIFFICULTY
var time_limit: float = DEFAULT_TIME_LIMIT
var fail_comment: String = ""
var type_specific: Dictionary = {}


static func from_dict(d: Dictionary) -> MinigameData:
	var mg := MinigameData.new()
	mg.game_id = d.get("gameId") if d.get("gameId") is String else ""
	mg.name = d.get("name") if d.get("name") is String else ""
	mg.game_type = d.get("gameType") if d.get("gameType") is String else ""
	mg.difficulty = _parse_difficulty(d.get("difficulty"), mg.game_id)
	mg.time_limit = _parse_time_limit(d.get("timeLimit"), mg.game_id)
	mg.fail_comment = d.get("failComment") if d.get("failComment") is String else ""
	mg.type_specific = d.get("typeSpecific") if d.get("typeSpecific") is Dictionary else {}
	return mg


## Type-checked and range-checked. A negative limit failed both of
## MinigameBase's `time_limit > 0` gates, so no timer started and the HUD timer
## was instantiated invisible and dead - the minigame had no time-out fail path
## at all, and any other authoring mistake that made it unwinnable then trapped
## the player. sprite_index is clamped at parse time for exactly this reason;
## the idiom was applied to what the player sets and withheld from what the
## author sets.
static func _parse_time_limit(raw: Variant, game_id: String) -> float:
	if raw == null:
		return DEFAULT_TIME_LIMIT
	if not (raw is int or raw is float):
		Log.warn(
			"MinigameData",
			(
				"Minigame %s has timeLimit %s; using %ss"
				% [game_id, JSON.stringify(raw), DEFAULT_TIME_LIMIT]
			)
		)
		return DEFAULT_TIME_LIMIT

	var limit := float(raw)
	# 0 is a deliberate "no time limit"; below it is a mistake, not a choice,
	# and silently reading it as unlimited would keep the trap it caused.
	if limit < 0.0:
		Log.warn(
			"MinigameData",
			"Minigame %s has a negative timeLimit (%s); using %ss" % [game_id, limit, DEFAULT_TIME_LIMIT]
		)
		return DEFAULT_TIME_LIMIT
	if limit > MAX_TIME_LIMIT:
		Log.warn(
			"MinigameData",
			"Minigame %s has timeLimit %ss; capping at %ss" % [game_id, limit, MAX_TIME_LIMIT]
		)
		return MAX_TIME_LIMIT
	return limit


## Normalised once, here, so the four tables that key on it cannot disagree
## about what an unknown value means - and so the author hears about it once at
## load rather than never.
static func _parse_difficulty(raw: Variant, game_id: String) -> String:
	if raw == null:
		return DEFAULT_DIFFICULTY
	if raw is String and DIFFICULTIES.has(raw):
		return raw
	Log.warn(
		"MinigameData",
		(
			"Minigame %s has difficulty %s; using '%s'"
			% [game_id, JSON.stringify(raw), DEFAULT_DIFFICULTY]
		)
	)
	return DEFAULT_DIFFICULTY
