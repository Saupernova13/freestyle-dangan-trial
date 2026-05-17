extends MinigameBase

var dialogue_lines: Array = []
var selected_bullets: Array = []

var _main_lines: Array = []
var _white_noise_lines: Array = []
var _main_line_index: int = 0
var _current_main_panel: DebateTextPanel = null

var _panels_on_screen: Array = []
var _main_spawn_timer: float = 0.0
var _noise_spawn_timer: float = 0.0
var _main_spawn_interval: float = 2.5
var _noise_spawn_interval: float = 1.2
var _solved: bool = false

var _overlay: CanvasLayer
var _panels_container: Control
var _break_label: Label
var _wrong_label: Label
var _turn_label: Label

var _influence_gauge_ui: Node
var _concentrate_gauge_ui: Node
var _truth_bullet_selector: Node
var _crosshair: Node
var _timer_display: Node

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
			_main_spawn_interval = 2.8
		"hard":
			_main_spawn_interval = 1.5
		_:
			_main_spawn_interval = 2.0

	_split_dialogue_lines()

func _split_dialogue_lines():
	_main_lines.clear()
	_white_noise_lines.clear()
	for line in dialogue_lines:
		if line.get("isWhiteNoise", false):
			_white_noise_lines.append(line)
		else:
			_main_lines.append(line)

func start():
	super.start()
	_solved = false
	_main_line_index = 0
	_current_main_panel = null

	_build_overlay()
	_setup_ui_systems()

	InfluenceGauge.reset()
	if not InfluenceGauge.influence_depleted.is_connected(_on_influence_depleted):
		InfluenceGauge.influence_depleted.connect(_on_influence_depleted)
	ConcentrateGauge.reset()

	TruthBulletManager.load_bullets()
	if not selected_bullets.is_empty():
		TruthBulletManager.set_active_bullets(selected_bullets)

	if not InputManager.shoot_pressed.is_connected(_on_shoot):
		InputManager.shoot_pressed.connect(_on_shoot)

	await _show_bullet_preview()

	if time_limit > 0:
		_timer_display.start_timer(time_limit)

	print("NonstopDebate: Started with ", _main_lines.size(), " main lines, ", _white_noise_lines.size(), " white noise lines, ", time_limit, "s limit")

func _build_overlay():
	# Scene-driven — see scenes/minigames/nonstop_debate_overlay.tscn for the
	# static layout (panels container, break/wrong labels, turn label).
	_overlay = preload("res://scenes/minigames/nonstop_debate_overlay.tscn").instantiate()
	add_child(_overlay)
	_panels_container = _overlay.get_node("%PanelsContainer")
	_break_label = _overlay.get_node("%BreakLabel")
	_wrong_label = _overlay.get_node("%WrongLabel")
	_turn_label = _overlay.get_node("%TurnLabel")

func _setup_ui_systems():
	_influence_gauge_ui = preload("res://scenes/ui/influence_gauge.tscn").instantiate()
	add_child(_influence_gauge_ui)
	_influence_gauge_ui.show_gauge()

	_concentrate_gauge_ui = preload("res://scenes/ui/concentrate_gauge.tscn").instantiate()
	add_child(_concentrate_gauge_ui)
	_concentrate_gauge_ui.show_gauge()

	_truth_bullet_selector = preload("res://scenes/ui/truth_bullet_selector.tscn").instantiate()
	add_child(_truth_bullet_selector)
	_truth_bullet_selector.show_selector()

	_crosshair = preload("res://scenes/ui/crosshair.tscn").instantiate()
	add_child(_crosshair)
	_crosshair.show_crosshair()

	_timer_display = preload("res://scenes/ui/timer_display.tscn").instantiate()
	add_child(_timer_display)
	_timer_display.time_expired.connect(_on_time_expired)

	# _turn_label is part of the overlay scene (built in _build_overlay)

func _show_bullet_preview() -> void:
	var bullets = TruthBulletManager.active_bullets
	if bullets.is_empty():
		return

	var preview_canvas = CanvasLayer.new()
	preview_canvas.layer = 25
	add_child(preview_canvas)

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

	var tween = create_tween()
	tween.tween_property(root, "modulate:a", 1.0, 0.2)
	tween.tween_interval(1.0)
	tween.tween_property(root, "modulate:a", 0.0, 0.3)
	await tween.finished
	preview_canvas.queue_free()

