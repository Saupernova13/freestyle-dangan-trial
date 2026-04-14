extends MinigameBase

var dialogue_lines: Array = []
var selected_bullets: Array = []
var current_debate_line_index: int = 0
var debate_loop_count: int = 0
var _panels_on_screen: Array = []
var _spawn_timer: float = 0.0
var _spawn_interval: float = 2.5
var _solved: bool = false

var _overlay: CanvasLayer
var _panels_container: Control
var _break_label: Label

var _influence_gauge_ui: Node
var _truth_bullet_selector: Node
var _crosshair: Node
var _timer_display: Node

func initialize(data: Dictionary):
	super.initialize(data)
	var type_specific = data.get("typeSpecific", {})
	dialogue_lines = type_specific.get("dialogueLines", [])
	selected_bullets = type_specific.get("selectedBullets", [])

	match difficulty:
		"easy":
			_spawn_interval = 3.0
		"hard":
			_spawn_interval = 1.8
		_:
			_spawn_interval = 2.5

func start():
	super.start()
	_solved = false
	current_debate_line_index = 0
	debate_loop_count = 0

	_build_overlay()
	_setup_ui_systems()

	InfluenceGauge.reset()
	InfluenceGauge.influence_depleted.connect(_on_influence_depleted)
	TruthBulletManager.load_bullets()
	if not selected_bullets.is_empty():
		TruthBulletManager.set_active_bullets(selected_bullets)

	InputManager.shoot_pressed.connect(_on_shoot)

	print("NonstopDebate: Started with ", dialogue_lines.size(), " lines, ", time_limit, "s limit")

func _build_overlay():
	_overlay = CanvasLayer.new()
	_overlay.layer = 5
	add_child(_overlay)

	_panels_container = Control.new()
	_panels_container.set_anchors_preset(Control.PRESET_FULL_RECT)
	_panels_container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_overlay.add_child(_panels_container)

	_break_label = Label.new()
	_break_label.text = "BREAK!"
	_break_label.add_theme_font_size_override("font_size", 72)
	_break_label.add_theme_color_override("font_color", Color(1.0, 0.85, 0.1))
	_break_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_break_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_break_label.set_anchors_preset(Control.PRESET_CENTER)
	_break_label.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_break_label.grow_vertical = Control.GROW_DIRECTION_BOTH
	_break_label.visible = false
	_overlay.add_child(_break_label)

func _setup_ui_systems():
	_influence_gauge_ui = preload("res://scripts/ui/InfluenceGaugeUI.gd").new()
	add_child(_influence_gauge_ui)
	_influence_gauge_ui.show_gauge()

	_truth_bullet_selector = preload("res://scripts/ui/TruthBulletSelector.gd").new()
	add_child(_truth_bullet_selector)
	_truth_bullet_selector.show_selector()

	_crosshair = preload("res://scripts/ui/Crosshair.gd").new()
	add_child(_crosshair)
	_crosshair.show_crosshair()

	_timer_display = preload("res://scripts/ui/TimerDisplay.gd").new()
	add_child(_timer_display)
	_timer_display.time_expired.connect(_on_time_expired)
	if time_limit > 0:
		_timer_display.start_timer(time_limit)

func _process(delta):
	if not is_active or _solved:
		return

	_spawn_timer += delta
	if _spawn_timer >= _spawn_interval:
		_spawn_timer = 0.0
		_spawn_next_line()

func _spawn_next_line():
	if dialogue_lines.is_empty():
		return

	if current_debate_line_index >= dialogue_lines.size():
		current_debate_line_index = 0
		debate_loop_count += 1
		print("NonstopDebate: Loop ", debate_loop_count)

	var line_data = dialogue_lines[current_debate_line_index]
	current_debate_line_index += 1

	var panel = DebateTextPanel.new()
	var speed_mult = get_difficulty_multiplier()
	panel.setup(line_data, speed_mult)

	var viewport_height = get_viewport().get_visible_rect().size.y
	var safe_top = 100
	var safe_bottom = 180
	var usable_height = viewport_height - safe_top - safe_bottom
	var num_rows = 5
	var row_height = usable_height / num_rows
	var y_position = safe_top + (current_debate_line_index % num_rows) * row_height
	panel.position.y = clamp(y_position, safe_top, viewport_height - safe_bottom)

	panel.panel_exited_screen.connect(_on_panel_exited)
	_panels_container.add_child(panel)
	_panels_on_screen.append(panel)

	if panel.has_spotlight:
		_trigger_spotlight(panel.character_id)

	var voice_file = line_data.get("voiceLineFile", "")
	if not voice_file.is_empty():
		AudioManager.play_voice_line(voice_file)

