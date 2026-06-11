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
var _main_spawn_interval: float = 2.0
var _noise_spawn_interval: float = MinigameConfig.NOISE_SPAWN_INTERVAL
var _solved: bool = false

var _overlay: CanvasLayer
var _panels_container: Control
var _break_label: Label
var _wrong_label: Label
var _turn_label: Label

var _is_slow_time: bool = false
var _slow_vignette: ColorRect = null

func initialize(data: Dictionary):
	super.initialize(data)
	var type_specific = data.get("typeSpecific", {})
	dialogue_lines = type_specific.get("dialogueLines", [])
	selected_bullets = type_specific.get("selectedBullets", [])

	_main_spawn_interval = MinigameConfig.get_spawn_interval("nonstop_debate", difficulty)
	_split_dialogue_lines()

func wants_mobile_slow_time() -> bool:
	return true

func _split_dialogue_lines():
	_main_lines.clear()
	_white_noise_lines.clear()
	# White noise is disabled: its panel positioning is flawed and slated for a
	# fundamental rework. Until then we ignore the isWhiteNoise flag entirely and
	# treat every line as a main line, so no white-noise panels ever spawn.
	for line in dialogue_lines:
		_main_lines.append(line)

func start():
	super.start()
	_solved = false
	_main_line_index = 0
	_current_main_panel = null

	_build_overlay()
	setup_standard_ui([
		HudComponent.INFLUENCE_GAUGE,
		HudComponent.CONCENTRATE_GAUGE,
		HudComponent.TRUTH_BULLET_SELECTOR,
		HudComponent.CROSSHAIR,
		HudComponent.TIMER_DISPLAY,
	])

	InfluenceGauge.reset()
	connect_managed(InfluenceGauge.influence_depleted, _on_influence_depleted)
	ConcentrateGauge.reset()

	TruthBulletManager.load_bullets()
	if not selected_bullets.is_empty():
		TruthBulletManager.set_active_bullets(selected_bullets)

	connect_managed(InputManager.shoot_pressed, _on_shoot)

	await _show_bullet_preview()

	print("NonstopDebate: Started with ", _main_lines.size(), " main lines, ", _white_noise_lines.size(), " white noise lines, ", time_limit, "s limit")

func _build_overlay():
	# Scene-driven — see scenes/minigames/nonstop_debate_overlay.tscn for the
	# static layout (panels container, break/wrong labels, turn label).
	_overlay = ResourceRegistry.instantiate("nonstop_debate_overlay")
	add_child(_overlay)
	_panels_container = _overlay.get_node("%PanelsContainer")
	_break_label = _overlay.get_node("%BreakLabel")
	_wrong_label = _overlay.get_node("%WrongLabel")
	_turn_label = _overlay.get_node("%TurnLabel")

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
	bg.color = UITheme.COLOR_OVERLAY_DIM
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(bg)

	var container = VBoxContainer.new()
	container.set_anchors_preset(Control.PRESET_CENTER)
	container.grow_horizontal = Control.GROW_DIRECTION_BOTH
	container.grow_vertical = Control.GROW_DIRECTION_BOTH
	container.add_theme_constant_override("separation", 8)
	root.add_child(container)

	container.add_child(UITheme.make_centered_label("TRUTH BULLETS", UITheme.FONT_SIZE_BODY, UITheme.COLOR_ACCENT_CYAN))

	var grid = GridContainer.new()
	grid.columns = mini(bullets.size(), 4)
	grid.add_theme_constant_override("h_separation", 16)
	grid.add_theme_constant_override("v_separation", 8)
	container.add_child(grid)

	for bullet in bullets:
		var cell = VBoxContainer.new()
		cell.add_theme_constant_override("separation", 2)

		var name_lbl = UITheme.make_centered_label(bullet.get("name", "?"), UITheme.FONT_SIZE_LABEL, Color.WHITE)
		name_lbl.custom_minimum_size.x = UITheme.PREVIEW_LABEL_MIN_WIDTH
		name_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD
		cell.add_child(name_lbl)

		# Surface the editor-authored evidence description under the name.
		var desc = bullet.get("description", "")
		if desc is String and not desc.is_empty():
			var desc_lbl = UITheme.make_centered_label(desc, UITheme.FONT_SIZE_TINY, Color(0.75, 0.75, 0.8))
			desc_lbl.custom_minimum_size.x = UITheme.PREVIEW_LABEL_MIN_WIDTH
			desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD
			cell.add_child(desc_lbl)

		grid.add_child(cell)

	var tween = EffectBuilders.fade_in_hold_out(root, 0.2, 1.0, 0.3)
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
	Engine.time_scale = MinigameConfig.SLOW_TIME_SCALE
	AudioManager.set_voice_pitch(MinigameConfig.SLOW_TIME_SCALE)

	if not _slow_vignette:
		var vig_canvas = CanvasLayer.new()
		vig_canvas.layer = 18
		add_child(vig_canvas)
		_slow_vignette = ColorRect.new()
		_slow_vignette.color = UITheme.COLOR_SLOW_VIGNETTE
		_slow_vignette.set_anchors_preset(Control.PRESET_FULL_RECT)
		_slow_vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
		vig_canvas.add_child(_slow_vignette)

	var tween = create_tween()
	tween.tween_property(_slow_vignette, "color:a", MinigameConfig.SLOW_VIGNETTE_ALPHA, MinigameConfig.SLOW_VIGNETTE_FADE_IN)

