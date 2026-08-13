class_name ScriptLine
extends RefCounted
## One trial.json script line, parsed once at load into typed fields. Every
## key access and default lives here, so consumers never touch raw
## Dictionaries. The JSON shape is schema/trial.schema.json.

const TYPE_SPEAKING := "speaking"
const TYPE_NARRATOR := "narrator"
const TYPE_MINIGAME := "minigame"

var id: String = ""
var order: int = 0
var type: String = ""
var character_id: String = ""
var dialogue: String = ""
var text: String = ""
var audio_file: String = ""
var minigame_id: String = ""
## 1-based. Clamped here, so no consumer needs its own coercion.
var sprite_index: int = 1
var camera_motion: Dictionary = {}  # consumed by CameraDirector as-is
var special_effects: Dictionary = {}  # {"effects": [...]}, consumed by ScreenEffects
var highlights: Array = []
var dialogue_box_style: Dictionary = {}


## A `"key": null` arrives as a Variant null, and str(null) gives "<null>".
static func _s(v: Variant) -> String:
	return v if v is String else ""


static func _d(v: Variant) -> Dictionary:
	return v if v is Dictionary else {}


static func _i(v: Variant, fallback: int) -> int:
	return int(v) if (v is int or v is float) else fallback


static func from_dict(d: Dictionary) -> ScriptLine:
	var line := ScriptLine.new()
	line.id = _s(d.get("id"))
	line.order = _i(d.get("order"), 0)
	line.type = _s(d.get("type"))
	line.character_id = _s(d.get("characterId"))
	line.dialogue = _s(d.get("dialogue"))
	line.text = _s(d.get("text"))
	line.audio_file = _s(d.get("audioFile"))
	line.minigame_id = _s(d.get("minigameId"))
	line.sprite_index = maxi(_i(d.get("spriteIndex"), 1), 1)
	line.camera_motion = _d(d.get("cameraMotion"))
	line.special_effects = _d(d.get("specialEffects"))
	line.highlights = d.get("highlights") if d.get("highlights") is Array else []
	line.dialogue_box_style = _d(d.get("dialogueBoxStyle"))
	return line


## Falls back to `dialogue`: legacy files put narration there before `text`.
func display_text() -> String:
	return text if not text.is_empty() else dialogue
