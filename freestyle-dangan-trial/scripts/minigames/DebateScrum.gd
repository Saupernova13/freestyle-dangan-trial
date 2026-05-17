extends MinigameBase

var arguments: Array = []
var current_argument_index: int = 0
var player_score: int = 0
var opponent_score: int = 0

var _overlay: CanvasLayer
var _opposition_label: Label
var _defense_label: Label
var _defense_buttons: Array = []
var _progress_bar: ColorRect
var _progress_fill: ColorRect
var _score_label: Label
var _turn_timer_label: Label

var _influence_gauge_ui: Node
var _timer_display: Node

var _turn_timer: float = 0.0
const TURN_TIME_LIMIT: float = 5.0
var _turn_active: bool = false

func initialize(data: Dictionary):
	super.initialize(data)
	var type_specific = data.get("typeSpecific", {})
	arguments = type_specific.get("arguments", [])

func start():
	super.start()
	if arguments.is_empty():
		push_warning("DebateScrum: No arguments provided, auto-completing")
		_on_correct_answer({"score": 0})
		return

	_build_overlay()
	_setup_ui()
	InfluenceGauge.reset()
	InfluenceGauge.influence_depleted.connect(_on_influence_depleted)
	print("DebateScrum: ", arguments.size(), " arguments")

	await get_tree().create_timer(0.5).timeout
	_show_argument(0)

func _build_overlay():
	_overlay = CanvasLayer.new()
	_overlay.layer = 5
	add_child(_overlay)

	var bg = ColorRect.new()
	bg.color = Color(0.05, 0.02, 0.08, 0.85)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_overlay.add_child(bg)

	var title = Label.new()
	title.text = "DEBATE SCRUM"
	title.add_theme_font_size_override("font_size", 28)
	title.add_theme_color_override("font_color", Color(1.0, 0.8, 0.2))
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.set_anchors_preset(Control.PRESET_CENTER_TOP)
	title.position.y = 15
	title.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_overlay.add_child(title)

	# Tug-of-war progress bar
	var bar_container = Control.new()
	bar_container.set_anchors_preset(Control.PRESET_CENTER_TOP)
	bar_container.position.y = 55
	bar_container.custom_minimum_size = Vector2(400, 20)
	bar_container.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_overlay.add_child(bar_container)

	_progress_bar = ColorRect.new()
	_progress_bar.color = Color(0.8, 0.2, 0.2, 0.8)
	_progress_bar.position = Vector2(-200, 0)
	_progress_bar.size = Vector2(400, 20)
	bar_container.add_child(_progress_bar)

	_progress_fill = ColorRect.new()
	_progress_fill.color = Color(0.2, 0.5, 1.0, 0.9)
	_progress_fill.position = Vector2(-200, 0)
	_progress_fill.size = Vector2(200, 20)
	bar_container.add_child(_progress_fill)

	# Opposition statement (left side, red)
	var opposition_panel = PanelContainer.new()
	var opp_style = StyleBoxFlat.new()
	opp_style.bg_color = Color(0.3, 0.1, 0.1, 0.8)
	opp_style.border_width_left = 3
	opp_style.border_color = Color(1.0, 0.3, 0.3)
	opp_style.content_margin_left = 15
	opp_style.content_margin_right = 15
	opp_style.content_margin_top = 10
	opp_style.content_margin_bottom = 10
	opposition_panel.add_theme_stylebox_override("panel", opp_style)
	opposition_panel.set_anchors_preset(Control.PRESET_CENTER_LEFT)
	opposition_panel.position = Vector2(30, -60)
	opposition_panel.custom_minimum_size = Vector2(350, 100)
	_overlay.add_child(opposition_panel)

	_opposition_label = Label.new()
	_opposition_label.add_theme_font_size_override("font_size", 18)
	_opposition_label.add_theme_color_override("font_color", Color(1.0, 0.8, 0.8))
	_opposition_label.autowrap_mode = TextServer.AUTOWRAP_WORD
	_opposition_label.custom_minimum_size.x = 320
	opposition_panel.add_child(_opposition_label)

	# Defense statement (right side, blue)
	var defense_panel = PanelContainer.new()
	var def_style = StyleBoxFlat.new()
	def_style.bg_color = Color(0.1, 0.1, 0.3, 0.8)
	def_style.border_width_right = 3
	def_style.border_color = Color(0.3, 0.5, 1.0)
	def_style.content_margin_left = 15
	def_style.content_margin_right = 15
	def_style.content_margin_top = 10
	def_style.content_margin_bottom = 10
	defense_panel.add_theme_stylebox_override("panel", def_style)
	defense_panel.set_anchors_preset(Control.PRESET_CENTER_RIGHT)
	defense_panel.position = Vector2(-380, -60)
	defense_panel.custom_minimum_size = Vector2(350, 100)
	_overlay.add_child(defense_panel)

	_defense_label = Label.new()
	_defense_label.add_theme_font_size_override("font_size", 18)
	_defense_label.add_theme_color_override("font_color", Color(0.8, 0.8, 1.0))
	_defense_label.autowrap_mode = TextServer.AUTOWRAP_WORD
	_defense_label.custom_minimum_size.x = 320
	defense_panel.add_child(_defense_label)

	# Keyword buttons (center-bottom)
	var keyword_container = VBoxContainer.new()
	keyword_container.set_anchors_preset(Control.PRESET_CENTER)
	keyword_container.position = Vector2(-120, 60)
	keyword_container.custom_minimum_size = Vector2(250, 200)
	keyword_container.add_theme_constant_override("separation", 10)
	_overlay.add_child(keyword_container)

	var keyword_header = Label.new()
	keyword_header.text = "SELECT YOUR REBUTTAL"
	keyword_header.add_theme_font_size_override("font_size", 14)
	keyword_header.add_theme_color_override("font_color", Color(0.3, 0.6, 1.0))
	keyword_container.add_child(keyword_header)

	for i in range(5):
		var btn = Button.new()
		btn.custom_minimum_size = Vector2(240, 40)
		btn.add_theme_font_size_override("font_size", 16)
		var style = StyleBoxFlat.new()
		style.bg_color = Color(0.1, 0.15, 0.3, 0.9)
		style.border_width_bottom = 1
		style.border_width_top = 1
		style.border_width_left = 1
		style.border_width_right = 1
		style.border_color = Color(0.3, 0.5, 0.8, 0.6)
		style.corner_radius_top_left = 4
		style.corner_radius_top_right = 4
		style.corner_radius_bottom_left = 4
		style.corner_radius_bottom_right = 4
		btn.add_theme_stylebox_override("normal", style)
		btn.visible = false
		keyword_container.add_child(btn)
		_defense_buttons.append(btn)

	_score_label = Label.new()
	_score_label.add_theme_font_size_override("font_size", 16)
	_score_label.add_theme_color_override("font_color", Color(0.7, 0.7, 0.8))
	_score_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_score_label.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_score_label.position.y = -30
	_score_label.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_overlay.add_child(_score_label)

	_turn_timer_label = Label.new()
	_turn_timer_label.add_theme_font_size_override("font_size", 20)
	_turn_timer_label.add_theme_color_override("font_color", Color(1.0, 0.8, 0.2))
	_turn_timer_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_turn_timer_label.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_turn_timer_label.position.y = 60
	_turn_timer_label.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_overlay.add_child(_turn_timer_label)