func _deactivate_slow_time():
	_is_slow_time = false
	Engine.time_scale = 1.0
	AudioManager.set_voice_pitch(1.0)

	if _slow_vignette:
		var tween = create_tween()
		tween.tween_property(_slow_vignette, "color:a", 0.0, MinigameConfig.SLOW_VIGNETTE_FADE_OUT)

## Compute the vertical position for a panel given its row index. Same layout
## logic for main and noise lines — keep them in one place so the safe area
## only needs tweaking once.
func _row_y_for(index: int) -> float:
	var viewport_height = get_viewport().get_visible_rect().size.y
	var safe_top = MinigameConfig.SCREEN_LAYOUT["debate_safe_top"]
	var safe_bottom = MinigameConfig.SCREEN_LAYOUT["debate_safe_bottom"]
	var num_rows = MinigameConfig.SCREEN_LAYOUT["debate_rows"]
	var usable_height = viewport_height - safe_top - safe_bottom
	var row_height = usable_height / num_rows
	var y_position = safe_top + (index % num_rows) * row_height
	return clamp(y_position, safe_top, viewport_height - safe_bottom)

func _spawn_main_line():
	if _main_lines.is_empty() or _current_main_panel != null:
		return

	# Nonstop debate loops its statements until the player shoots the right one.
	if _main_line_index >= _main_lines.size():
		_main_line_index = 0

	var line_data = _main_lines[_main_line_index]
	_main_line_index += 1

	if _turn_label:
		_turn_label.text = "TURN %d" % _main_line_index

	var voice_file = line_data.get("voiceLineFile", "")
	var audio_duration := -1.0
	if voice_file is String and not voice_file.is_empty():
		audio_duration = AudioManager.get_voice_line_duration(voice_file)
	if audio_duration < 0.0:
		audio_duration = randf_range(4.0, 6.0)

	var panel: DebateTextPanel = ResourceRegistry.instantiate("debate_text_panel")
	panel.setup(line_data, get_difficulty_multiplier(), audio_duration)
	panel.position.y = _row_y_for(_main_line_index)
	panel.panel_exited_screen.connect(_on_panel_exited)
	_panels_container.add_child(panel)
	_panels_on_screen.append(panel)
	_current_main_panel = panel

	# Spotlight follows the currently-speaking character. This ensures the visual
	# focus stays synced with the audio regardless of editor spotlight settings,
	# preventing mismatches where the wrong character appears focused while
	# dialogue from another character plays.
	if not panel.character_id.is_empty():
		trigger_spotlight(panel.character_id)

	if voice_file is String and not voice_file.is_empty():
		AudioManager.play_voice_line(voice_file)

