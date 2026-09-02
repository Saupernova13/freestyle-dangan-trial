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
		_apply_script_order(manifest.script_lines)

	if d.get("minigames") is Array:
		for raw_mg in d["minigames"]:
			if raw_mg is Dictionary:
				manifest.minigames.append(MinigameData.from_dict(raw_mg))

	if d.get("truthBullets") is Array:
		manifest.truth_bullets = d["truthBullets"]

	return manifest


## Playback used to be array position alone, so `order` was parsed, kept in
## the schema and asserted in tests while no production code read it. Editing
## `order` in trial.json - the obvious thing to try when hand-editing, and
## exactly what the field name promises - was a silent no-op.
##
## Sorted only when EVERY line carries an explicit number. A file where some
## lines have one and some do not has no ordering to honour: the missing ones
## coerce to 0 and would all jump to the front, which is worse than ignoring
## the field. The editor writes it on every line and keeps it in sync on every
## reorder, so its output always takes this path.
static func _apply_script_order(lines: Array[ScriptLine]) -> void:
	if lines.is_empty():
		return

	var with_order := 0
	for line in lines:
		if line.has_explicit_order:
			with_order += 1
	if with_order == 0:
		return
	if with_order < lines.size():
		push_warning(
			(
				"%d of %d script lines have an 'order'; ignoring it and playing "
				+ "them in file order. Give every line an order, or none."
			)
			% [with_order, lines.size()]
		)
		return

	# Position breaks a tie, so the comparator is total: Array.sort_custom is
	# not stable, and duplicate orders would otherwise scramble on every load.
	var position := {}
	var seen := {}
	var duplicates: Array[int] = []
	for i in range(lines.size()):
		position[lines[i]] = i
		if seen.has(lines[i].order):
			if not duplicates.has(lines[i].order):
				duplicates.append(lines[i].order)
		seen[lines[i].order] = true
	if not duplicates.is_empty():
		push_warning(
			"Script lines share these 'order' values: %s. Ties keep file order."
			% ", ".join(duplicates.map(func(value: int) -> String: return str(value)))
		)

	lines.sort_custom(
		func(a: ScriptLine, b: ScriptLine) -> bool:
			if a.order != b.order:
				return a.order < b.order
			return position[a] < position[b]
	)


func find_minigame(game_id: String) -> MinigameData:
	for mg in minigames:
		if mg.game_id == game_id:
			return mg
	return null
