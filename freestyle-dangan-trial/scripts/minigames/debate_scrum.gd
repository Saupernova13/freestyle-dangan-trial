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

func validate_data() -> Array[String]:
	# A round with no defenseKeywords marks every button wrong, so it can never
	# be won - _finish(false) then replays it, identically, forever.
	var errors: Array[String] = []
	for i in range(arguments.size()):
		var arg = arguments[i]
		if not arg is Dictionary:
			errors.append("argument %d is not an object" % (i + 1))
			continue
		var def_keywords = arg.get("defenseKeywords", [])
		if not def_keywords is Array or def_keywords.is_empty():
			errors.append("argument %d has no defenseKeywords, so it cannot be won" % (i + 1))
	return errors

func start():
	super.start()
	if arguments.is_empty():
		push_warning("DebateScrum: No arguments provided, auto-completing")
		_on_correct_answer({"rounds": 0})
		return

	_build_overlay()
	setup_standard_ui([HudComponent.INFLUENCE_GAUGE, HudComponent.TIMER_DISPLAY])
	connect_managed(InfluenceGauge.influence_depleted, _on_influence_depleted)
	Log.info("DebateScrum", "%d arguments" % arguments.size())

	await get_tree().create_timer(0.5).timeout
	_show_argument(0)

func _build_overlay():
	# Layout is scene-owned; see scenes/minigames/debate_scrum_overlay.tscn.
	_overlay = ResourceRegistry.instantiate("debate_scrum_overlay")
	add_child(_overlay)
	_progress_bar = _overlay.get_node("%ProgressBar")
	_progress_fill = _overlay.get_node("%ProgressFill")
	_opposition_label = _overlay.get_node("%OppositionLabel")
	_defense_label = _overlay.get_node("%DefenseLabel")
	_score_label = _overlay.get_node("%ScoreLabel")
	_turn_timer_label = _overlay.get_node("%TurnTimerLabel")

	# Buttons are authored in the overlay scene as KeywordButton0..N.
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
		# Only reachable with every round correct: a wrong answer exits via
		# _finish(false, ...) and the trial manager replays the minigame.
		_update_progress_bar(1.0)
		_on_correct_answer({"rounds": arguments.size()})
		return

	_turn_timer = 0.0
	_turn_active = true
	current_argument_index = index
	_update_progress_bar(float(index) / float(arguments.size()))
	var arg = arguments[index]

	_opposition_label.text = _format_character_line(
		arg.get("oppositionStatement", "..."), arg.get("oppositionCharacterId", "")
	)
	_defense_label.text = _format_character_line(arg.get("defenseStatement", ""), arg.get("defenseCharacterId", ""))

	var opp_audio = arg.get("oppositionAudioFile", "")
	if opp_audio:
		AudioManager.play_voice_line(opp_audio)

	var def_keywords = arg.get("defenseKeywords", [])
	var all_keywords = _deal_keywords(def_keywords, arg.get("oppositionKeywords", []))

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

## The buttons to show, correct answers first-class.
##
## The old version concatenated both lists, shuffled, then took the first five
## - so with more than five candidates the slice discarded entries at random,
## and any of them could be a correct one. Three defense and four opposition
## keywords is seven candidates for five buttons, and some shuffles hid every
## correct answer, forcing the player to click a wrong one. shuffle() re-rolls
## each attempt, so it read as unexplained repeated failure at a round they had
## answered as well as they could.
##
## Every defense keyword is seated first; the remainder is filled from the
## opposition list, and only then is the chosen set shuffled.
func _deal_keywords(def_keywords: Array, opp_keywords: Array) -> Array:
	var button_count := _defense_buttons.size()
	var chosen: Array = []
	for kw in def_keywords:
		if not chosen.has(kw):
			chosen.append(kw)
	if chosen.size() > button_count:
		Log.warn(
			"DebateScrum",
			(
				"Round has %d defense keywords but only %d buttons; %d cannot be shown"
				% [chosen.size(), button_count, chosen.size() - button_count]
			)
		)
		chosen.shuffle()
		chosen.resize(button_count)

	var decoys: Array = []
	for kw in opp_keywords:
		if not chosen.has(kw) and not decoys.has(kw):
			decoys.append(kw)
	decoys.shuffle()
	for kw in decoys:
		if chosen.size() >= button_count:
			break
		chosen.append(kw)

	chosen.shuffle()
	return chosen

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
		# As in NonstopDebate: one wrong keyword ends the attempt, and every
		# round must be cleared to win.
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
	# As in NonstopDebate: a round timeout ends the whole attempt.
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
