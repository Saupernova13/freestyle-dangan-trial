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

var game_id: String = ""
var name: String = ""
var game_type: String = ""
var difficulty: String = DEFAULT_DIFFICULTY
var time_limit: float = 60.0
var fail_comment: String = ""
var type_specific: Dictionary = {}


static func from_dict(d: Dictionary) -> MinigameData:
	var mg := MinigameData.new()
	mg.game_id = d.get("gameId") if d.get("gameId") is String else ""
	mg.name = d.get("name") if d.get("name") is String else ""
	mg.game_type = d.get("gameType") if d.get("gameType") is String else ""
	mg.difficulty = _parse_difficulty(d.get("difficulty"), mg.game_id)
	var raw_limit = d.get("timeLimit")
	mg.time_limit = float(raw_limit) if (raw_limit is int or raw_limit is float) else 60.0
	mg.fail_comment = d.get("failComment") if d.get("failComment") is String else ""
	mg.type_specific = d.get("typeSpecific") if d.get("typeSpecific") is Dictionary else {}
	return mg


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
