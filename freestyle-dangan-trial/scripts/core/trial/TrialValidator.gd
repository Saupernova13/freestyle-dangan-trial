class_name TrialValidator
extends RefCounted
## Structural validation for trial.json. The normative contract lives in
## schema/trial.schema.json at the repo root; keep this file and the editor's
## js/core/trialSchema.js in sync with it. CI cross-checks all three against
## the shared fixture in tests/fixtures/minimal-trial/.
##
## The engine validates less strictly than the editor: it checks only what it
## needs to play the trial, so imperfect files stay playable. Per-line content
## problems (unknown type, empty dialogue) degrade at runtime with warnings
## instead of failing the load.

const SUPPORTED_FORMAT_MAJOR := 4
const LINE_TYPES := ["speaking", "narrator", "minigame"]


## "" when acceptable; an error message when the file needs a newer engine.
static func check_version(data: Dictionary) -> String:
	var metadata = data.get("metadata")
	if not metadata is Dictionary or not metadata.get("version") is String:
		push_warning("trial.json has no metadata.version; assuming a legacy file")
		return ""
	var version: String = metadata["version"]
	var parts := version.split(".")
	if parts.size() < 1 or not parts[0].is_valid_int():
		push_warning("Unrecognized trial format version '%s'" % version)
		return ""
	var major := parts[0].to_int()
	if major > SUPPORTED_FORMAT_MAJOR:
		return (
			"This trial uses format %s, made with a newer editor. "
			+ "Update the engine to play it."
		) % version
	if major < SUPPORTED_FORMAT_MAJOR:
		push_warning(
			"Trial format %s is older than %d.x; attempting to load"
			% [version, SUPPORTED_FORMAT_MAJOR]
		)
	return ""


## Structural essentials only; deep typeSpecific shapes are each minigame's
## concern. Returns human-readable errors; empty means loadable.
static func validate(data: Dictionary) -> Array[String]:
	var errors: Array[String] = []
	if not data.get("trialName") is String:
		errors.append("trialName is missing or not a string")
	if not data.get("characters") is Array:
		errors.append("characters is missing or not an array")

	var script = data.get("script")
	if not script is Dictionary or not script.get("lines") is Array:
		errors.append("script.lines is missing or not an array")
	else:
		for i in range(script["lines"].size()):
			var line = script["lines"][i]
			if not line is Dictionary:
				errors.append("script line %d is not an object" % (i + 1))
				continue
			if not line.get("type") is String or not LINE_TYPES.has(line["type"]):
				push_warning(
					"script line %d has unknown type '%s' (will be skipped)"
					% [i + 1, str(line.get("type"))]
				)
			elif line["type"] == "minigame" and not line.get("minigameId") is String:
				errors.append("script line %d: minigame line has no minigameId" % (i + 1))

	if data.has("minigames") and not data.get("minigames") is Array:
		errors.append("minigames is not an array")
	elif data.get("minigames") is Array:
		for mg in data["minigames"]:
			if not mg is Dictionary or not mg.get("gameId") is String or not mg.get("gameType") is String:
				errors.append("a minigame entry is missing gameId/gameType")
				break

	if data.has("truthBullets") and not data.get("truthBullets") is Array:
		errors.append("truthBullets is not an array")
	return errors
