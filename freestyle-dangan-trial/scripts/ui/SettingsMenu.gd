extends CanvasLayer

signal closed

var _bg: ColorRect
var _panel: PanelContainer
var _is_closing: bool = false

func _ready():
	layer = 28
	process_mode = Node.PROCESS_MODE_ALWAYS

func open():
	_build_ui()

func _build_ui():
	_bg = ColorRect.new()
	_bg.color = Color(0, 0, 0, 0.7)
	_bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_bg)

	var center = CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	_panel = PanelContainer.new()
	_panel.custom_minimum_size = Vector2(500, 450)
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.1, 0.1, 0.15, 0.95)
	style.border_width_bottom = 2
	style.border_width_top = 2
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_color = Color(0.5, 0.5, 0.6)
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.content_margin_left = 24
	style.content_margin_right = 24
	style.content_margin_top = 20
	style.content_margin_bottom = 20
	_panel.add_theme_stylebox_override("panel", style)
	center.add_child(_panel)

	var vbox = VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 14)
	_panel.add_child(vbox)

	var title = Label.new()
	title.text = "SETTINGS"
	title.add_theme_font_size_override("font_size", 28)
	title.add_theme_color_override("font_color", Color(0.9, 0.9, 1.0))
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(title)

	_add_separator(vbox)

	_add_option_row(vbox, "Text Speed", _create_text_speed_control())
	_add_slider_row(vbox, "Voice Volume", Settings.voice_volume, func(val): Settings.voice_volume = val)
	_add_slider_row(vbox, "SFX Volume", Settings.sfx_volume, func(val): Settings.sfx_volume = val)
	_add_slider_row(vbox, "BGM Volume", Settings.bgm_volume, func(val): Settings.bgm_volume = val)

	_add_separator(vbox)

	_add_toggle_row(vbox, "Auto-Advance", Settings.auto_advance, func(val): Settings.auto_advance = val)
	_add_slider_row(vbox, "Auto Delay (s)", Settings.auto_advance_delay, func(val): Settings.auto_advance_delay = val, 0.5, 6.0, 0.5)
	_add_slider_row(vbox, "Screen Shake", Settings.screen_shake_intensity, func(val): Settings.screen_shake_intensity = val, 0.0, 2.0, 0.1)

	_add_separator(vbox)

	var btn_row = HBoxContainer.new()
	btn_row.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_child(btn_row)

	var close_btn = Button.new()
	close_btn.text = "Close"
	close_btn.custom_minimum_size = Vector2(150, 40)
	close_btn.add_theme_font_size_override("font_size", 18)
	var btn_style = StyleBoxFlat.new()
	btn_style.bg_color = Color(0.2, 0.2, 0.3, 0.9)
	btn_style.border_width_bottom = 1
	btn_style.border_width_top = 1
	btn_style.border_width_left = 1
	btn_style.border_width_right = 1
	btn_style.border_color = Color(0.5, 0.5, 0.6)
	btn_style.corner_radius_top_left = 4
	btn_style.corner_radius_top_right = 4
	btn_style.corner_radius_bottom_left = 4
	btn_style.corner_radius_bottom_right = 4
	close_btn.add_theme_stylebox_override("normal", btn_style)
	close_btn.pressed.connect(_close)
	btn_row.add_child(close_btn)

func _add_separator(parent: VBoxContainer):
	var sep = HSeparator.new()
	sep.add_theme_constant_override("separation", 4)
	sep.add_theme_stylebox_override("separator", StyleBoxLine.new())
	parent.add_child(sep)

func _add_option_row(parent: VBoxContainer, label_text: String, control: Control):
	var row = HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	parent.add_child(row)

	var label = Label.new()
	label.text = label_text
	label.add_theme_font_size_override("font_size", 16)
	label.add_theme_color_override("font_color", Color(0.8, 0.8, 0.85))
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(label)

	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(control)

func _add_slider_row(parent: VBoxContainer, label_text: String, initial: float, callback: Callable, min_val: float = 0.0, max_val: float = 1.0, step: float = 0.05):
	var row = HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	parent.add_child(row)

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

func _add_toggle_row(parent: VBoxContainer, label_text: String, initial: bool, callback: Callable):
	var row = HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	parent.add_child(row)

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
	var tween = create_tween()
	tween.tween_property(_bg, "color:a", 0.0, 0.2)
	tween.parallel().tween_property(_panel, "modulate:a", 0.0, 0.2)
	tween.finished.connect(func():
		closed.emit()
		queue_free()
	)

func _unhandled_input(event: InputEvent):
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		_close()
		get_viewport().set_input_as_handled()
