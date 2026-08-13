class_name TrialManifest
extends RefCounted
## The whole trial.json, parsed once by TrialLoader into typed objects, so no
## consumer has to walk nested Dictionaries.

var trial_name: String = ""
var format_version: String = ""
## Bench slots: character-id Strings, or null for an empty bench. Untyped
## because those nulls are meaningful.
var character_ids: Array = []
var script_lines: Array[ScriptLine] = []
var minigames: Array[MinigameData] = []
## Truth bullets stay Dictionaries; TruthBulletManager owns their shape.
var truth_bullets: Array = []


static func from_dict(d: Dictionary) -> TrialManifest:
	var manifest := TrialManifest.new()
	manifest.trial_name = d.get("trialName") if d.get("trialName") is String else ""

	var metadata = d.get("metadata")
	if metadata is Dictionary and metadata.get("version") is String:
		manifest.format_version = metadata["version"]

	if d.get("characters") is Array:
		manifest.character_ids = d["characters"]

	var script = d.get("script")
	if script is Dictionary and script.get("lines") is Array:
		for raw_line in script["lines"]:
			if raw_line is Dictionary:
				manifest.script_lines.append(ScriptLine.from_dict(raw_line))

	if d.get("minigames") is Array:
		for raw_mg in d["minigames"]:
			if raw_mg is Dictionary:
				manifest.minigames.append(MinigameData.from_dict(raw_mg))

	if d.get("truthBullets") is Array:
		manifest.truth_bullets = d["truthBullets"]

	return manifest


func find_minigame(game_id: String) -> MinigameData:
	for mg in minigames:
		if mg.game_id == game_id:
			return mg
	return null
