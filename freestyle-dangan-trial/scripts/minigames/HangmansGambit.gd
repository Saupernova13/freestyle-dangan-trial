extends MinigameBase

var answer_key: String = ""
var _revealed_letters: Array = []
var _floating_letters: Array = []

var _overlay: CanvasLayer
var _letters_container: Control
var _answer_display: HBoxContainer
var _answer_labels: Array = []
var _spawn_timer: float = 0.0
var _spawn_interval: float = 1.5

var _influence_gauge_ui: Node
var _timer_display: Node

func initialize(data: Dictionary):
	super.initialize(data)
	var type_specific = data.get("typeSpecific", {})
	answer_key = type_specific.get("answerKey", "").to_upper()
	_revealed_letters.resize(answer_key.length())
	_revealed_letters.fill(false)

	match difficulty:
		"easy":
			_spawn_interval = 2.0
		"hard":
			_spawn_interval = 1.0
		_:
			_spawn_interval = 1.5

func start():
	super.start()
	_build_overlay()
	_setup_ui()
	InfluenceGauge.reset()
	InfluenceGauge.influence_depleted.connect(_on_influence_depleted)
	print("HangmansGambit: Answer is '", answer_key, "' (", answer_key.length(), " letters)")

func _build_overlay():
	_overlay = CanvasLayer.new()
	_overlay.layer = 5
	add_child(_overlay)

	var bg = ColorRect.new()
	bg.color = Color(0.02, 0.0, 0.08, 0.7)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_overlay.add_child(bg)

	var title = Label.new()
	title.text = "HANGMAN'S GAMBIT"
	title.add_theme_font_size_override("font_size", 28)
	title.add_theme_color_override("font_color", Color(0.8, 0.3, 1.0))
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.set_anchors_preset(Control.PRESET_CENTER_TOP)
	title.position.y = 20
	title.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_overlay.add_child(title)

	_letters_container = Control.new()
	_letters_container.set_anchors_preset(Control.PRESET_FULL_RECT)
	_letters_container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_overlay.add_child(_letters_container)

	_answer_display = HBoxContainer.new()
	_answer_display.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_answer_display.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_answer_display.position.y = -100
	_answer_display.add_theme_constant_override("separation", 8)
	_answer_display.alignment = BoxContainer.ALIGNMENT_CENTER
	_overlay.add_child(_answer_display)

	for i in range(answer_key.length()):
		var slot = PanelContainer.new()
		var style = StyleBoxFlat.new()
		style.bg_color = Color(0.15, 0.1, 0.25, 0.9)
		style.border_width_bottom = 2
		style.border_color = Color(0.6, 0.3, 0.8)
		style.content_margin_left = 8
		style.content_margin_right = 8
		style.content_margin_top = 4
		style.content_margin_bottom = 4
		slot.add_theme_stylebox_override("panel", style)

		var lbl = Label.new()
		lbl.text = "_"
		lbl.add_theme_font_size_override("font_size", 32)
		lbl.add_theme_color_override("font_color", Color(0.8, 0.8, 0.9))
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lbl.custom_minimum_size.x = 36
		slot.add_child(lbl)

		_answer_display.add_child(slot)
		_answer_labels.append(lbl)

func _setup_ui():
	_influence_gauge_ui = preload("res://scripts/ui/InfluenceGaugeUI.gd").new()
	add_child(_influence_gauge_ui)
	_influence_gauge_ui.show_gauge()

	_timer_display = preload("res://scripts/ui/TimerDisplay.gd").new()
	add_child(_timer_display)
	_timer_display.time_expired.connect(_on_time_expired)
	if time_limit > 0:
		_timer_display.start_timer(time_limit)

func _process(delta):
	if not is_active:
		return

	_spawn_timer += delta
	if _spawn_timer >= _spawn_interval:
		_spawn_timer = 0.0
		_spawn_letter()

	_check_letter_collisions()

func _spawn_letter():
	var viewport_size = get_viewport().get_visible_rect().size

	var letter: String
	var is_correct: bool
	if randf() < 0.4:
		var unrevealed = []
		for i in range(answer_key.length()):
			if not _revealed_letters[i]:
				unrevealed.append(answer_key[i])
		if unrevealed.is_empty():
			return
		letter = unrevealed[randi() % unrevealed.size()]
		is_correct = true
	else:
		var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
		letter = alphabet[randi() % alphabet.length()]
		is_correct = letter in answer_key and not _all_instances_revealed(letter)

	var floating = FloatingLetter.new()
	floating.letter = letter
	floating.is_answer_letter = is_correct
	floating.position = Vector2(
		randf_range(-50, -30) if randf() < 0.5 else randf_range(viewport_size.x + 30, viewport_size.x + 50),
		randf_range(120, viewport_size.y - 200)
	)
	floating.velocity = Vector2(
		randf_range(60, 120) * (1 if floating.position.x < 0 else -1),
		randf_range(-20, 20)
	)
	floating.clicked.connect(_on_letter_clicked)
	_letters_container.add_child(floating)
	_floating_letters.append(floating)

