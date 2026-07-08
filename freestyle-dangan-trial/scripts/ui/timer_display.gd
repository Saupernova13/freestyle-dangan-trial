extends CanvasLayer

## Countdown timer HUD. Scene-driven — see scenes/ui/timer_display.tscn.
## Edit position and styling there. The script handles countdown logic, color
## changes at thresholds, and triggers the pulse animation when time is low.

signal time_expired

@export var color_normal: Color = Color.WHITE
@export var color_warning: Color = Color(1.0, 0.8, 0.2)
@export var color_critical: Color = Color(1.0, 0.2, 0.2)

@onready var _time_label: Label = %TimeLabel
@onready var _anim: AnimationPlayer = %AnimationPlayer

var _time_remaining: float = 0.0
var _initial_time: float = 0.0
var _is_running: bool = false
var _is_pulsing: bool = false

func _ready():
	visible = false

func _process(delta):
	if not _is_running:
		return

	_time_remaining -= delta
	if _time_remaining <= 0:
		_time_remaining = 0
		_is_running = false
		_update_display()
		time_expired.emit()
		return

	_update_display()

	var pct = _time_remaining / _initial_time if _initial_time > 0 else 0.0
	if pct < 0.25:
		_time_label.add_theme_color_override("font_color", color_critical)
		if not _is_pulsing and _anim and _anim.has_animation("pulse"):
			_anim.play("pulse")
			_is_pulsing = true
	elif pct < 0.5:
		_time_label.add_theme_color_override("font_color", color_warning)

func start_timer(seconds: float):
	_initial_time = seconds
	_time_remaining = seconds
	_is_running = true
	_is_pulsing = false
	visible = true
	_time_label.add_theme_color_override("font_color", color_normal)
	_time_label.modulate.a = 1.0
	if _anim and _anim.is_playing():
		_anim.stop()
	_update_display()

func stop_timer():
	_is_running = false
	if _anim and _anim.is_playing():
		_anim.stop()
	_is_pulsing = false

func hide_timer():
	stop_timer()
	visible = false

func get_remaining() -> float:
	return _time_remaining

func add_time(seconds: float):
	_time_remaining = clamp(_time_remaining + seconds, 0.0, _initial_time * 2.0)
	_update_display()

func _update_display():
	@warning_ignore("integer_division")
	var mins = int(_time_remaining) / 60
	var secs = int(_time_remaining) % 60
	_time_label.text = "%02d:%02d" % [mins, secs]
