extends MinigameBase

var _overlay: CanvasLayer

func initialize(data: Dictionary):
	super.initialize(data)

func start():
	super.start()
	_build_stub_overlay("REBUTTAL SHOWDOWN", Color(0.9, 0.4, 0.6))
	await get_tree().create_timer(3.0).timeout
	_on_correct_answer({"stub": true})

func _build_stub_overlay(title_text: String, color: Color):
	_overlay = CanvasLayer.new()
	_overlay.layer = 5
	add_child(_overlay)

	var bg = ColorRect.new()
	bg.color = Color(0, 0, 0, 0.7)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_overlay.add_child(bg)

	var title = Label.new()
	title.text = title_text
	title.add_theme_font_size_override("font_size", 36)
	title.add_theme_color_override("font_color", color)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.set_anchors_preset(Control.PRESET_CENTER)
	title.position.y = -30
	title.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_overlay.add_child(title)

	var subtitle = Label.new()
	subtitle.text = "Not yet implemented - auto-completing in 3 seconds..."
	subtitle.add_theme_font_size_override("font_size", 18)
	subtitle.add_theme_color_override("font_color", Color(0.6, 0.6, 0.7))
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.set_anchors_preset(Control.PRESET_CENTER)
	subtitle.position.y = 20
	subtitle.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_overlay.add_child(subtitle)

func cleanup():
	super.cleanup()
	if _overlay:
		_overlay.queue_free()