func _process(delta):
	if not is_active or _solved:
		return

	var want_slow = Input.is_action_pressed("debate_slow_time")
	if want_slow and not _is_slow_time:
		_activate_slow_time()
	elif not want_slow and _is_slow_time:
		_deactivate_slow_time()

	if _is_slow_time:
		if not ConcentrateGauge.drain(delta):
			_deactivate_slow_time()
	else:
		ConcentrateGauge.refill(delta)

	_main_spawn_timer += delta
	if _main_spawn_timer >= _main_spawn_interval and _current_main_panel == null:
		_main_spawn_timer = 0.0
		_spawn_main_line()

	_noise_spawn_timer += delta
	if _noise_spawn_timer >= _noise_spawn_interval and not _white_noise_lines.is_empty():
		_noise_spawn_timer = 0.0
		_spawn_noise_line()

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

func _spawn_main_line():
	if _main_lines.is_empty() or _current_main_panel != null:
		return

	var line_data = _main_lines[_main_line_index]
	_main_line_index += 1

	if _turn_label:
		_turn_label.text = "TURN %d" % _main_line_index

	var panel = DebateTextPanel.new()
	var speed_mult = get_difficulty_multiplier()
	panel.setup(line_data, speed_mult)

	var viewport_height = get_viewport().get_visible_rect().size.y
	var safe_top = 100
	var safe_bottom = 180
	var usable_height = viewport_height - safe_top - safe_bottom
	var num_rows = 5
	var row_height = usable_height / num_rows
	var y_position = safe_top + (_main_line_index % num_rows) * row_height
	panel.position.y = clamp(y_position, safe_top, viewport_height - safe_bottom)

	panel.panel_exited_screen.connect(_on_panel_exited)
	_panels_container.add_child(panel)
	_panels_on_screen.append(panel)
	_current_main_panel = panel

	if panel.has_spotlight:
		_trigger_spotlight(panel.character_id)

	var voice_file = line_data.get("voiceLineFile", "")
	if voice_file is String and not voice_file.is_empty():
		AudioManager.play_voice_line(voice_file)

func _spawn_noise_line():
	if _white_noise_lines.is_empty():
		return

	var idx = randi() % _white_noise_lines.size()
	var line_data = _white_noise_lines[idx]

	var panel = DebateTextPanel.new()
	var speed_mult = get_difficulty_multiplier()
	panel.setup(line_data, speed_mult)

	var viewport_height = get_viewport().get_visible_rect().size.y
	var safe_top = 100
	var safe_bottom = 180
	var usable_height = viewport_height - safe_top - safe_bottom
	var num_rows = 5
	var row_height = usable_height / num_rows
	var y_position = safe_top + (randi() % num_rows) * row_height
	panel.position.y = clamp(y_position, safe_top, viewport_height - safe_bottom)

	panel.panel_exited_screen.connect(_on_panel_exited)
	_panels_container.add_child(panel)
	_panels_on_screen.append(panel)

func _on_shoot(click_pos: Vector2):
	if not is_active or _solved:
		return

	var hit_panel: DebateTextPanel = null
	var hit_zone: String = ""
	for panel in _panels_on_screen:
		if is_instance_valid(panel):
			var z = panel.get_hit_zone(click_pos)
			if z != "":
				hit_panel = panel
				hit_zone = z
				break

	if hit_panel == null:
		return

	match hit_zone:
		"white_noise":
			_on_white_noise_hit(hit_panel, click_pos)
		"prefix", "suffix":
			_on_prefix_suffix_hit(click_pos)
		"weakpoint":
			if hit_panel.is_shootable:
				_fire_bullet_at_panel(hit_panel, click_pos)

func _on_white_noise_hit(panel: DebateTextPanel, pos: Vector2):
	_timer_display.add_time(10.0)
	_spawn_damage_popup(pos, "+10", Color(0.2, 1.0, 0.4))
	panel.destroy_with_effect()
	_panels_on_screen.erase(panel)

func _on_prefix_suffix_hit(pos: Vector2):
	_timer_display.add_time(-10.0)
	_spawn_damage_popup(pos, "-10", Color(1.0, 0.2, 0.2))
	AudioManager.play_sfx("wrong_buzzer")

func _spawn_damage_popup(pos: Vector2, text: String, color: Color):
	var label = Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", 28)
	label.add_theme_color_override("font_color", color)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.position = pos
	label.modulate.a = 1.0
	_overlay.add_child(label)

	var tween = create_tween()
	tween.set_parallel(true)
	tween.tween_property(label, "position:y", pos.y - 60, 0.8)
	tween.tween_property(label, "modulate:a", 0.0, 0.8)
	tween.finished.connect(func(): label.queue_free())

