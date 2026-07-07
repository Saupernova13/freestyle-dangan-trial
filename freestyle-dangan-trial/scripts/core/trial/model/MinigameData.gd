class_name MinigameData
extends RefCounted
## One minigame definition from trial.json's minigames catalog. Common fields
## are typed; type_specific stays a Dictionary because its shape belongs to
## each minigame implementation (and its editor view), not to the loader.

var game_id: String = ""
var name: String = ""
var game_type: String = ""
var difficulty: String = "medium"
var time_limit: float = 60.0
var fail_comment: String = ""
var type_specific: Dictionary = {}


static func from_dict(d: Dictionary) -> MinigameData:
	var mg := MinigameData.new()
	mg.game_id = d.get("gameId") if d.get("gameId") is String else ""
	mg.name = d.get("name") if d.get("name") is String else ""
	mg.game_type = d.get("gameType") if d.get("gameType") is String else ""
	mg.difficulty = d.get("difficulty") if d.get("difficulty") is String else "medium"
	var raw_limit = d.get("timeLimit")
	mg.time_limit = float(raw_limit) if (raw_limit is int or raw_limit is float) else 60.0
	mg.fail_comment = d.get("failComment") if d.get("failComment") is String else ""
	mg.type_specific = d.get("typeSpecific") if d.get("typeSpecific") is Dictionary else {}
	return mg