func _spawn_noise_line():
	if _white_noise_lines.is_empty():
		return

	var idx = randi() % _white_noise_lines.size()
	var line_data = _white_noise_lines[idx]

	var panel: DebateTextPanel = ResourceRegistry.instantiate("debate_text_panel")
	panel.setup(line_data, get_difficulty_multiplier())
	panel.position.y = _row_y_for(randi())
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
			_fire_bullet_at_panel(hit_panel, click_pos)

func _on_white_noise_hit(panel: DebateTextPanel, pos: Vector2):
	var timer = get_hud(HudComponent.TIMER_DISPLAY)
	if timer:
		timer.add_time(10.0)
	EffectBuilders.spawn_drift_popup(_overlay, pos, "+10", UITheme.COLOR_CORRECT_BRIGHT, UITheme.FONT_SIZE_POPUP)
	panel.destroy_with_effect()
	_panels_on_screen.erase(panel)

func _on_prefix_suffix_hit(pos: Vector2):
	var timer = get_hud(HudComponent.TIMER_DISPLAY)
	if timer:
		timer.add_time(-10.0)
	EffectBuilders.spawn_drift_popup(_overlay, pos, "-10", UITheme.COLOR_WRONG_BRIGHT, UITheme.FONT_SIZE_POPUP)

func _fire_bullet_at_panel(panel: DebateTextPanel, click_pos: Vector2):
	var projectile: BulletProjectile = ResourceRegistry.instantiate("bullet_projectile")
	_overlay.add_child(projectile)

	var target_center = panel.global_position + panel.size / 2
	var crosshair = get_hud(HudComponent.CROSSHAIR)
	var crosshair_pos = crosshair.get_aim_position() if crosshair else click_pos
	projectile.fire(crosshair_pos, target_center)

	var is_correct = TruthBulletManager.check_bullet_match(
		panel.answer_bullet_id,
		panel.use_negative_bullet
	)

	# Capture a WeakRef so the lambda doesn't strong-hold the panel — it may be
	# queue_free()'d during cleanup() before the projectile lands.
	var panel_ref = weakref(panel)
	if is_correct:
		projectile.hit_target.connect(func():
			var p = panel_ref.get_ref()
			if p and is_instance_valid(p):
				_on_correct_hit(p)
		)
	else:
		projectile.hit_target.connect(func():
			var p = panel_ref.get_ref()
			if p and is_instance_valid(p):
				_on_wrong_hit(p)
		)

func _on_correct_hit(panel: DebateTextPanel):
	_solved = true

	AudioManager.stop_voice()

	for p in _panels_on_screen:
		if is_instance_valid(p) and p != panel:
			p.set_panel_active(false)
	var timer = get_hud(HudComponent.TIMER_DISPLAY)
	if timer:
		timer.stop_timer()

	if _is_slow_time:
		_deactivate_slow_time()

	var panel_center = panel.global_position + panel.size / 2
	var panel_bullet_id = panel.answer_bullet_id

	ScreenEffects.impact_frame(MinigameConfig.TIMING["impact_frame"])
	await get_tree().create_timer(MinigameConfig.TIMING["impact_frame"]).timeout

	ScreenEffects.white_flash(0.25)
	_shatter_panel(panel)

	EffectBuilders.spawn_burst_particles(
		_overlay, panel_center, UITheme.COLOR_ACCENT_GOLD,
		MinigameConfig.SHATTER_GRID["particle_count"]
	)
	await get_tree().create_timer(MinigameConfig.TIMING["shatter_to_wrong"]).timeout

	_show_wrong_label()
	await get_tree().create_timer(MinigameConfig.TIMING["wrong_to_screen_shatter"]).timeout

	EffectBuilders.screen_shatter(
		self, UITheme.COLOR_SCREEN_SHARD,
		MinigameConfig.SHATTER_GRID["screen_rows"],
		MinigameConfig.SHATTER_GRID["screen_cols"]
	)
	_wrong_label.visible = false
	await get_tree().create_timer(MinigameConfig.TIMING["screen_shatter_to_break"]).timeout

	await _play_break_label()

	await get_tree().create_timer(MinigameConfig.TIMING["break_to_evidence"]).timeout

	var evidence_card = _show_evidence_card(panel_bullet_id)
	await get_tree().create_timer(MinigameConfig.TIMING["evidence_hold"]).timeout

	var fade_tween = create_tween().set_parallel(true)
	fade_tween.tween_property(_break_label, "modulate:a", 0.0, MinigameConfig.TIMING["evidence_fade"])
	if evidence_card and is_instance_valid(evidence_card):
		fade_tween.tween_property(evidence_card, "modulate:a", 0.0, MinigameConfig.TIMING["evidence_fade"])
	await fade_tween.finished

	_on_correct_answer({"loops": _main_line_index})