func _on_shoot(click_pos: Vector2):
	if not is_active or _solved:
		return

	var hit_panel: DebateTextPanel = null
	for panel in _panels_on_screen:
		if is_instance_valid(panel) and panel.check_hit(click_pos):
			hit_panel = panel
			break

	if hit_panel == null:
		return

	if not hit_panel.is_shootable:
		return

	var projectile = BulletProjectile.new()
	_overlay.add_child(projectile)

	var target_center = hit_panel.global_position + hit_panel.size / 2
	var crosshair_pos = _crosshair.get_position() if _crosshair else click_pos
	projectile.fire(crosshair_pos, target_center)

	var is_correct = TruthBulletManager.check_bullet_match(
		hit_panel.answer_bullet_id,
		hit_panel.use_negative_bullet
	)

	if is_correct:
		projectile.hit_target.connect(func():
			_on_correct_hit(hit_panel)
		)
	else:
		projectile.hit_target.connect(func():
			_on_wrong_hit(hit_panel)
		)

func _on_correct_hit(panel: DebateTextPanel):
	_solved = true
	print("NonstopDebate: BREAK! Correct answer!")

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
		_on_correct_answer({"loops": debate_loop_count})
	)

	for p in _panels_on_screen:
		if is_instance_valid(p) and p != panel:
			p.set_panel_active(false)

	if _timer_display:
		_timer_display.stop_timer()

func _on_wrong_hit(panel: DebateTextPanel):
	print("NonstopDebate: Wrong bullet!")
	AudioManager.play_sfx("wrong_buzzer")
	InfluenceGauge.take_damage(difficulty)

	var flash = ColorRect.new()
	flash.color = Color(1.0, 0.0, 0.0, 0.3)
	flash.set_anchors_preset(Control.PRESET_FULL_RECT)
	_overlay.add_child(flash)
	var tween = create_tween()
	tween.tween_property(flash, "color:a", 0.0, 0.3)
	tween.finished.connect(func(): flash.queue_free())

	var wrong_comment = panel.line_data.get("userWrongAnswerComment", "")
	if not wrong_comment.is_empty():
		_show_feedback_comment(wrong_comment, Color(1.0, 0.4, 0.4))

func _on_panel_exited(panel: DebateTextPanel):
	_panels_on_screen.erase(panel)
	if is_instance_valid(panel):
		panel.queue_free()

func _on_influence_depleted():
	if not _solved:
		_finish(false, {"reason": "influence_depleted"})

func _on_time_expired():
	if not _solved:
		for panel in _panels_on_screen:
			if is_instance_valid(panel) and panel.is_shootable:
				var fail_comment = panel.line_data.get("userFailedComment", "")
				if not fail_comment.is_empty():
					_show_feedback_comment(fail_comment, Color(0.8, 0.8, 0.3))
				break
		_finish(false, {"reason": "time_expired"})

func _trigger_spotlight(char_id: String):
	# Find character bench position and briefly focus camera
	var trial_room = get_tree().get_first_node_in_group("trial_room")
	if trial_room and trial_room.has_method("find_character_position"):
		var pos = trial_room.find_character_position(char_id)
		if pos >= 0:
			var cam = get_viewport().get_camera_3d()
			if cam and cam.has_method("jump_to_bench"):
				cam.jump_to_bench(pos, true)

func _show_feedback_comment(text: String, color: Color):
	var label = Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", 22)
	label.add_theme_color_override("font_color", color)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.set_anchors_preset(Control.PRESET_CENTER)
	label.position.y = 80
	label.grow_horizontal = Control.GROW_DIRECTION_BOTH
	label.modulate.a = 0.0
	_overlay.add_child(label)

	var tween = create_tween()
	tween.tween_property(label, "modulate:a", 1.0, 0.2)
	tween.tween_interval(1.5)
	tween.tween_property(label, "modulate:a", 0.0, 0.3)
	tween.finished.connect(func(): label.queue_free())

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

	for panel in _panels_on_screen:
		if is_instance_valid(panel):
			panel.queue_free()
	_panels_on_screen.clear()

	if _overlay:
		_overlay.queue_free()
