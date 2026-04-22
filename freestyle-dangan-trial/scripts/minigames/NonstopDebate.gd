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
var _turn_label: Label

var _influence_gauge_ui: Node
var _truth_bullet_selector: Node
var _crosshair: Node
var _timer_display: Node

# Slow-time state
var _is_slow_time: bool = false
var _slow_vignette: ColorRect = null
const SLOW_TIME_SCALE: float = 0.4

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

	# Show bullet preview before starting the timer
	await _show_bullet_preview()

	if time_limit > 0:
		_timer_display.start_timer(time_limit)

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

	# Turn indicator at top-right under timer
	var turn_canvas = CanvasLayer.new()
	turn_canvas.layer = 10
	add_child(turn_canvas)
	_turn_label = Label.new()
	_turn_label.text = "TURN 1"
	_turn_label.add_theme_font_size_override("font_size", 14)
	_turn_label.add_theme_color_override("font_color", Color.WHITE)
	_turn_label.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	_turn_label.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	_turn_label.grow_vertical = Control.GROW_DIRECTION_END
	_turn_label.position = Vector2(-140, 90)
	turn_canvas.add_child(_turn_label)

func _show_bullet_preview() -> void:
	var bullets = TruthBulletManager.active_bullets
	if bullets.is_empty():
		return

	var preview_canvas = CanvasLayer.new()
	preview_canvas.layer = 25
	add_child(preview_canvas)

	# Use a Control wrapper so we can tween modulate (CanvasLayer has no modulate)
	var root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.modulate.a = 0.0
	preview_canvas.add_child(root)

	var bg = ColorRect.new()
	bg.color = Color(0.0, 0.0, 0.0, 0.75)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(bg)

	var container = VBoxContainer.new()
	container.set_anchors_preset(Control.PRESET_CENTER)
	container.grow_horizontal = Control.GROW_DIRECTION_BOTH
	container.grow_vertical = Control.GROW_DIRECTION_BOTH
	container.add_theme_constant_override("separation", 8)
	root.add_child(container)

	var header = Label.new()
	header.text = "TRUTH BULLETS"
	header.add_theme_font_size_override("font_size", 20)
	header.add_theme_color_override("font_color", Color(0.4, 0.7, 1.0))
	header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	container.add_child(header)

	var grid = GridContainer.new()
	grid.columns = mini(bullets.size(), 4)
	grid.add_theme_constant_override("h_separation", 16)
	grid.add_theme_constant_override("v_separation", 8)
	container.add_child(grid)

	for bullet in bullets:
		var name_lbl = Label.new()
		name_lbl.text = bullet.get("name", "?")
		name_lbl.add_theme_font_size_override("font_size", 13)
		name_lbl.add_theme_color_override("font_color", Color.WHITE)
		name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		name_lbl.custom_minimum_size.x = 120
		name_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD
		grid.add_child(name_lbl)

	# Fade in, hold 1 second, fade out (tween the Control wrapper, not CanvasLayer)
	var tween = create_tween()
	tween.tween_property(root, "modulate:a", 1.0, 0.2)
	tween.tween_interval(1.0)
	tween.tween_property(root, "modulate:a", 0.0, 0.3)
	await tween.finished
	preview_canvas.queue_free()

func _process(delta):
	if not is_active or _solved:
		return

	# Slow-time toggle
	var want_slow = Input.is_action_pressed("debate_slow_time")
	if want_slow and not _is_slow_time:
		_activate_slow_time()
	elif not want_slow and _is_slow_time:
		_deactivate_slow_time()

	_spawn_timer += delta
	if _spawn_timer >= _spawn_interval:
		_spawn_timer = 0.0
		_spawn_next_line()

func _activate_slow_time():
	_is_slow_time = true
	Engine.time_scale = SLOW_TIME_SCALE
	AudioManager.set_voice_pitch(SLOW_TIME_SCALE)

	if not _slow_vignette:
		var vig_canvas = CanvasLayer.new()
		vig_canvas.layer = 18
		add_child(vig_canvas)
		_slow_vignette = ColorRect.new()
		_slow_vignette.color = Color(0.0, 0.1, 0.3, 0.0)
		_slow_vignette.set_anchors_preset(Control.PRESET_FULL_RECT)
		_slow_vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
		vig_canvas.add_child(_slow_vignette)

	var tween = create_tween()
	tween.tween_property(_slow_vignette, "color:a", 0.35, 0.15)

func _deactivate_slow_time():
	_is_slow_time = false
	Engine.time_scale = 1.0
	AudioManager.set_voice_pitch(1.0)

	if _slow_vignette:
		var tween = create_tween()
		tween.tween_property(_slow_vignette, "color:a", 0.0, 0.2)

