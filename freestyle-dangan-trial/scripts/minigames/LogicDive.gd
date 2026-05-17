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
	# Scene-driven — see scenes/minigames/logic_dive_overlay.tscn.
	# Lane buttons spawn dynamically into %LanesContainer per question.
	_overlay = preload("res://scenes/minigames/logic_dive_overlay.tscn").instantiate()
	add_child(_overlay)
	_road_effect = _overlay.get_node("%RoadEffect")
	_question_label = _overlay.get_node("%QuestionLabel")
	_lanes_container = _overlay.get_node("%LanesContainer")

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

	var progress = _overlay.get_node_or_null("%ProgressLabel")
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
