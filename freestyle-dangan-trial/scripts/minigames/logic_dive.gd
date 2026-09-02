extends MinigameBase

var questions: Array = []
var current_question_index: int = 0

var _overlay: CanvasLayer
var _question_label: Label
var _lanes_container: HBoxContainer
var _lane_buttons: Array = []
var _button_original_indices: Array = []
var _question_anim: AnimationPlayer

var _showing_question: bool = false

func initialize(data: MinigameData):
	super.initialize(data)
	var type_specific := data.type_specific
	questions = type_specific.get("questions", [])

func validate_data() -> Array[String]:
	if questions.is_empty():
		return ["questions is empty"]

	# The same unwinnable shape as a Debate Scrum round with no defense
	# keywords: a question no answer can satisfy replays identically forever,
	# and _show_question filters out blank answers, so a question of nothing
	# but blanks leaves zero buttons on screen.
	var errors: Array[String] = []
	for i in range(questions.size()):
		var question = questions[i]
		if not question is Dictionary:
			errors.append("question %d is not an object" % (i + 1))
			continue
		var answers = question.get("answers", [])
		if not answers is Array:
			errors.append("question %d: answers is not a list" % (i + 1))
			continue

		var answerable := 0
		var correct := 0
		for answer in answers:
			if not answer is Dictionary:
				continue
			if str(answer.get("answerText", "")).strip_edges().is_empty():
				continue
			answerable += 1
			if answer.get("isCorrect", false):
				correct += 1

		if answerable == 0:
			errors.append("question %d has no answers with any text" % (i + 1))
		elif correct == 0:
			errors.append("question %d has no correct answer, so it cannot be won" % (i + 1))
	return errors

func start():
	super.start()
	_build_overlay()
	setup_standard_ui([HudComponent.INFLUENCE_GAUGE, HudComponent.TIMER_DISPLAY])
	connect_managed(InfluenceGauge.influence_depleted, _on_influence_depleted)
	Log.info("LogicDive", "%d questions" % questions.size())

	await get_tree().create_timer(0.5).timeout
	# Unguarded on purpose: _show_question() completes the game when the index
	# runs past the end, so an empty list that slips past validation resolves
	# itself instead of leaving the overlay up until the timer expires.
	_show_question(0)

func _build_overlay():
	# Layout is scene-owned; lane buttons spawn into %LanesContainer.
	_overlay = ResourceRegistry.instantiate("logic_dive_overlay")
	add_child(_overlay)
	_question_label = _overlay.get_node("%QuestionLabel")
	_lanes_container = _overlay.get_node("%LanesContainer")
	_question_anim = _overlay.get_node("%QuestionAnimator")

func _show_question(index: int):
	if index >= questions.size():
		_on_correct_answer({"questions_answered": questions.size()})
		return

	current_question_index = index
	_showing_question = true

	var q = questions[index]
	_question_label.text = q.get("questionText", "???")

	for btn in _lane_buttons:
		btn.queue_free()
	_lane_buttons.clear()
	_button_original_indices.clear()

	var answers = q.get("answers", [])
	var filtered_answers: Array = []

	for i in range(answers.size()):
		var answer = answers[i]
		var answer_text = answer.get("answerText", "").strip_edges()
		if not answer_text.is_empty():
			filtered_answers.append({"answer": answer, "original_index": i})

	var rng = GameRandom.stream("logic_dive")
	GameRandom.shuffle_with(filtered_answers, rng)

	for i in range(filtered_answers.size()):
		var entry = filtered_answers[i]
		var answer = entry["answer"]
		var original_index = entry["original_index"]
		var btn: Button = ResourceRegistry.instantiate("lane_button")
		btn.text = answer.get("answerText", "?")
		var is_correct = answer.get("isCorrect", false)
		btn.pressed.connect(_on_answer_selected.bind(original_index, is_correct))
		_lanes_container.add_child(btn)
		_lane_buttons.append(btn)
		_button_original_indices.append(original_index)

	var progress = _overlay.get_node_or_null("%ProgressLabel")
	if progress:
		progress.text = "Question %d / %d" % [index + 1, questions.size()]

	_question_anim.play("show_question")

func _on_answer_selected(original_index: int, is_correct: bool):
	if not _showing_question:
		return
	_showing_question = false

	var q = questions[current_question_index]
	var answers = q.get("answers", [])

	for i in range(_lane_buttons.size()):
		var btn = _lane_buttons[i]
		btn.disabled = true
		var btn_original_idx = _button_original_indices[i]
		if btn_original_idx == original_index:
			btn.modulate = UITheme.COLOR_CORRECT if is_correct else UITheme.COLOR_WRONG
		elif answers[btn_original_idx].get("isCorrect", false):
			btn.modulate = UITheme.COLOR_CORRECT

	if is_correct:
		await get_tree().create_timer(MinigameConfig.TIMING["result_pause"]).timeout
		_show_question(current_question_index + 1)
	else:
		# As in NonstopDebate: one wrong answer ends the attempt, and every
		# question must be right to advance.
		InfluenceGauge.take_damage(difficulty)
		await get_tree().create_timer(1.5).timeout
		_finish(false, {"reason": "wrong_answer"})

func _on_influence_depleted():
	_finish(false, {"reason": "influence_depleted"})

func cleanup():
	if _overlay:
		_overlay.queue_free()
	super.cleanup()
