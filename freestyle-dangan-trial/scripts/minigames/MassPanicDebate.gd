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

var _influence_gauge_ui: Node
var _truth_bullet_selector: Node
var _crosshair: Node
var _timer_display: Node

func initialize(data: Dictionary):
	super.initialize(data)
	var type_specific = data.get("typeSpecific", {})
	line_groups = type_specific.get("lineGroups", [])
	speaker_ids = [
		type_specific.get("speaker1CharacterId", ""),
		type_specific.get("speaker2CharacterId", ""),
		type_specific.get("speaker3CharacterId", "")
	]

	match difficulty:
		"easy":
			_spawn_interval = 3.5
		"hard":
			_spawn_interval = 2.0
		_:
			_spawn_interval = 3.0

func start():
	super.start()
	_solved = false
	current_group_index = 0

	_build_overlay()
	_setup_ui()

	InfluenceGauge.reset()
	if not InfluenceGauge.influence_depleted.is_connected(_on_influence_depleted):
		InfluenceGauge.influence_depleted.connect(_on_influence_depleted)
	TruthBulletManager.load_bullets()
	if not InputManager.shoot_pressed.is_connected(_on_shoot):
		InputManager.shoot_pressed.connect(_on_shoot)

	print("MassPanicDebate: ", line_groups.size(), " groups, 3 speakers")

func _build_overlay():
	# Scene-driven — see scenes/minigames/mass_panic_debate_overlay.tscn.
	# Text panels spawn dynamically into %Row0/Row1/Row2 containers.
	_overlay = preload("res://scenes/minigames/mass_panic_debate_overlay.tscn").instantiate()
	add_child(_overlay)
	_row_containers = [
		_overlay.get_node("%Row0"),
		_overlay.get_node("%Row1"),
		_overlay.get_node("%Row2"),
	]
	_focus_indicator = _overlay.get_node("%FocusIndicator")
	_break_label = _overlay.get_node("%BreakLabel")

func _setup_ui():
	_influence_gauge_ui = preload("res://scenes/ui/influence_gauge.tscn").instantiate()
	add_child(_influence_gauge_ui)
	_influence_gauge_ui.show_gauge()

	_truth_bullet_selector = preload("res://scenes/ui/truth_bullet_selector.tscn").instantiate()
	add_child(_truth_bullet_selector)
	_truth_bullet_selector.show_selector()

	_crosshair = preload("res://scenes/ui/crosshair.tscn").instantiate()
	add_child(_crosshair)
	_crosshair.show_crosshair()

	_timer_display = preload("res://scenes/ui/timer_display.tscn").instantiate()
	add_child(_timer_display)
	_timer_display.time_expired.connect(_on_time_expired)
	if time_limit > 0:
		_timer_display.start_timer(time_limit)

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
	var row_starts = [100, 250, 400]
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

		var panel = DebateTextPanel.new()
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
				_trigger_spotlight(speaker_ids[i])

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
	_break_label.scale = Vector2(0.5, 0.5)
	_break_label.modulate.a = 1.0
	var tween = create_tween()
	tween.tween_property(_break_label, "scale", Vector2(1.2, 1.2), 0.3).set_ease(Tween.EASE_OUT)
	tween.tween_interval(1.0)
	tween.tween_property(_break_label, "modulate:a", 0.0, 0.5)
	tween.finished.connect(func():
		_on_correct_answer({})
	)

	if _timer_display:
		_timer_display.stop_timer()

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

func _trigger_spotlight(char_id: String):
	var trial_room = get_tree().get_first_node_in_group("trial_room")
	if trial_room and trial_room.has_method("find_character_position"):
		var pos = trial_room.find_character_position(char_id)
		if pos >= 0:
			var cam = get_viewport().get_camera_3d()
			if cam and cam.has_method("jump_to_bench"):
				cam.jump_to_bench(pos, true)

func cleanup():
	super.cleanup()
	if _crosshair:
		_crosshair.hide_crosshair()
	if _influence_gauge_ui:
		_influence_gauge_ui.hide_gauge()
	if _truth_bullet_selector:
		_truth_bullet_selector.hide_selector()
	if _timer_display:
		_timer_display.hide_timer()
	if InputManager.shoot_pressed.is_connected(_on_shoot):
		InputManager.shoot_pressed.disconnect(_on_shoot)
	if InfluenceGauge.influence_depleted.is_connected(_on_influence_depleted):
		InfluenceGauge.influence_depleted.disconnect(_on_influence_depleted)
	if _overlay:
		_overlay.queue_free()