func _all_instances_revealed(letter: String) -> bool:
	for i in range(answer_key.length()):
		if answer_key[i] == letter and not _revealed_letters[i]:
			return false
	return true

func _on_letter_clicked(floating: FloatingLetter):
	var letter = floating.letter
	var found = false
	for i in range(answer_key.length()):
		if answer_key[i] == letter and not _revealed_letters[i]:
			_revealed_letters[i] = true
			_answer_labels[i].text = letter
			_answer_labels[i].add_theme_color_override("font_color", Color(0.3, 1.0, 0.5))
			found = true
			break

	if found:
		AudioManager.play_sfx("correct_chime")
		floating.destroy_correct()
		if _check_complete():
			_on_correct_answer({"answer": answer_key})
	else:
		AudioManager.play_sfx("wrong_buzzer")
		InfluenceGauge.take_damage(difficulty)
		floating.destroy_wrong()

	_floating_letters.erase(floating)

func _check_complete() -> bool:
	for revealed in _revealed_letters:
		if not revealed:
			return false
	return true

func _check_letter_collisions():
	for i in range(_floating_letters.size()):
		for j in range(i + 1, _floating_letters.size()):
			var a = _floating_letters[i]
			var b = _floating_letters[j]
			if not is_instance_valid(a) or not is_instance_valid(b):
				continue
			if a.global_position.distance_to(b.global_position) < 40:
				InfluenceGauge.take_damage_raw(5.0)
				a.destroy_collision()
				b.destroy_collision()
				_floating_letters.erase(a)
				_floating_letters.erase(b)
				return

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


class FloatingLetter extends Control:
	signal clicked(letter_node: FloatingLetter)

	var letter: String = ""
	var is_answer_letter: bool = false
	var velocity: Vector2 = Vector2.ZERO
	var _active: bool = true

	func _ready():
		custom_minimum_size = Vector2(40, 40)
		size = Vector2(40, 40)
		mouse_filter = Control.MOUSE_FILTER_STOP

	func _draw():
		if not _active:
			return
		var bg_color = Color(0.3, 0.15, 0.5, 0.8) if is_answer_letter else Color(0.4, 0.2, 0.2, 0.7)
		draw_circle(size / 2, 18, bg_color)
		draw_arc(size / 2, 18, 0, TAU, 24, Color(0.7, 0.5, 0.9, 0.6), 1.5)

		var font = ThemeDB.fallback_font
		var font_size = 20
		var text_size = font.get_string_size(letter, HORIZONTAL_ALIGNMENT_CENTER, -1, font_size)
		var text_pos = (size - text_size) / 2 + Vector2(0, text_size.y * 0.75)
		draw_string(font, text_pos, letter, HORIZONTAL_ALIGNMENT_CENTER, -1, font_size, Color.WHITE)

	func _process(delta):
		if not _active:
			return
		position += velocity * delta
		var vp = get_viewport_rect().size
		if position.x < -80 or position.x > vp.x + 80 or position.y < -80 or position.y > vp.y + 80:
			queue_free()

	func _gui_input(event):
		if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
			clicked.emit(self)
		elif event is InputEventScreenTouch and event.pressed:
			clicked.emit(self)

	func destroy_correct():
		_active = false
		var tween = create_tween()
		tween.tween_property(self, "modulate:a", 0.0, 0.2)
		tween.tween_property(self, "scale", Vector2(1.5, 1.5), 0.2)
		tween.finished.connect(func(): queue_free())

	func destroy_wrong():
		_active = false
		modulate = Color(1, 0.3, 0.3)
		var tween = create_tween()
		tween.tween_property(self, "modulate:a", 0.0, 0.3)
		tween.finished.connect(func(): queue_free())

	func destroy_collision():
		_active = false
		var tween = create_tween()
		tween.tween_property(self, "modulate", Color(1, 0.5, 0, 0), 0.2)
		tween.finished.connect(func(): queue_free())
