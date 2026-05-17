extends MinigameBase

var questions: Array = []
var current_question_index: int = 0

var _overlay: CanvasLayer
var _question_label: Label
var _lanes_container: HBoxContainer
var _lane_buttons: Array = []
var _road_effect: Control

var _influence_gauge_ui: Node
var _timer_display: Node
var _showing_question: bool = false

func initialize(data: Dictionary):
	super.initialize(data)
	var type_specific = data.get("typeSpecific", {})
	questions = type_specific.get("questions", [])

func start():
	super.start()
	_build_overlay()
	_setup_ui()
	InfluenceGauge.reset()
	if not InfluenceGauge.influence_depleted.is_connected(_on_influence_depleted):
		InfluenceGauge.influence_depleted.connect(_on_influence_depleted)
	print("LogicDive: ", questions.size(), " questions")

	if not questions.is_empty():
		await get_tree().create_timer(0.5).timeout
		_show_question(0)

func _build_overlay():
	_overlay = CanvasLayer.new()
	_overlay.layer = 5
	add_child(_overlay)

	_road_effect = RoadEffect.new()
	_road_effect.set_anchors_preset(Control.PRESET_FULL_RECT)
	_road_effect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_overlay.add_child(_road_effect)

	var title = Label.new()
	title.text = "LOGIC DIVE"
	title.add_theme_font_size_override("font_size", 28)
	title.add_theme_color_override("font_color", Color(0.2, 0.8, 1.0))
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.set_anchors_preset(Control.PRESET_CENTER_TOP)
	title.position.y = 15
	title.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_overlay.add_child(title)

	_question_label = Label.new()
	_question_label.add_theme_font_size_override("font_size", 24)
	_question_label.add_theme_color_override("font_color", Color.WHITE)
	_question_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_question_label.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_question_label.position.y = 60
	_question_label.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_question_label.autowrap_mode = TextServer.AUTOWRAP_WORD
	_question_label.custom_minimum_size.x = 600
	_overlay.add_child(_question_label)

	_lanes_container = HBoxContainer.new()
	_lanes_container.set_anchors_preset(Control.PRESET_CENTER)
	_lanes_container.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_lanes_container.grow_vertical = Control.GROW_DIRECTION_BOTH
	_lanes_container.add_theme_constant_override("separation", 20)
	_lanes_container.alignment = BoxContainer.ALIGNMENT_CENTER
	_overlay.add_child(_lanes_container)

	var progress_label = Label.new()
	progress_label.name = "ProgressLabel"
	progress_label.add_theme_font_size_override("font_size", 16)
	progress_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.6))
	progress_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	progress_label.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	progress_label.position.y = -40
	progress_label.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_overlay.add_child(progress_label)

func _setup_ui():
	_influence_gauge_ui = preload("res://scenes/ui/influence_gauge.tscn").instantiate()
	add_child(_influence_gauge_ui)
	_influence_gauge_ui.show_gauge()

	_timer_display = preload("res://scenes/ui/timer_display.tscn").instantiate()
	add_child(_timer_display)
	_timer_display.time_expired.connect(_on_time_expired)
	if time_limit > 0:
		_timer_display.start_timer(time_limit)

