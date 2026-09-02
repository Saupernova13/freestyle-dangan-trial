class_name ScriptLine
extends RefCounted
## One trial.json script line, parsed once at load into typed fields. Every
## key access and default lives here, so consumers never touch raw
## Dictionaries. The JSON shape is schema/trial.schema.json.
##
## Every field is read through JsonRead, because a `"key": null` arrives as a
## Variant null and str(null) gives "<null>". typeSpecific and the debate
## panels read the same way, so a null or wrong-typed value degrades to the
## same default wherever it appears.

const TYPE_SPEAKING := "speaking"
const TYPE_NARRATOR := "narrator"
const TYPE_MINIGAME := "minigame"
## Every line type, in one place. Dispatch and validation are built from this,
## so renaming a constant cannot leave a stale literal behind somewhere else.
const TYPES := [TYPE_SPEAKING, TYPE_NARRATOR, TYPE_MINIGAME]

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


static func from_dict(d: Dictionary) -> ScriptLine:
	var line := ScriptLine.new()
	line.id = JsonRead.str_of(d.get("id"))
	line.order = JsonRead.int_of(d.get("order"), 0)
	line.type = JsonRead.str_of(d.get("type"))
	line.character_id = JsonRead.str_of(d.get("characterId"))
	line.dialogue = JsonRead.str_of(d.get("dialogue"))
	line.text = JsonRead.str_of(d.get("text"))
	line.audio_file = JsonRead.str_of(d.get("audioFile"))
	line.minigame_id = JsonRead.str_of(d.get("minigameId"))
	line.sprite_index = maxi(JsonRead.int_of(d.get("spriteIndex"), 1), 1)
	line.camera_motion = JsonRead.dict_of(d.get("cameraMotion"))
	line.special_effects = JsonRead.dict_of(d.get("specialEffects"))
	line.highlights = JsonRead.array_of(d.get("highlights"))
	line.dialogue_box_style = JsonRead.dict_of(d.get("dialogueBoxStyle"))
	return line


## Falls back to `dialogue`: legacy files put narration there before `text`.
func display_text() -> String:
	return text if not text.is_empty() else dialogue
