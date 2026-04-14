extends CanvasLayer

signal retry_requested
signal return_to_menu

var _bg: ColorRect
var _title: Label
var _subtitle: Label
var _retry_btn: Button
var _menu_btn: Button

func _ready():
	layer = 30

func show_game_over():
	_bg = ColorRect.new()
	_bg.color = Color(0, 0, 0, 0)
	_bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_bg)

	var container = VBoxContainer.new()
	container.set_anchors_preset(Control.PRESET_CENTER)
	container.grow_horizontal = Control.GROW_DIRECTION_BOTH
	container.grow_vertical = Control.GROW_DIRECTION_BOTH
	container.add_theme_constant_override("separation", 20)
	container.alignment = BoxContainer.ALIGNMENT_CENTER
	add_child(container)

	_title = Label.new()
	_title.text = "GAME OVER"
	_title.add_theme_font_size_override("font_size", 56)
	_title.add_theme_color_override("font_color", Color(0.8, 0.1, 0.1))
	_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title.modulate.a = 0.0
	container.add_child(_title)

	_subtitle = Label.new()
	_subtitle.text = "The truth remains hidden..."
	_subtitle.add_theme_font_size_override("font_size", 18)
	_subtitle.add_theme_color_override("font_color", Color(0.6, 0.4, 0.4))
	_subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_subtitle.modulate.a = 0.0
	container.add_child(_subtitle)

	var spacer = Control.new()
	spacer.custom_minimum_size.y = 30
	container.add_child(spacer)

	_retry_btn = Button.new()
	_retry_btn.text = "Retry"
	_retry_btn.custom_minimum_size = Vector2(200, 50)
	_retry_btn.add_theme_font_size_override("font_size", 20)
	_retry_btn.modulate.a = 0.0
	var retry_style = StyleBoxFlat.new()
	retry_style.bg_color = Color(0.2, 0.1, 0.1, 0.9)
	retry_style.border_width_bottom = 2
	retry_style.border_width_top = 2
	retry_style.border_width_left = 2
	retry_style.border_width_right = 2
	retry_style.border_color = Color(0.8, 0.3, 0.3)
	retry_style.corner_radius_top_left = 6
	retry_style.corner_radius_top_right = 6
	retry_style.corner_radius_bottom_left = 6
	retry_style.corner_radius_bottom_right = 6
	_retry_btn.add_theme_stylebox_override("normal", retry_style)
	_retry_btn.pressed.connect(func():
		_dismiss()
		retry_requested.emit()
	)
	container.add_child(_retry_btn)

	_menu_btn = Button.new()
	_menu_btn.text = "Return to Menu"
	_menu_btn.custom_minimum_size = Vector2(200, 50)
	_menu_btn.add_theme_font_size_override("font_size", 20)
	_menu_btn.modulate.a = 0.0
	var menu_style = retry_style.duplicate()
	menu_style.border_color = Color(0.5, 0.5, 0.6)
	_menu_btn.add_theme_stylebox_override("normal", menu_style)
	_menu_btn.pressed.connect(func():
		_dismiss()
		return_to_menu.emit()
	)
	container.add_child(_menu_btn)

	_animate_in()

func _animate_in():
	var tween = create_tween()
	tween.tween_property(_bg, "color:a", 0.9, 0.5)
	tween.tween_property(_title, "modulate:a", 1.0, 0.3)
	tween.parallel().tween_property(_title, "scale", Vector2(1.0, 1.0), 0.3).from(Vector2(1.5, 1.5)).set_ease(Tween.EASE_OUT)
	tween.tween_property(_subtitle, "modulate:a", 1.0, 0.3)
	tween.tween_property(_retry_btn, "modulate:a", 1.0, 0.2)
	tween.tween_property(_menu_btn, "modulate:a", 1.0, 0.2)

func _dismiss():
	var tween = create_tween()
	tween.tween_property(_bg, "color:a", 0.0, 0.3)
	tween.finished.connect(func(): queue_free())