func _play_break_label() -> void:
	_break_label.visible = true
	_break_label.modulate.a = 1.0
	var pop = EffectBuilders.scale_pop(_break_label)
	await pop.finished
	var flash = EffectBuilders.flash_alpha(_break_label, 2, 0.5, 1.0, 0.1)
	await flash.finished

func _shatter_panel(panel: DebateTextPanel):
	var rect = Rect2(panel.global_position, panel.size)
	EffectBuilders.shatter_rect(
		_overlay, rect, UITheme.COLOR_SHATTER_SHARD,
		MinigameConfig.SHATTER_GRID["panel_rows"],
		MinigameConfig.SHATTER_GRID["panel_cols"]
	)
	panel.queue_free()

func _show_wrong_label():
	_wrong_label.visible = true
	_wrong_label.modulate.a = 1.0
	EffectBuilders.scale_pop(_wrong_label, Vector2(0.05, 0.05), Vector2(1.05, 1.05), Vector2(1.0, 1.0), 0.15, 0.1)
	EffectBuilders.flash_alpha(_wrong_label, 3, 0.3, 1.0, 0.08)

func _show_evidence_card(bullet_id: String) -> Control:
	var bullet_name = TruthBulletManager.get_bullet_name(bullet_id)

	var card = PanelContainer.new()
	card.add_theme_stylebox_override("panel", UITheme.make_panel_style(
		UITheme.COLOR_BG_PANEL, UITheme.COLOR_ACCENT_GOLD, 2, 16
	))
	card.set_anchors_preset(Control.PRESET_CENTER)
	card.grow_horizontal = Control.GROW_DIRECTION_BOTH
	card.grow_vertical = Control.GROW_DIRECTION_BOTH
	card.modulate.a = 0.0
	card.scale = Vector2(0.7, 0.7)
	_overlay.add_child(card)

	var vbox = VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	card.add_child(vbox)

	vbox.add_child(UITheme.make_centered_label("TRUTH BULLET", UITheme.FONT_SIZE_TINY, UITheme.COLOR_TRUTH_BULLET))
	vbox.add_child(UITheme.make_centered_label(bullet_name, UITheme.FONT_SIZE_HEADER, Color.WHITE))

	var tween = create_tween().set_parallel(true)
	tween.tween_property(card, "modulate:a", 1.0, 0.15)
	tween.tween_property(card, "scale", Vector2(1.0, 1.0), 0.2) \
		.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)

	return card

func _on_wrong_hit(panel: DebateTextPanel):
	if _solved or _has_finished:
		return
	print("NonstopDebate: Wrong bullet!")
	AudioManager.stop_voice()
	InfluenceGauge.take_damage(difficulty)

	# End the attempt — TrialRoomManager shows this line's wrong-answer dialog
	# and replays the minigame.
	var wrong_comment = panel.line_data.get("userWrongAnswerComment", "")
	_finish(false, {
		"reason": "wrong_answer",
		"failComment": wrong_comment if wrong_comment is String else "",
	})

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
	if _solved or _has_finished:
		return
	# Surface the out-of-time dialog for the shootable line still in play.
	var fail_comment := ""
	for panel in _panels_on_screen:
		if is_instance_valid(panel) and panel.is_shootable:
			var comment = panel.line_data.get("userFailedComment", "")
			if comment is String:
				fail_comment = comment
			break
	_finish(false, {"reason": "time_expired", "failComment": fail_comment})

func cleanup():
	if _is_slow_time:
		_deactivate_slow_time()
	ConcentrateGauge.reset()

	for panel in _panels_on_screen:
		if is_instance_valid(panel):
			panel.queue_free()
	_panels_on_screen.clear()

	if _overlay:
		_overlay.queue_free()

	super.cleanup()
