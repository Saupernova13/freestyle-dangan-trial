extends MinigameBase

var answer_key: String = ""
var _revealed_letters: Array = []
var _floating_letters: Array = []

var _overlay: CanvasLayer
var _letters_container: Control
var _answer_display: HBoxContainer
var _answer_slots: Array = []
var _spawn_timer: float = 0.0
var _spawn_interval: float = 1.5

func initialize(data: MinigameData):
	super.initialize(data)
	var type_specific := data.type_specific
	answer_key = type_specific.get("answerKey", "").to_upper()
	_revealed_letters.resize(answer_key.length())
	_revealed_letters.fill(false)

	for i in range(answer_key.length()):
		if answer_key[i] == " ":
			_revealed_letters[i] = true

	_spawn_interval = MinigameConfig.get_spawn_interval("hangmans_gambit", difficulty)

func start():
	super.start()
	_build_overlay()
	setup_standard_ui([HudComponent.INFLUENCE_GAUGE, HudComponent.TIMER_DISPLAY])
	InfluenceGauge.reset()
	connect_managed(InfluenceGauge.influence_depleted, _on_influence_depleted)
	Log.debug("HangmansGambit", "Answer is '%s' (%d letters)" % [answer_key, answer_key.length()])

func _build_overlay():
	# Scene-driven — see scenes/minigames/hangmans_gambit_overlay.tscn for the
	# static layout. Answer-letter slots are spawned dynamically below.
	_overlay = ResourceRegistry.instantiate("hangmans_gambit_overlay")
	add_child(_overlay)
	_letters_container = _overlay.get_node("%LettersContainer")
	_answer_display = _overlay.get_node("%AnswerDisplay")

	for i in range(answer_key.length()):
		var slot: HangmanSlot = ResourceRegistry.instantiate("hangman_slot")
		_answer_display.add_child(slot)
		if answer_key[i] == " ":
			slot.mark_space()
		_answer_slots.append(slot)

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

	var speeds = MinigameConfig.get_floating_letter_speed(difficulty)
	var speed_base: float = speeds["base"]
	var speed_range: float = speeds["range"]

	var floating = FloatingLetter.new()
	floating.letter = letter
	floating.is_answer_letter = is_correct
	floating.position = Vector2(
		randf_range(-50, -30) if randf() < 0.5 else randf_range(viewport_size.x + 30, viewport_size.x + 50),
		randf_range(120, viewport_size.y - 200)
	)
	floating.velocity = Vector2(
		randf_range(speed_base, speed_base + speed_range) * (1 if floating.position.x < 0 else -1),
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
			_answer_slots[i].reveal(letter)
			found = true
			break

	if found:
		floating.destroy_correct()
		if _check_complete():
			_on_correct_answer({"answer": answer_key})
	else:
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
	if _overlay:
		_overlay.queue_free()
	super.cleanup()


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