func _spawn_next_line():
	if dialogue_lines.is_empty():
		return

	if current_debate_line_index >= dialogue_lines.size():
		current_debate_line_index = 0
		debate_loop_count += 1
		print("NonstopDebate: Loop ", debate_loop_count)

	var line_data = dialogue_lines[current_debate_line_index]
	current_debate_line_index += 1

	var turn_number = debate_loop_count * dialogue_lines.size() + current_debate_line_index
	if _turn_label:
		_turn_label.text = "TURN %d" % turn_number

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
	if voice_file is String and not voice_file.is_empty():
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

	# Stop any playing line audio immediately
	AudioManager.stop_voice()

	# Freeze remaining panels and timer immediately
	for p in _panels_on_screen:
		if is_instance_valid(p) and p != panel:
			p.set_panel_active(false)
	if _timer_display:
		_timer_display.stop_timer()

	# Restore time scale if slow-time was active
	if _is_slow_time:
		_deactivate_slow_time()

	# Capture panel data before it gets freed
	var panel_center = panel.global_position + panel.size / 2
	var panel_bullet_id = panel.answer_bullet_id

	# 1. Hit-stop freeze + white flash
	ScreenEffects.impact_frame(0.05)
	await get_tree().create_timer(0.05).timeout

	AudioManager.play_sfx("break_shatter")
	ScreenEffects.white_flash(0.25)
	panel.destroy_with_effect()

	# 2. Shatter particles burst from panel center
	_spawn_shatter_particles(panel_center)
	await get_tree().create_timer(0.1).timeout

	# 3. BREAK label slams in
	_break_label.visible = true
	_break_label.modulate.a = 1.0
	_break_label.scale = Vector2(0.1, 0.1)
	var break_tween = create_tween()
	break_tween.tween_property(_break_label, "scale", Vector2(1.1, 1.1), 0.2).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	break_tween.tween_property(_break_label, "scale", Vector2(1.0, 1.0), 0.08).set_ease(Tween.EASE_IN)
	await break_tween.finished
	await get_tree().create_timer(0.25).timeout

	# 4. Evidence card overlay
	var evidence_card = _show_evidence_card(panel_bullet_id)
	await get_tree().create_timer(1.2).timeout

	# 5. Fade out both card and BREAK label together
	var fade_tween = create_tween()
	fade_tween.set_parallel(true)
	fade_tween.tween_property(_break_label, "modulate:a", 0.0, 0.4)
	if evidence_card and is_instance_valid(evidence_card):
		fade_tween.tween_property(evidence_card, "modulate:a", 0.0, 0.4)
	await fade_tween.finished

	_on_correct_answer({"loops": debate_loop_count})

func _spawn_shatter_particles(center: Vector2):
	for i in range(10):
		var shard = ColorRect.new()
		shard.size = Vector2(6, 6)
		shard.color = Color(1.0, 0.855, 0.039)  # #FFDA0A gold
		shard.position = center - shard.size / 2
		_overlay.add_child(shard)

		var angle = i * (TAU / 10.0) + randf_range(-0.3, 0.3)
		var speed = randf_range(200.0, 500.0)
		var vel = Vector2(cos(angle), sin(angle)) * speed
		var dur = randf_range(0.4, 0.6)

		var tween = create_tween()
		tween.set_parallel(true)
		tween.tween_property(shard, "position", shard.position + vel * dur, dur).set_ease(Tween.EASE_OUT)
		tween.tween_property(shard, "modulate:a", 0.0, dur).set_ease(Tween.EASE_IN)
		tween.finished.connect(func(): shard.queue_free())

func _show_evidence_card(bullet_id: String) -> Control:
	var bullet_name = TruthBulletManager.get_bullet_name(bullet_id)

	var card = PanelContainer.new()
	var card_style = StyleBoxFlat.new()
	card_style.bg_color = Color(0.039, 0.039, 0.078, 0.95)  # #0A0A14
	card_style.border_color = Color(1.0, 0.855, 0.039)       # #FFDA0A gold
	card_style.border_width_bottom = 2
	card_style.border_width_top = 2
	card_style.border_width_left = 2
	card_style.border_width_right = 2
	card_style.content_margin_left = 24
	card_style.content_margin_right = 24
	card_style.content_margin_top = 16
	card_style.content_margin_bottom = 16
	card.add_theme_stylebox_override("panel", card_style)
	card.set_anchors_preset(Control.PRESET_CENTER)
	card.grow_horizontal = Control.GROW_DIRECTION_BOTH
	card.grow_vertical = Control.GROW_DIRECTION_BOTH
	card.modulate.a = 0.0
	card.scale = Vector2(0.7, 0.7)
	_overlay.add_child(card)

	var vbox = VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	card.add_child(vbox)

	var header = Label.new()
	header.text = "TRUTH BULLET"
	header.add_theme_font_size_override("font_size", 12)
	header.add_theme_color_override("font_color", Color(0.91, 0.239, 0.502))  # #E83D80 magenta
	header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(header)

	var name_label = Label.new()
	name_label.text = bullet_name
	name_label.add_theme_font_size_override("font_size", 22)
	name_label.add_theme_color_override("font_color", Color.WHITE)
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(name_label)

	# Animate in
	var tween = create_tween()
	tween.set_parallel(true)
	tween.tween_property(card, "modulate:a", 1.0, 0.15)
	tween.tween_property(card, "scale", Vector2(1.0, 1.0), 0.2).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)

	return card

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
	if wrong_comment is String and not wrong_comment.is_empty():
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
				if fail_comment is String and not fail_comment.is_empty():
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

	# Always restore time scale and pitch on cleanup
	if _is_slow_time:
		_deactivate_slow_time()

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
