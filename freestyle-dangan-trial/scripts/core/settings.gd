extends Node

signal settings_changed

const SAVE_PATH = "user://settings.cfg"

# Bounds the UI Scale option, so it can't go off-screen or illegibly small.
const UI_SCALE_MIN := 0.75
const UI_SCALE_MAX := 2.0

## Stated once, so a per-key fallback and the initial value cannot drift apart.
const DEFAULT_TEXT_SPEED := 1
const DEFAULT_VOICE_VOLUME := 1.0
const DEFAULT_AUTO_ADVANCE := false
const DEFAULT_AUTO_ADVANCE_DELAY := 2.0
const DEFAULT_SCREEN_SHAKE := 1.0
const DEFAULT_UI_SCALE := 1.0

var text_speed: int = DEFAULT_TEXT_SPEED:
	set(val):
		text_speed = clampi(val, 0, 3)
		_apply_and_save()

var voice_volume: float = DEFAULT_VOICE_VOLUME:
	set(val):
		voice_volume = clampf(val, 0.0, 1.0)
		_apply_and_save()

var auto_advance: bool = DEFAULT_AUTO_ADVANCE:
	set(val):
		auto_advance = val
		_apply_and_save()

var auto_advance_delay: float = DEFAULT_AUTO_ADVANCE_DELAY:
	set(val):
		auto_advance_delay = clampf(val, 0.5, 6.0)
		_apply_and_save()

var screen_shake_intensity: float = DEFAULT_SCREEN_SHAKE:
	set(val):
		screen_shake_intensity = clampf(val, 0.0, 2.0)
		_apply_and_save()

var ui_scale: float = DEFAULT_UI_SCALE:
	set(val):
		ui_scale = clampf(val, UI_SCALE_MIN, UI_SCALE_MAX)
		_apply_and_save()

var _suppress_save: bool = false

func _ready():
	_load_settings()
	# Cleared here rather than at the end of _load_settings(). A runtime type
	# error inside a setter aborts the enclosing function and returns to its
	# caller, so a single bad value used to leave this true and suppress every
	# save for the rest of the process.
	_suppress_save = false
	_apply_all()

func _load_settings():
	var config := ConfigFile.new()
	var err := config.load(SAVE_PATH)
	if err == ERR_FILE_NOT_FOUND:
		# First run. The defaults stand and the next change writes the file.
		return
	if err != OK:
		Log.warn(
			"Settings",
			"Could not read %s (%s); using defaults." % [SAVE_PATH, error_string(err)]
		)
		return

	# Type-checked per key: ConfigFile stores arbitrary Variants, and a
	# hand-edited or half-written file must cost one setting, not all of them.
	_suppress_save = true
	text_speed = _read_int(config, "gameplay", "text_speed", DEFAULT_TEXT_SPEED)
	voice_volume = _read_float(config, "audio", "voice_volume", DEFAULT_VOICE_VOLUME)
	auto_advance = _read_bool(config, "gameplay", "auto_advance", DEFAULT_AUTO_ADVANCE)
	auto_advance_delay = _read_float(
		config, "gameplay", "auto_advance_delay", DEFAULT_AUTO_ADVANCE_DELAY
	)
	screen_shake_intensity = _read_float(
		config, "gameplay", "screen_shake_intensity", DEFAULT_SCREEN_SHAKE
	)
	ui_scale = _read_float(config, "display", "ui_scale", DEFAULT_UI_SCALE)
	_suppress_save = false

func _read_int(config: ConfigFile, section: String, key: String, fallback: int) -> int:
	var value: Variant = config.get_value(section, key, fallback)
	if value is int or value is float:
		return int(value)
	_warn_bad_value(section, key, value)
	return fallback

func _read_float(config: ConfigFile, section: String, key: String, fallback: float) -> float:
	var value: Variant = config.get_value(section, key, fallback)
	if value is int or value is float:
		return float(value)
	_warn_bad_value(section, key, value)
	return fallback

func _read_bool(config: ConfigFile, section: String, key: String, fallback: bool) -> bool:
	var value: Variant = config.get_value(section, key, fallback)
	if value is bool:
		return value
	_warn_bad_value(section, key, value)
	return fallback

## ConfigFile.save() is not atomic, so a crash mid-write leaves a file that
## parses but holds the wrong types. The player cannot be expected to find it.
func _warn_bad_value(section: String, key: String, value: Variant) -> void:
	Log.warn(
		"Settings",
		"%s/%s in %s is a %s; using the default." % [
			section, key, SAVE_PATH, type_string(typeof(value))
		]
	)

func _save_settings():
	var config = ConfigFile.new()
	config.set_value("gameplay", "text_speed", text_speed)
	config.set_value("audio", "voice_volume", voice_volume)
	config.set_value("gameplay", "auto_advance", auto_advance)
	config.set_value("gameplay", "auto_advance_delay", auto_advance_delay)
	config.set_value("gameplay", "screen_shake_intensity", screen_shake_intensity)
	config.set_value("display", "ui_scale", ui_scale)
	# A read-only or full user:// would otherwise mean settings never persist,
	# with nothing said about it at any level.
	var err := config.save(SAVE_PATH)
	if err != OK:
		Log.warn("Settings", "Could not write %s: %s" % [SAVE_PATH, error_string(err)])

func _apply_and_save():
	if _suppress_save:
		return
	_apply_all()
	_save_settings()
	settings_changed.emit()

func _apply_all():
	if AudioManager:
		AudioManager.set_voice_volume_linear(voice_volume)
	# Sits on top of the canvas_items/expand stretch, which already fills the
	# window, so the player can size the UI independently of it.
	var window := get_window()
	if window:
		window.content_scale_factor = ui_scale

func get_typewriter_speed() -> float:
	match text_speed:
		0: return 15.0
		1: return 30.0
		2: return 60.0
		3: return 999.0
	return 30.0

func get_text_speed_name() -> String:
	match text_speed:
		0: return "Slow"
		1: return "Normal"
		2: return "Fast"
		3: return "Instant"
	return "Normal"
