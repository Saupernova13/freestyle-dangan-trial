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
	connect_managed(InfluenceGauge.influence_depleted, _on_influence_depleted)
	Log.debug("HangmansGambit", "Answer is '%s' (%d letters)" % [answer_key, answer_key.length()])

func _build_overlay():
	# Layout is scene-owned; the answer-letter slots spawn below.
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

	var floating: FloatingLetter = ResourceRegistry.instantiate("floating_letter")
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