func _fire_bullet_at_panel(panel: DebateTextPanel, click_pos: Vector2):
	var projectile = BulletProjectile.new()
	_overlay.add_child(projectile)

	var target_center = panel.global_position + panel.size / 2
	var crosshair_pos = _crosshair.get_aim_position() if _crosshair else click_pos
	projectile.fire(crosshair_pos, target_center)

	var is_correct = TruthBulletManager.check_bullet_match(
		panel.answer_bullet_id,
		panel.use_negative_bullet
	)

	if is_correct:
		projectile.hit_target.connect(func():
			_on_correct_hit(panel)
		)
	else:
		projectile.hit_target.connect(func():
			_on_wrong_hit(panel)
		)

func _on_correct_hit(panel: DebateTextPanel):
	_solved = true

	AudioManager.stop_voice()

	for p in _panels_on_screen:
		if is_instance_valid(p) and p != panel:
			p.set_panel_active(false)
	if _timer_display:
		_timer_display.stop_timer()

	if _is_slow_time:
		_deactivate_slow_time()

	var panel_center = panel.global_position + panel.size / 2
	var panel_bullet_id = panel.answer_bullet_id

	ScreenEffects.impact_frame(0.05)
	await get_tree().create_timer(0.05).timeout

	AudioManager.play_sfx("break_shatter")
	ScreenEffects.white_flash(0.25)
	_shatter_panel(panel)

	_spawn_shatter_particles(panel_center)
	await get_tree().create_timer(0.1).timeout

	_show_wrong_label()
	await get_tree().create_timer(0.6).timeout

	_screen_shatter_effect()
	await get_tree().create_timer(0.7).timeout

	_break_label.visible = true
	_break_label.modulate.a = 1.0
	_break_label.scale = Vector2(0.3, 0.3)
	var break_tween = create_tween()
	break_tween.tween_property(_break_label, "scale", Vector2(1.2, 1.2), 0.3).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	break_tween.tween_property(_break_label, "scale", Vector2(1.0, 1.0), 0.08).set_ease(Tween.EASE_IN)
	await break_tween.finished

	var flash_tween = create_tween()
	flash_tween.set_loops(2)
	flash_tween.tween_property(_break_label, "modulate:a", 0.5, 0.1)
	flash_tween.tween_property(_break_label, "modulate:a", 1.0, 0.1)
	await flash_tween.finished

	await get_tree().create_timer(0.25).timeout

	var evidence_card = _show_evidence_card(panel_bullet_id)
	await get_tree().create_timer(1.2).timeout

	var fade_tween = create_tween()
	fade_tween.set_parallel(true)
	fade_tween.tween_property(_break_label, "modulate:a", 0.0, 0.4)
	if evidence_card and is_instance_valid(evidence_card):
		fade_tween.tween_property(evidence_card, "modulate:a", 0.0, 0.4)
	await fade_tween.finished

	_on_correct_answer({"loops": _main_line_index})

func _shatter_panel(panel: DebateTextPanel):
	var rect = Rect2(panel.global_position, panel.size)
	var cols = 6
	var rows = 3
	var sw = rect.size.x / cols
	var sh = rect.size.y / rows
	var center = rect.get_center()

	for r in range(rows):
		for c in range(cols):
			var shard = ColorRect.new()
			shard.size = Vector2(sw, sh) + Vector2(randf_range(-2, 2), randf_range(-2, 2))
			shard.color = Color(0.9, 0.9, 1.0, 0.85)
			shard.position = rect.position + Vector2(c * sw, r * sh)
			_overlay.add_child(shard)

			var dir = (shard.position + shard.size / 2 - center).normalized()
			var speed = randf_range(150.0, 400.0)
			var rot_speed = randf_range(-4.0, 4.0)
			var dur = randf_range(0.3, 0.6)

			var tween = create_tween().set_parallel(true)
			tween.tween_property(shard, "position", shard.position + dir * speed * dur, dur).set_ease(Tween.EASE_OUT)
			tween.tween_property(shard, "rotation", rot_speed * dur, dur)
			tween.tween_property(shard, "modulate:a", 0.0, dur).set_ease(Tween.EASE_IN)
			tween.finished.connect(func(): shard.queue_free())

	panel.queue_free()

func _spawn_shatter_particles(center: Vector2):
	for i in range(10):
		var shard = ColorRect.new()
		shard.size = Vector2(6, 6)
		shard.color = Color(1.0, 0.855, 0.039)
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

