extends Node

enum State {
	IDLE,
	DIALOGUE,
	WAITING_FOR_ADVANCE,
	MINIGAME_LOADING,
	MINIGAME_ACTIVE,
	MINIGAME_RESULT,
	PAUSED,
	TRIAL_COMPLETE
}

signal line_started(line: Dictionary)
signal dialogue_displayed(character_id: String, text: String)
signal narrator_displayed(text: String)
signal minigame_requested(minigame_data: Dictionary)
signal minigame_completed(success: bool)
signal trial_ended
signal state_changed(new_state: State)
signal typewriter_skip_requested

var current_state: State = State.IDLE
var script_lines: Array = []
var current_line_index: int = -1
var is_typewriter_active: bool = false

var _active_minigame: Node = null

func _ready():
	set_process_input(true)

func start_trial():
	script_lines = TrialLoader.get_script_lines()
	if script_lines.is_empty():
		print("ScriptDirector: No script lines found")
		return

	print("ScriptDirector: Starting trial with ", script_lines.size(), " lines")
	current_line_index = -1
	_transition_to(State.DIALOGUE)
	advance_to_next_line()

func _transition_to(new_state: State):
	current_state = new_state
	state_changed.emit(new_state)

func advance_to_next_line():
	current_line_index += 1

	if current_line_index >= script_lines.size():
		print("ScriptDirector: End of script reached")
		_transition_to(State.TRIAL_COMPLETE)
		trial_ended.emit()
		return

	var line = script_lines[current_line_index]
	line_started.emit(line)

	var line_type = line.get("type", "")
	match line_type:
		"speaking":
			_handle_speaking_line(line)
		"narrator":
			_handle_narrator_line(line)
		"minigame":
			_handle_minigame_line(line)
		_:
			print("ScriptDirector: Unknown line type '", line_type, "', skipping")
			advance_to_next_line()

func _handle_speaking_line(line: Dictionary):
	_transition_to(State.DIALOGUE)
	var character_id = line.get("characterId", "")
	var dialogue_text = line.get("dialogue", "")

	var audio_file = line.get("audioFile", "")
	if not audio_file.is_empty():
		AudioManager.play_voice_line(audio_file)

	dialogue_displayed.emit(character_id, dialogue_text)
	_transition_to(State.WAITING_FOR_ADVANCE)

func _handle_narrator_line(line: Dictionary):
	_transition_to(State.DIALOGUE)
	var text = line.get("text", line.get("dialogue", ""))
	narrator_displayed.emit(text)
	_transition_to(State.WAITING_FOR_ADVANCE)

func _handle_minigame_line(line: Dictionary):
	var minigame_id = line.get("minigameId", "")
	if minigame_id.is_empty():
		print("ScriptDirector: Minigame line missing minigameId, skipping")
		advance_to_next_line()
		return

	var minigames = TrialLoader.get_minigames()
	var minigame_data: Dictionary = {}
	for mg in minigames:
		if mg.get("gameId", "") == minigame_id:
			minigame_data = mg
			break

	if minigame_data.is_empty():
		print("ScriptDirector: Minigame not found: ", minigame_id, ", skipping")
		advance_to_next_line()
		return

	_transition_to(State.MINIGAME_LOADING)
	minigame_requested.emit(minigame_data)

func on_minigame_started(minigame_node: Node):
	_active_minigame = minigame_node
	_transition_to(State.MINIGAME_ACTIVE)

func on_minigame_finished(success: bool):
	_active_minigame = null
	_transition_to(State.MINIGAME_RESULT)
	minigame_completed.emit(success)
	# Brief pause for result display, then advance
	await get_tree().create_timer(1.5).timeout
	_transition_to(State.DIALOGUE)
	advance_to_next_line()

func request_advance():
	if current_state == State.WAITING_FOR_ADVANCE:
		advance_to_next_line()

func notify_typewriter_started():
	is_typewriter_active = true

func notify_typewriter_finished():
	is_typewriter_active = false

func _input(event):
	if current_state == State.PAUSED:
		return

	if event is InputEventKey and event.pressed and event.keycode == KEY_SPACE:
		if current_state == State.WAITING_FOR_ADVANCE:
			if is_typewriter_active:
				typewriter_skip_requested.emit()
			else:
				advance_to_next_line()
			get_viewport().set_input_as_handled()

	if event is InputEventScreenTouch and event.pressed:
		if current_state == State.WAITING_FOR_ADVANCE:
			var viewport_size = get_viewport().get_visible_rect().size
			var tap_x = event.position.x
			if tap_x > viewport_size.x / 3.0 and tap_x < viewport_size.x * 2.0 / 3.0:
				if is_typewriter_active:
					typewriter_skip_requested.emit()
				else:
					advance_to_next_line()
				get_viewport().set_input_as_handled()

func pause_trial():
	if current_state != State.IDLE and current_state != State.TRIAL_COMPLETE:
		_transition_to(State.PAUSED)

func resume_trial():
	if current_state == State.PAUSED:
		_transition_to(State.WAITING_FOR_ADVANCE)

func get_current_line() -> Dictionary:
	if current_line_index >= 0 and current_line_index < script_lines.size():
		return script_lines[current_line_index]
	return {}

func get_progress() -> float:
	if script_lines.is_empty():
		return 0.0
	return float(current_line_index + 1) / float(script_lines.size())
