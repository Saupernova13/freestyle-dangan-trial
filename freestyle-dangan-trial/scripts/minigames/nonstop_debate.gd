extends MinigameBase

## This node is freed with the minigame while the slow-time key may still
## be held, so cleanup() releases it by name rather than by state.
const SLOW_TIME_KEY := &"nonstop_debate_slow_time"

var dialogue_lines: Array[Dictionary] = []
var selected_bullets: Array[String] = []

var _main_lines: Array[Dictionary] = []
var _white_noise_lines: Array[Dictionary] = []
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
var _wrong_label: Label
var _turn_label: Label
var _overlay_anim: AnimationPlayer

var _is_slow_time: bool = false
var _slow_vignette: CanvasLayer = null
var _ambience: CanvasLayer = null

func initialize(data: MinigameData):
	super.initialize(data)
	dialogue_lines = data.ts_dicts("dialogueLines")
	selected_bullets = data.ts_strings("selectedBullets")

	_main_spawn_interval = MinigameConfig.get_spawn_interval("nonstop_debate", difficulty)
	_split_dialogue_lines()

func validate_data() -> Array[String]:
	var errors: Array[String] = []
	# _spawn_main_line() returns on every tick with no lines, so no panel ever
	# appears and _on_shoot can never register a hit.
	if _main_lines.is_empty():
		errors.append("dialogueLines is empty")
	# An empty selection means "all bullets" and is fine. A non-empty one where
	# nothing resolves is not: every shot misses, so the attempt ends on the
	# player's first correct-looking one and replays to the cap.
	if (
		not selected_bullets.is_empty()
		and TruthBulletManager.resolve_ids(selected_bullets).is_empty()
	):
		errors.append("no selectedBullets id resolves to a truth bullet")
	return errors

func wants_mobile_slow_time() -> bool:
	return true

func _split_dialogue_lines():
	_main_lines.clear()
	_white_noise_lines.clear()
	# White noise is disabled pending a positioning rework: isWhiteNoise is
	# ignored and every line spawns as a main line.
	for line in dialogue_lines:
		_main_lines.append(line)

func start():
	super.start()
	_solved = false
	_main_line_index = 0
	_current_main_panel = null

	_build_overlay()
	_show_ambience()
	setup_standard_ui([
		HudComponent.INFLUENCE_GAUGE,
		HudComponent.CONCENTRATE_GAUGE,
		HudComponent.TRUTH_BULLET_SELECTOR,
		HudComponent.CROSSHAIR,
		HudComponent.TIMER_DISPLAY,
	])

	connect_managed(InfluenceGauge.influence_depleted, _on_influence_depleted)
	ConcentrateGauge.reset()

	TruthBulletManager.load_bullets()
	if not selected_bullets.is_empty():
		TruthBulletManager.set_active_bullets(selected_bullets)

	connect_managed(InputManager.shoot_pressed, _on_shoot)

	await _show_bullet_preview()

	Log.info(
		"NonstopDebate",
		(
			"Started with %d main lines, %d white noise lines, %ss limit"
			% [_main_lines.size(), _white_noise_lines.size(), time_limit]
		)
	)

func _build_overlay():
	# Layout is scene-owned; see scenes/minigames/nonstop_debate_overlay.tscn.
	_overlay = ResourceRegistry.instantiate("nonstop_debate_overlay")
	add_child(_overlay)
	_panels_container = _overlay.get_node("%PanelsContainer")
	_wrong_label = _overlay.get_node("%WrongLabel")
	_turn_label = _overlay.get_node("%TurnLabel")
	_overlay_anim = _overlay.get_node("%AnimationPlayer")

## MinigameRunner frees the minigame the moment it completes, so the filter is
## parented to the trial room instead and dismisses itself.
func _show_ambience():
	_ambience = ResourceRegistry.instantiate("debate_ambience")
	var room = get_tree().get_first_node_in_group("trial_room")
	if room:
		room.add_child(_ambience)
	else:
		add_child(_ambience)
	_ambience.show_ambience()

func _dismiss_ambience():
	if _ambience and is_instance_valid(_ambience):
		_ambience.dismiss()
	_ambience = null

func _show_bullet_preview() -> void:
	var bullets = TruthBulletManager.active_bullets
	if bullets.is_empty():
		return
	var preview: BulletPreview = ResourceRegistry.instantiate("bullet_preview")
	add_child(preview)
	await preview.show_bullets(bullets)

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
	TimeScale.request(SLOW_TIME_KEY, MinigameConfig.SLOW_TIME_SCALE)
	AudioManager.set_voice_pitch(MinigameConfig.SLOW_TIME_SCALE)

	if not _slow_vignette:
		_slow_vignette = ResourceRegistry.instantiate("slow_time_vignette")
		add_child(_slow_vignette)
	_slow_vignette.show_vignette()

func _deactivate_slow_time():
	_is_slow_time = false
	TimeScale.release(SLOW_TIME_KEY)
	AudioManager.set_voice_pitch(1.0)

	if _slow_vignette:
		_slow_vignette.hide_vignette()

