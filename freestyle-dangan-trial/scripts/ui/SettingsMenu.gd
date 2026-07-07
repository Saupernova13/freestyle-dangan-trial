extends CanvasLayer
## Settings overlay. Fully scene-owned — see scenes/ui/settings_menu.tscn for the
## rows, styling, and open/close animations. This script only binds the controls
## to Settings values and mirrors slider values into their readout labels.

signal closed

@onready var _close_btn: Button = %CloseButton
@onready var _anim: AnimationPlayer = %AnimationPlayer
@onready var _text_speed_value: Label = %TextSpeedValue
@onready var _voice_slider: HSlider = %VoiceSlider
@onready var _auto_delay_slider: HSlider = %AutoDelaySlider
@onready var _screen_shake_slider: HSlider = %ScreenShakeSlider
@onready var _ui_scale_slider: HSlider = %UIScaleSlider
@onready var _auto_advance_toggle: CheckButton = %AutoAdvanceToggle

var _is_closing: bool = false

func _ready():
	_close_btn.pressed.connect(_close)

	_text_speed_value.text = Settings.get_text_speed_name()
	(%TextSpeedDown as Button).pressed.connect(_step_text_speed.bind(-1))
	(%TextSpeedUp as Button).pressed.connect(_step_text_speed.bind(1))

	_bind_slider(_voice_slider, %VoiceValue, Settings.voice_volume,
		func(v): Settings.voice_volume = v)
	_bind_slider(_auto_delay_slider, %AutoDelayValue, Settings.auto_advance_delay,
		func(v): Settings.auto_advance_delay = v)
	_bind_slider(_screen_shake_slider, %ScreenShakeValue, Settings.screen_shake_intensity,
		func(v): Settings.screen_shake_intensity = v)
	_bind_slider(_ui_scale_slider, %UIScaleValue, Settings.ui_scale,
		func(v): Settings.ui_scale = v,
		func(v): return str(int(round(v * 100.0))) + "%")

	_auto_advance_toggle.button_pressed = Settings.auto_advance
	_auto_advance_toggle.toggled.connect(func(v): Settings.auto_advance = v)

func open():
	if _anim and _anim.has_animation("open"):
		_anim.play("open")

func _bind_slider(
	slider: HSlider, value_label: Label, initial: float, setter: Callable, formatter: Callable = Callable()
) -> void:
	var format := formatter if formatter.is_valid() else func(v): return _format_value(v, slider.max_value)
	slider.value = initial
	value_label.text = format.call(initial)
	slider.value_changed.connect(func(v):
		setter.call(v)
		value_label.text = format.call(v)
	)

func _format_value(val: float, max_val: float) -> String:
	if max_val <= 1.0:
		return str(int(val * 100)) + "%"
	return str(snapped(val, 0.1))

func _step_text_speed(direction: int) -> void:
	Settings.text_speed = Settings.text_speed + direction
	_text_speed_value.text = Settings.get_text_speed_name()

func _close():
	if _is_closing:
		return
	_is_closing = true
	if _anim and _anim.has_animation("close"):
		_anim.play("close")
		await _anim.animation_finished
	closed.emit()
	queue_free()

func _unhandled_input(event: InputEvent):
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		_close()
		get_viewport().set_input_as_handled()
