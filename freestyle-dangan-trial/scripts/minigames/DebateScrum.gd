extends MinigameBase

var arguments: Array = []
var current_argument_index: int = 0

var _overlay: CanvasLayer
var _opposition_label: Label
var _defense_label: Label
var _defense_buttons: Array = []
var _progress_bar: ColorRect
var _progress_fill: ColorRect
var _score_label: Label
var _turn_timer_label: Label

var _turn_timer: float = 0.0
var _turn_active: bool = false

func initialize(data: MinigameData):
	super.initialize(data)
	var type_specific := data.type_specific
	arguments = type_specific.get("arguments", [])

func start():
	super.start()
	if arguments.is_empty():
		push_warning("DebateScrum: No arguments provided, auto-completing")
		_on_correct_answer({"rounds": 0})
		return

	_build_overlay()
	setup_standard_ui([HudComponent.INFLUENCE_GAUGE, HudComponent.TIMER_DISPLAY])
	InfluenceGauge.reset()
	connect_managed(InfluenceGauge.influence_depleted, _on_influence_depleted)
	Log.info("DebateScrum", "%d arguments" % arguments.size())

	await get_tree().create_timer(0.5).timeout
	_show_argument(0)

func _build_overlay():
	# Scene-driven — see scenes/minigames/debate_scrum_overlay.tscn.
	# Defense (rebuttal) buttons are spawned dynamically into %KeywordContainer.
	_overlay = ResourceRegistry.instantiate("debate_scrum_overlay")
	add_child(_overlay)
	_progress_bar = _overlay.get_node("%ProgressBar")
	_progress_fill = _overlay.get_node("%ProgressFill")
	_opposition_label = _overlay.get_node("%OppositionLabel")
	_defense_label = _overlay.get_node("%DefenseLabel")
	_score_label = _overlay.get_node("%ScoreLabel")
	_turn_timer_label = _overlay.get_node("%TurnTimerLabel")

	# The keyword buttons are authored in the overlay scene (KeywordButton0..N).
	_defense_buttons.clear()
	for i in range(MinigameConfig.SCRUM_KEYWORD_BUTTON_COUNT):
		_defense_buttons.append(_overlay.get_node("%%KeywordButton%d" % i))

func _process(delta):
	if not is_active or not _turn_active:
		return

	_turn_timer += delta
	var time_left = maxf(MinigameConfig.SCRUM_TURN_TIME_LIMIT - _turn_timer, 0.0)
	_turn_timer_label.text = "%.1f" % time_left

	var color = UITheme.COLOR_CORRECT_BRIGHT
	if time_left < 2.0:
		color = UITheme.COLOR_WRONG_BRIGHT
	elif time_left < 3.5:
		color = UITheme.COLOR_WARN_YELLOW
	_turn_timer_label.add_theme_color_override("font_color", color)

	if _turn_timer >= MinigameConfig.SCRUM_TURN_TIME_LIMIT:
		_auto_advance_turn()

func _show_argument(index: int):
	if index >= arguments.size():
		# Reaching the end only happens after every round was answered
		# correctly — wrong answers exit through _finish(false, ...) and the
		# trial manager replays the whole minigame.
		_update_progress_bar(1.0)
		_on_correct_answer({"rounds": arguments.size()})
		return

	_turn_timer = 0.0
	_turn_active = true
	current_argument_index = index
	_update_progress_bar(float(index) / float(arguments.size()))
	var arg = arguments[index]

	_opposition_label.text = _format_character_line(arg.get("oppositionStatement", "..."), arg.get("oppositionCharacterId", ""))
	_defense_label.text = _format_character_line(arg.get("defenseStatement", ""), arg.get("defenseCharacterId", ""))

	var opp_audio = arg.get("oppositionAudioFile", "")
	if opp_audio:
		AudioManager.play_voice_line(opp_audio)

	var opp_keywords = arg.get("oppositionKeywords", [])
	var def_keywords = arg.get("defenseKeywords", [])
	var all_keywords = def_keywords.duplicate()

	for kw in opp_keywords:
		if kw not in all_keywords:
			all_keywords.append(kw)
	all_keywords.shuffle()

	for i in range(_defense_buttons.size()):
		var btn = _defense_buttons[i]
		if i < all_keywords.size():
			btn.text = all_keywords[i]
			btn.visible = true
			btn.disabled = false
			btn.modulate = Color.WHITE
			for conn in btn.pressed.get_connections():
				btn.pressed.disconnect(conn.callable)
			var keyword = all_keywords[i]
			var is_correct = keyword in def_keywords
			btn.pressed.connect(_on_keyword_selected.bind(keyword, is_correct, btn))
		else:
			btn.visible = false

	_update_score_display()

func _format_character_line(text: String, char_id: String) -> String:
	if char_id.is_empty():
		return text
	var char_data = TrialLoader.load_character(char_id)
	if char_data == null or char_data.is_empty():
		return text
	var char_name = char_data.get("name", "") + " " + char_data.get("surname", "")
	return char_name.strip_edges() + ":\n" + text

func _on_keyword_selected(_keyword: String, is_correct: bool, btn: Button):
	_turn_active = false
	for b in _defense_buttons:
		b.disabled = true

	if is_correct:
		btn.modulate = UITheme.COLOR_CORRECT
		var arg = arguments[current_argument_index]
		var def_audio = arg.get("defenseAudioFile", "")
		if not def_audio.is_empty():
			AudioManager.play_voice_line(def_audio)
		_update_score_display()
		await get_tree().create_timer(MinigameConfig.TIMING["result_pause"]).timeout
		_show_argument(current_argument_index + 1)
	else:
		# Match NonstopDebate: a wrong keyword ends the attempt and the trial
		# manager replays the minigame. Player must clear every round to win.
		btn.modulate = UITheme.COLOR_WRONG
		InfluenceGauge.take_damage(difficulty)
		await get_tree().create_timer(MinigameConfig.TIMING["result_pause"]).timeout
		_finish(false, {"reason": "wrong_answer"})

func _update_progress_bar(ratio: float):
	var target_width = 400.0 * clampf(ratio, 0.0, 1.0)
	var tween = create_tween()
	tween.tween_property(_progress_fill, "size:x", target_width, 0.3)

func _update_score_display():
	_score_label.text = "Round %d / %d" % [current_argument_index + 1, arguments.size()]

func _auto_advance_turn():
	# Match NonstopDebate timeout: running out of time on a round ends the
	# attempt and the trial manager replays the minigame.
	_turn_active = false
	for b in _defense_buttons:
		b.disabled = true
	_finish(false, {"reason": "time_expired"})

func _on_influence_depleted():
	_finish(false, {"reason": "influence_depleted"})

func cleanup():
	if _overlay:
		_overlay.queue_free()
	super.cleanup()