## Shared by main and noise lines, so the safe area is tuned in one place.
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

	# Statements loop until the player shoots the right one.
	if _main_line_index >= _main_lines.size():
		_main_line_index = 0

	var line_data := _main_lines[_main_line_index]
	_main_line_index += 1

	if _turn_label:
		_turn_label.text = "TURN %d" % _main_line_index

	var voice_file := JsonRead.str_of(line_data.get("voiceLineFile"))
	var audio_duration := -1.0
	if not voice_file.is_empty():
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

	# The camera always follows the speaker. `characterSpotlight` is reserved
	# for the unimplemented spotlight effect and must never gate this.
	if not panel.character_id.is_empty():
		focus_camera_on_character(panel.character_id)

	if not voice_file.is_empty():
		AudioManager.play_voice_line(voice_file)

func _spawn_noise_line():
	if _white_noise_lines.is_empty():
		return

	var idx = randi() % _white_noise_lines.size()
	var line_data := _white_noise_lines[idx]

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
		"prefix", "suffix", "inert":
			_on_prefix_suffix_hit(click_pos)
		"weakpoint":
			_fire_bullet_at_panel(hit_panel, click_pos)

func _on_white_noise_hit(panel: DebateTextPanel, pos: Vector2):
	var timer = get_hud(HudComponent.TIMER_DISPLAY)
	if timer:
		timer.add_time(10.0)
	_spawn_drift_popup(pos, "+10", UITheme.COLOR_CORRECT_BRIGHT)
	panel.destroy_with_effect()
	_panels_on_screen.erase(panel)

func _on_prefix_suffix_hit(pos: Vector2):
	var timer = get_hud(HudComponent.TIMER_DISPLAY)
	if timer:
		timer.add_time(-10.0)
	_spawn_drift_popup(pos, "-10", UITheme.COLOR_WRONG_BRIGHT)

func _spawn_drift_popup(pos: Vector2, text: String, color: Color):
	var popup = ResourceRegistry.instantiate("drift_popup")
	popup.position = pos
	_overlay.add_child(popup)
	popup.setup(text, color)

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

	# A WeakRef, because cleanup() can free the panel before the shot lands.
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

	var burst = ResourceRegistry.instantiate("shard_burst")
	burst.position = panel_center
	_overlay.add_child(burst)
	burst.setup(UITheme.COLOR_ACCENT_GOLD)
	await get_tree().create_timer(MinigameConfig.TIMING["shatter_to_wrong"]).timeout

	_show_wrong_label()
	await get_tree().create_timer(MinigameConfig.TIMING["wrong_to_screen_shatter"]).timeout

	# play_break screenshots the viewport, so the WRONG label has to be stopped
	# and hidden first or it freezes mid-animation into the shattering frame.
	# The sequence itself is the break_sequence animation in break_shatter.tscn.
	_overlay_anim.stop()
	_wrong_label.visible = false
	var impact_uv = panel_center / get_viewport().get_visible_rect().size
	var breaker = ResourceRegistry.instantiate("break_shatter")
	add_child(breaker)
	await breaker.play_break(impact_uv)
	_dismiss_ambience()

	await get_tree().create_timer(MinigameConfig.TIMING["break_to_evidence"]).timeout

	var evidence_card = _show_evidence_card(panel_bullet_id)
	await get_tree().create_timer(MinigameConfig.TIMING["evidence_hold"]).timeout

	if evidence_card and is_instance_valid(evidence_card):
		await evidence_card.dismiss()

	_on_correct_answer({"loops": _main_line_index})

func _shatter_panel(panel: DebateTextPanel):
	var rect = Rect2(panel.global_position, panel.size)
	var shatter = ResourceRegistry.instantiate("panel_shatter")
	_overlay.add_child(shatter)
	shatter.setup(rect, UITheme.COLOR_SHATTER_SHARD)
	panel.queue_free()

func _show_wrong_label():
	_overlay_anim.play("wrong_pop")

func _show_evidence_card(bullet_id: String) -> Control:
	var card: EvidenceCard = ResourceRegistry.instantiate("evidence_card")
	_overlay.add_child(card)
	card.show_evidence(TruthBulletManager.get_bullet_name(bullet_id))
	return card

func _on_wrong_hit(panel: DebateTextPanel):
	if _solved or _has_finished:
		return
	Log.debug("NonstopDebate", "Wrong bullet!")
	AudioManager.stop_voice()
	InfluenceGauge.take_damage(difficulty)

	# TrialRoomManager shows the wrong-answer dialog and replays the minigame.
	_finish(false, {
		"reason": "wrong_answer",
		"failComment": JsonRead.str_of(panel.line_data.get("userWrongAnswerComment")),
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
			fail_comment = JsonRead.str_of(panel.line_data.get("userFailedComment"))
			break
	_finish(false, {"reason": "time_expired", "failComment": fail_comment})

func cleanup():
	if _is_slow_time:
		_deactivate_slow_time()
	TimeScale.release(SLOW_TIME_KEY)
	ConcentrateGauge.reset()
	_dismiss_ambience()

	for panel in _panels_on_screen:
		if is_instance_valid(panel):
			panel.queue_free()
	_panels_on_screen.clear()

	if _overlay:
		_overlay.queue_free()

	super.cleanup()