func _show_question(index: int):
	if index >= questions.size():
		_on_correct_answer({"questions_answered": questions.size()})
		return

	current_question_index = index
	_showing_question = true

	var q = questions[index]
	_question_label.text = q.get("questionText", "???")
	_question_label.modulate.a = 0.0

	for btn in _lane_buttons:
		btn.queue_free()
	_lane_buttons.clear()

	var answers = q.get("answers", [])
	for i in range(answers.size()):
		var answer = answers[i]
		var btn = Button.new()
		btn.text = answer.get("answerText", "?")
		btn.custom_minimum_size = Vector2(180, 80)
		btn.add_theme_font_size_override("font_size", 18)

		var style_normal = StyleBoxFlat.new()
		style_normal.bg_color = Color(0.15, 0.1, 0.3, 0.9)
		style_normal.border_width_bottom = 2
		style_normal.border_width_top = 2
		style_normal.border_width_left = 2
		style_normal.border_width_right = 2
		style_normal.border_color = Color(0.3, 0.5, 0.8, 0.7)
		style_normal.corner_radius_top_left = 8
		style_normal.corner_radius_top_right = 8
		style_normal.corner_radius_bottom_left = 8
		style_normal.corner_radius_bottom_right = 8
		btn.add_theme_stylebox_override("normal", style_normal)

		var style_hover = style_normal.duplicate()
		style_hover.bg_color = Color(0.25, 0.2, 0.45, 0.95)
		style_hover.border_color = Color(0.5, 0.7, 1.0)
		btn.add_theme_stylebox_override("hover", style_hover)

		btn.modulate.a = 0.0
		var is_correct = answer.get("isCorrect", false)
		btn.pressed.connect(_on_answer_selected.bind(i, is_correct))
		_lanes_container.add_child(btn)
		_lane_buttons.append(btn)

	var progress = _overlay.get_node_or_null("ProgressLabel")
	if progress:
		progress.text = "Question %d / %d" % [index + 1, questions.size()]

	var tween = create_tween()
	tween.tween_property(_question_label, "modulate:a", 1.0, 0.3)
	for i in range(_lane_buttons.size()):
		tween.tween_property(_lane_buttons[i], "modulate:a", 1.0, 0.15)

func _on_answer_selected(answer_index: int, is_correct: bool):
	if not _showing_question:
		return
	_showing_question = false

	for i in range(_lane_buttons.size()):
		var btn = _lane_buttons[i]
		if i == answer_index:
			if is_correct:
				btn.modulate = Color(0.3, 1.0, 0.5)
			else:
				btn.modulate = Color(1.0, 0.3, 0.3)
		btn.disabled = true

	if is_correct:
		AudioManager.play_sfx("correct_chime")
		await get_tree().create_timer(1.0).timeout
		_show_question(current_question_index + 1)
	else:
		AudioManager.play_sfx("wrong_buzzer")
		InfluenceGauge.take_damage(difficulty)

		for i in range(_lane_buttons.size()):
			var btn = _lane_buttons[i]
			var q = questions[current_question_index]
			var answers = q.get("answers", [])
			if i < answers.size() and answers[i].get("isCorrect", false):
				btn.modulate = Color(0.3, 1.0, 0.5)

		await get_tree().create_timer(1.5).timeout
		_show_question(current_question_index + 1)

func _process(delta):
	if not is_active:
		return
	if _road_effect:
		_road_effect.scroll_offset += delta * 200
		_road_effect.queue_redraw()

func _on_influence_depleted():
	_finish(false, {"reason": "influence_depleted"})

func cleanup():
	super.cleanup()
	if _influence_gauge_ui:
		_influence_gauge_ui.hide_gauge()
	if _timer_display:
		_timer_display.hide_timer()
	if InfluenceGauge.influence_depleted.is_connected(_on_influence_depleted):
		InfluenceGauge.influence_depleted.disconnect(_on_influence_depleted)
	if _overlay:
		_overlay.queue_free()


class RoadEffect extends Control:
	var scroll_offset: float = 0.0

	func _draw():
		draw_rect(Rect2(Vector2.ZERO, size), Color(0.05, 0.0, 0.15, 0.85))

		var cx = size.x / 2.0
		var dash_length = 40.0
		var gap_length = 30.0
		var total = dash_length + gap_length
		var y = fmod(scroll_offset, total) - total
		while y < size.y + total:
			draw_rect(Rect2(cx - 2, y, 4, dash_length), Color(0.3, 0.3, 0.5, 0.6))
			y += total

		draw_rect(Rect2(size.x * 0.25, 0, 2, size.y), Color(0.2, 0.2, 0.4, 0.3))
		draw_rect(Rect2(size.x * 0.75, 0, 2, size.y), Color(0.2, 0.2, 0.4, 0.3))
