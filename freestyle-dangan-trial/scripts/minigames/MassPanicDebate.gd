extends MinigameBase

var line_groups: Array = []
var speaker_ids: Array = []
var current_group_index: int = 0
var focused_row: int = 1
var _solved: bool = false

var _overlay: CanvasLayer
var _row_containers: Array = []
var _focus_indicator: ColorRect
var _panels_on_screen: Array = []
var _spawn_timer: float = 0.0
var _spawn_interval: float = 3.0
var _break_label: Label

func initialize(data: Dictionary):
	super.initialize(data)
	var type_specific = data.get("typeSpecific", {})
	line_groups = type_specific.get("lineGroups", [])
	speaker_ids = [
		type_specific.get("speaker1CharacterId", ""),
		type_specific.get("speaker2CharacterId", ""),
		type_specific.get("speaker3CharacterId", "")
	]

	_spawn_interval = MinigameConfig.get_spawn_interval("mass_panic_debate", difficulty)

func start():
	super.start()
	_solved = false
	current_group_index = 0

	_build_overlay()
	setup_standard_ui([
		HudComponent.INFLUENCE_GAUGE,
		HudComponent.TRUTH_BULLET_SELECTOR,
		HudComponent.CROSSHAIR,
		HudComponent.TIMER_DISPLAY,
	])

	InfluenceGauge.reset()
	connect_managed(InfluenceGauge.influence_depleted, _on_influence_depleted)
	TruthBulletManager.load_bullets()
	connect_managed(InputManager.shoot_pressed, _on_shoot)

	print("MassPanicDebate: ", line_groups.size(), " groups, 3 speakers")

func _build_overlay():
	# Scene-driven — see scenes/minigames/mass_panic_debate_overlay.tscn.
	# Text panels spawn dynamically into %Row0/Row1/Row2 containers.
	_overlay = ResourceRegistry.instantiate("mass_panic_debate_overlay")
	add_child(_overlay)
	_row_containers = [
		_overlay.get_node("%Row0"),
		_overlay.get_node("%Row1"),
		_overlay.get_node("%Row2"),
	]
	_focus_indicator = _overlay.get_node("%FocusIndicator")
	_break_label = _overlay.get_node("%BreakLabel")
	# Touch path: each row container becomes its own focus target.
	# A bare Container ignores input by default, so flip mouse_filter to STOP
	# and listen for press/tap via _gui_input on each row.
	for i in range(_row_containers.size()):
		var row: Control = _row_containers[i]
		if row == null:
			continue
		row.mouse_filter = Control.MOUSE_FILTER_STOP
		var row_index := i
		row.gui_input.connect(func(event: InputEvent): _on_row_tapped(event, row_index))

func _on_row_tapped(event: InputEvent, row_index: int) -> void:
	if not is_active or _solved:
		return
	var is_tap: bool = (event is InputEventScreenTouch and event.pressed) \
		or (event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT)
	if is_tap and row_index != focused_row:
		_switch_focus(row_index)

func _input(event):
	if not is_active or _solved:
		return

	if event is InputEventKey and event.pressed:
		match event.keycode:
			KEY_UP:
				_switch_focus((focused_row - 1 + 3) % 3)
				get_viewport().set_input_as_handled()
			KEY_DOWN:
				_switch_focus((focused_row + 1) % 3)
				get_viewport().set_input_as_handled()

func _switch_focus(new_row: int):
	focused_row = new_row
	var row_starts = MinigameConfig.SCREEN_LAYOUT["mass_panic_row_y"]
	var tween = create_tween()
	tween.tween_property(_focus_indicator, "position:y", row_starts[focused_row] - 10, 0.15)

	for entry in _panels_on_screen:
		var panel: DebateTextPanel = entry.panel
		var row: int = entry.row
		if is_instance_valid(panel) and panel.has_answer():
			panel.set_shootable(row == focused_row)

func _process(delta):
	if not is_active or _solved:
		return

	_spawn_timer += delta
	if _spawn_timer >= _spawn_interval:
		_spawn_timer = 0.0
		_spawn_group()

func _spawn_group():
	if line_groups.is_empty():
		return

	if current_group_index >= line_groups.size():
		current_group_index = 0

	var group = line_groups[current_group_index]
	current_group_index += 1

	var speaker_keys = ["speaker1", "speaker2", "speaker3"]
	for i in range(3):
		var speaker_data = group.get(speaker_keys[i], {})
		if speaker_data.is_empty():
			continue

		var panel: DebateTextPanel = ResourceRegistry.instantiate("debate_text_panel")
		var line_data = speaker_data.duplicate()
		line_data["characterId"] = speaker_ids[i]
		var answer_bullet_id = line_data.get("answerBulletId", "")
		line_data["isShootable"] = (i == focused_row) and answer_bullet_id is String and not answer_bullet_id.is_empty()

		panel.setup(line_data, get_difficulty_multiplier())
		panel.position.y = 0
		panel.panel_exited_screen.connect(_on_panel_exited)

		_row_containers[i].add_child(panel)
		_panels_on_screen.append({"panel": panel, "row": i, "data": line_data})

		if i == focused_row:
			var voice_file = speaker_data.get("voiceLineFile", "")
			if voice_file is String and not voice_file.is_empty():
				AudioManager.play_voice_line(voice_file)
			if not speaker_ids[i].is_empty():
				trigger_spotlight(speaker_ids[i])

		if speaker_data.get("isLoudAssertion", false):
			ScreenEffects.screen_shake(0.2, 0.01)
			ScreenEffects.red_flash(0.15)

func _on_shoot(click_pos: Vector2):
	if not is_active or _solved:
		return

	for entry in _panels_on_screen:
		var panel: DebateTextPanel = entry.panel
		var row: int = entry.row
		if not is_instance_valid(panel):
			continue
		if row != focused_row:
			continue
		if panel.check_hit(click_pos):
			if not panel.is_shootable:
				continue

			var is_correct = TruthBulletManager.check_bullet_match(
				panel.answer_bullet_id,
				panel.use_negative_bullet
			)

			if is_correct:
				_on_correct_hit(panel)
			else:
				_on_wrong_hit()
			return

func _on_correct_hit(panel: DebateTextPanel):
	_solved = true
	AudioManager.play_sfx("break_shatter")
	panel.destroy_with_effect()

	_break_label.visible = true
	_break_label.modulate.a = 1.0
	EffectBuilders.scale_pop(_break_label, Vector2(0.5, 0.5), Vector2(1.2, 1.2), Vector2(1.2, 1.2), 0.3, 0.01)
	var fade = EffectBuilders.fade_out(_break_label, 0.5, false)
	fade.tween_callback(func(): _on_correct_answer({}))

	var timer = get_hud(HudComponent.TIMER_DISPLAY)
	if timer:
		timer.stop_timer()

func _on_wrong_hit():
	AudioManager.play_sfx("wrong_buzzer")
	InfluenceGauge.take_damage(difficulty)

func _on_panel_exited(panel: DebateTextPanel):
	for i in range(_panels_on_screen.size() - 1, -1, -1):
		if _panels_on_screen[i].panel == panel:
			_panels_on_screen.remove_at(i)
	if is_instance_valid(panel):
		panel.queue_free()

func _on_influence_depleted():
	if not _solved:
		_finish(false, {"reason": "influence_depleted"})

func cleanup():
	if _overlay:
		_overlay.queue_free()
	super.cleanup()
