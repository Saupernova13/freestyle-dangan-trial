extends CanvasLayer

## Settings overlay. Scene-driven shell — see scenes/ui/settings_menu.tscn.
## The static panel (background, title, button styling, open/close animations)
## is editable in the editor. Dynamic option rows are still built in script
## because they bind to Settings autoload values, but they're parented into
## the named %OptionsContainer node so their position in the tree is visible.

signal closed

@onready var _options_container: VBoxContainer = %OptionsContainer
@onready var _close_btn: Button = %CloseButton
@onready var _anim: AnimationPlayer = %AnimationPlayer

var _is_closing: bool = false

func _ready():
	_close_btn.pressed.connect(_close)
	_build_options()

func open():
	if _anim and _anim.has_animation("open"):
		_anim.play("open")

func _build_options():
	_add_option_row("Text Speed", _create_text_speed_control())
	_add_slider_row("Voice Volume", Settings.voice_volume, func(val): Settings.voice_volume = val)
	_add_slider_row("SFX Volume", Settings.sfx_volume, func(val): Settings.sfx_volume = val)
	_add_slider_row("BGM Volume", Settings.bgm_volume, func(val): Settings.bgm_volume = val)
	_add_separator()
	_add_toggle_row("Auto-Advance", Settings.auto_advance, func(val): Settings.auto_advance = val)
	_add_slider_row("Auto Delay (s)", Settings.auto_advance_delay, func(val): Settings.auto_advance_delay = val, 0.5, 6.0, 0.5)
	_add_slider_row("Screen Shake", Settings.screen_shake_intensity, func(val): Settings.screen_shake_intensity = val, 0.0, 2.0, 0.1)

func _add_separator():
	var sep = HSeparator.new()
	sep.add_theme_constant_override("separation", 4)
	sep.add_theme_stylebox_override("separator", StyleBoxLine.new())
	_options_container.add_child(sep)

func _add_option_row(label_text: String, control: Control):
	var row = HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	_options_container.add_child(row)

	var label = Label.new()
	label.text = label_text
	label.add_theme_font_size_override("font_size", 16)
	label.add_theme_color_override("font_color", Color(0.8, 0.8, 0.85))
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(label)

	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(control)

func _add_slider_row(label_text: String, initial: float, callback: Callable, min_val: float = 0.0, max_val: float = 1.0, step: float = 0.05):
	var row = HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	_options_container.add_child(row)

	var label = Label.new()
	label.text = label_text
	label.add_theme_font_size_override("font_size", 16)
	label.add_theme_color_override("font_color", Color(0.8, 0.8, 0.85))
	label.custom_minimum_size.x = 140
	row.add_child(label)

	var slider = HSlider.new()
	slider.min_value = min_val
	slider.max_value = max_val
	slider.step = step
	slider.value = initial
	slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	slider.custom_minimum_size.x = 200
	slider.value_changed.connect(func(val): callback.call(val))
	row.add_child(slider)

	var value_label = Label.new()
	value_label.text = _format_value(initial, max_val)
	value_label.add_theme_font_size_override("font_size", 14)
	value_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.7))
	value_label.custom_minimum_size.x = 40
	value_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	row.add_child(value_label)

	slider.value_changed.connect(func(val): value_label.text = _format_value(val, max_val))

func _format_value(val: float, max_val: float) -> String:
	if max_val <= 1.0:
		return str(int(val * 100)) + "%"
	return str(snapped(val, 0.1))

func _add_toggle_row(label_text: String, initial: bool, callback: Callable):
	var row = HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	_options_container.add_child(row)

	var label = Label.new()
	label.text = label_text
	label.add_theme_font_size_override("font_size", 16)
	label.add_theme_color_override("font_color", Color(0.8, 0.8, 0.85))
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(label)

	var toggle = CheckButton.new()
	toggle.button_pressed = initial
	toggle.toggled.connect(func(val): callback.call(val))
	row.add_child(toggle)

func _create_text_speed_control() -> HBoxContainer:
	var hbox = HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 8)

	var speed_label = Label.new()
	speed_label.text = Settings.get_text_speed_name()
	speed_label.add_theme_font_size_override("font_size", 16)
	speed_label.add_theme_color_override("font_color", Color(0.9, 0.8, 0.5))
	speed_label.custom_minimum_size.x = 80
	speed_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER

	var left_btn = Button.new()
	left_btn.text = "<"
	left_btn.custom_minimum_size = Vector2(30, 30)
	left_btn.pressed.connect(func():
		Settings.text_speed = Settings.text_speed - 1
		speed_label.text = Settings.get_text_speed_name()
	)
	hbox.add_child(left_btn)
	hbox.add_child(speed_label)

	var right_btn = Button.new()
	right_btn.text = ">"
	right_btn.custom_minimum_size = Vector2(30, 30)
	right_btn.pressed.connect(func():
		Settings.text_speed = Settings.text_speed + 1
		speed_label.text = Settings.get_text_speed_name()
	)
	hbox.add_child(right_btn)

	return hbox

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
