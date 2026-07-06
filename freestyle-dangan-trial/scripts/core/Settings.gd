extends Node

signal settings_changed

const SAVE_PATH = "user://settings.cfg"

# Bounds for the UI Scale option so no value can push the interface off-screen
# or shrink it into illegibility.
const UI_SCALE_MIN := 0.75
const UI_SCALE_MAX := 2.0

var text_speed: int = 1:
	set(val):
		text_speed = clampi(val, 0, 3)
		_apply_and_save()

var voice_volume: float = 1.0:
	set(val):
		voice_volume = clampf(val, 0.0, 1.0)
		_apply_and_save()

var auto_advance: bool = false:
	set(val):
		auto_advance = val
		_apply_and_save()

var auto_advance_delay: float = 2.0:
	set(val):
		auto_advance_delay = clampf(val, 0.5, 6.0)
		_apply_and_save()

var screen_shake_intensity: float = 1.0:
	set(val):
		screen_shake_intensity = clampf(val, 0.0, 2.0)
		_apply_and_save()

var ui_scale: float = 1.0:
	set(val):
		ui_scale = clampf(val, UI_SCALE_MIN, UI_SCALE_MAX)
		_apply_and_save()

var _suppress_save: bool = false

func _ready():
	_load_settings()
	_apply_all()

func _load_settings():
	var config = ConfigFile.new()
	if config.load(SAVE_PATH) != OK:
		return

	_suppress_save = true
	text_speed = config.get_value("gameplay", "text_speed", 1)
	voice_volume = config.get_value("audio", "voice_volume", 1.0)
	auto_advance = config.get_value("gameplay", "auto_advance", false)
	auto_advance_delay = config.get_value("gameplay", "auto_advance_delay", 2.0)
	screen_shake_intensity = config.get_value("gameplay", "screen_shake_intensity", 1.0)
	ui_scale = config.get_value("display", "ui_scale", 1.0)
	_suppress_save = false

func _save_settings():
	var config = ConfigFile.new()
	config.set_value("gameplay", "text_speed", text_speed)
	config.set_value("audio", "voice_volume", voice_volume)
	config.set_value("gameplay", "auto_advance", auto_advance)
	config.set_value("gameplay", "auto_advance_delay", auto_advance_delay)
	config.set_value("gameplay", "screen_shake_intensity", screen_shake_intensity)
	config.set_value("display", "ui_scale", ui_scale)
	config.save(SAVE_PATH)

func _apply_and_save():
	if _suppress_save:
		return
	_apply_all()
	_save_settings()
	settings_changed.emit()

func _apply_all():
	if AudioManager:
		AudioManager.set_voice_volume_linear(voice_volume)
	# Uniform canvas scale. Stretch mode stays disabled, so window size never
	# rescales the UI; this factor is the only thing that does.
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