func _process(delta):
	if not is_active or not _turn_active:
		return

	_turn_timer += delta
	var time_left = maxf(TURN_TIME_LIMIT - _turn_timer, 0.0)
	_turn_timer_label.text = "%.1f" % time_left

	var color = Color(0.2, 1.0, 0.4)
	if time_left < 2.0:
		color = Color(1.0, 0.2, 0.2)
	elif time_left < 3.5:
		color = Color(1.0, 0.8, 0.2)
	_turn_timer_label.add_theme_color_override("font_color", color)

	if _turn_timer >= TURN_TIME_LIMIT:
		_auto_advance_turn()

func _setup_ui():
	_influence_gauge_ui = preload("res://scenes/ui/influence_gauge.tscn").instantiate()
	add_child(_influence_gauge_ui)
	_influence_gauge_ui.show_gauge()

	_timer_display = preload("res://scenes/ui/timer_display.tscn").instantiate()
	add_child(_timer_display)
	_timer_display.time_expired.connect(_on_time_expired)
	if time_limit > 0:
		_timer_display.start_timer(time_limit)

func _show_argument(index: int):
	if index >= arguments.size():
		var success = player_score >= opponent_score
		if success:
			_on_correct_answer({"score": player_score})
		else:
			_finish(false, {"reason": "outscored", "score": player_score})
		return

	_turn_timer = 0.0
	_turn_active = true
	current_argument_index = index
	var arg = arguments[index]

	var opp_text = arg.get("oppositionStatement", "...")
	var opp_char_id = arg.get("oppositionCharacterId", "")
	if not opp_char_id.is_empty():
		var char_data = TrialLoader.load_character(opp_char_id)
		if char_data != null and not char_data.is_empty():
			var char_name = char_data.get("name", "") + " " + char_data.get("surname", "")
			opp_text = char_name.strip_edges() + ":\n" + opp_text
	_opposition_label.text = opp_text

	var def_text = arg.get("defenseStatement", "")
	var def_char_id = arg.get("defenseCharacterId", "")
	if def_char_id:
		var char_data = TrialLoader.load_character(def_char_id)
		if char_data != null and not char_data.is_empty():
			var char_name = char_data.get("name", "") + " " + char_data.get("surname", "")
			def_text = char_name.strip_edges() + ":\n" + def_text
	_defense_label.text = def_text

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

func _on_keyword_selected(_keyword: String, is_correct: bool, btn: Button):
	_turn_active = false
	for b in _defense_buttons:
		b.disabled = true

	if is_correct:
		btn.modulate = Color(0.3, 1.0, 0.5)
		player_score += 1
		AudioManager.play_sfx("correct_chime")
		var arg = arguments[current_argument_index]
		var def_audio = arg.get("defenseAudioFile", "")
		if not def_audio.is_empty():
			AudioManager.play_voice_line(def_audio)
	else:
		btn.modulate = Color(1.0, 0.3, 0.3)
		opponent_score += 1
		AudioManager.play_sfx("wrong_buzzer")
		InfluenceGauge.take_damage(difficulty)

	_update_progress_bar()
	_update_score_display()

	await get_tree().create_timer(1.0).timeout
	_show_argument(current_argument_index + 1)

func _update_progress_bar():
	var total = player_score + opponent_score
	if total <= 0:
		return
	var ratio = float(player_score) / float(total)
	var target_width = 400.0 * ratio
	var tween = create_tween()
	tween.tween_property(_progress_fill, "size:x", target_width, 0.3)

func _update_score_display():
	_score_label.text = "Defense: %d  |  Opposition: %d  |  Round %d/%d" % [
		player_score, opponent_score,
		current_argument_index + 1, arguments.size()
	]

func _auto_advance_turn():
	_turn_active = false
	for b in _defense_buttons:
		b.disabled = true
	opponent_score += 1
	_update_progress_bar()
	_update_score_display()
	await get_tree().create_timer(1.0).timeout
	_show_argument(current_argument_index + 1)

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