func _show_wrong_label():
	_wrong_label.visible = true
	_wrong_label.scale = Vector2(0.05, 0.05)
	_wrong_label.modulate.a = 1.0
	var tween = create_tween()
	tween.tween_property(_wrong_label, "scale", Vector2(1.05, 1.05), 0.15).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	tween.tween_property(_wrong_label, "scale", Vector2(1.0, 1.0), 0.1).set_ease(Tween.EASE_IN)
	await tween.finished

	var flash_tween = create_tween()
	flash_tween.set_loops(3)
	flash_tween.tween_property(_wrong_label, "modulate:a", 0.3, 0.08)
	flash_tween.tween_property(_wrong_label, "modulate:a", 1.0, 0.08)

func _screen_shatter_effect():
	var vp_rect = get_viewport().get_visible_rect()
	var grid_cols = 8
	var grid_rows = 5
	var cell_w = vp_rect.size.x / grid_cols
	var cell_h = vp_rect.size.y / grid_rows
	var center = vp_rect.get_center()

	var shatter_layer = CanvasLayer.new()
	shatter_layer.layer = 60
	add_child(shatter_layer)

	var bg = ColorRect.new()
	bg.color = Color.BLACK
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	shatter_layer.add_child(bg)

	for r in range(grid_rows):
		for c in range(grid_cols):
			var shard = ColorRect.new()
			shard.color = Color(0.7, 0.7, 0.8, 0.7)
			var pos = Vector2(c * cell_w, r * cell_h)
			shard.position = pos
			shard.size = Vector2(cell_w + 2, cell_h + 2)
			shard.z_index = 1
			shatter_layer.add_child(shard)

			var dir = (pos + shard.size / 2 - center).normalized()
			var speed = randf_range(200.0, 600.0)
			var rot_speed = randf_range(-6.0, 6.0)
			var dur = randf_range(0.4, 0.8)

			var tween = create_tween().set_parallel(true)
			tween.tween_property(shard, "position", shard.position + dir * speed * dur, dur).set_ease(Tween.EASE_OUT)
			tween.tween_property(shard, "rotation", rot_speed * dur, dur)
			tween.tween_property(shard, "modulate:a", 0.0, dur).set_ease(Tween.EASE_IN)
			tween.finished.connect(func(): shard.queue_free())

	_wrong_label.visible = false

func _show_evidence_card(bullet_id: String) -> Control:
	var bullet_name = TruthBulletManager.get_bullet_name(bullet_id)

	var card = PanelContainer.new()
	var card_style = StyleBoxFlat.new()
	card_style.bg_color = Color(0.039, 0.039, 0.078, 0.95)
	card_style.border_color = Color(1.0, 0.855, 0.039)
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
	header.add_theme_color_override("font_color", Color(0.91, 0.239, 0.502))
	header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(header)

	var name_label = Label.new()
	name_label.text = bullet_name
	name_label.add_theme_font_size_override("font_size", 22)
	name_label.add_theme_color_override("font_color", Color.WHITE)
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(name_label)

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

	_reset_turn()

func _reset_turn():
	_main_line_index = 0
	_current_main_panel = null
	_main_spawn_timer = 0.0
	for p in _panels_on_screen:
		if is_instance_valid(p):
			p.queue_free()
	_panels_on_screen.clear()

func _on_panel_exited(panel: DebateTextPanel):
	_panels_on_screen.erase(panel)
	if panel == _current_main_panel:
		_current_main_panel = null
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

	if _is_slow_time:
		_deactivate_slow_time()

	if _crosshair:
		_crosshair.hide_crosshair()
	if _influence_gauge_ui:
		_influence_gauge_ui.hide_gauge()
	if _concentrate_gauge_ui:
		_concentrate_gauge_ui.hide_gauge()
	if _truth_bullet_selector:
		_truth_bullet_selector.hide_selector()
	if _timer_display:
		_timer_display.hide_timer()

	if InputManager.shoot_pressed.is_connected(_on_shoot):
		InputManager.shoot_pressed.disconnect(_on_shoot)
	if InfluenceGauge.influence_depleted.is_connected(_on_influence_depleted):
		InfluenceGauge.influence_depleted.disconnect(_on_influence_depleted)

	ConcentrateGauge.reset()

	for panel in _panels_on_screen:
		if is_instance_valid(panel):
			panel.queue_free()
	_panels_on_screen.clear()

	if _overlay:
		_overlay.queue_free()
