extends Node
##
## Drives the trial script: walks through dialogue/narrator/minigame lines,
## tracks high-level state, and coordinates pause / settings menu / auto-skip.
## Input is delegated to InputManager — this node reacts to its signals
## instead of running its own _input().

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
var _settings_menu: Node = null
var _auto_advance_timer: float = 0.0
var _pre_pause_state: State = State.IDLE
var _skip_held: bool = false
var _skip_timer: float = 0.0

func _ready():
	InputManager.advance_pressed.connect(_on_advance_input)
	InputManager.settings_toggle_requested.connect(_on_settings_toggle_requested)
	InputManager.skip_held_changed.connect(_on_skip_held_changed)

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
	if audio_file is String and not audio_file.is_empty():
		if AudioManager.is_voice_playing():
			AudioManager.stop_voice()
		AudioManager.play_voice_line(audio_file)

	dialogue_displayed.emit(character_id, dialogue_text)
	_transition_to(State.WAITING_FOR_ADVANCE)

func _handle_narrator_line(line: Dictionary):
	_transition_to(State.DIALOGUE)
	var text = line.get("text", line.get("dialogue", ""))

	# Narrator lines can carry audio (SFX / narration VO) just like speaking lines.
	var audio_file = line.get("audioFile", "")
	if audio_file is String and not audio_file.is_empty():
		if AudioManager.is_voice_playing():
			AudioManager.stop_voice()
		AudioManager.play_voice_line(audio_file)

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
	await get_tree().create_timer(MinigameConfig.MINIGAME_RESULT_PAUSE).timeout
	_transition_to(State.DIALOGUE)
	advance_to_next_line()

func request_advance():
	if current_state == State.WAITING_FOR_ADVANCE:
		advance_to_next_line()

func notify_typewriter_started():
	is_typewriter_active = true

func notify_typewriter_finished():
	is_typewriter_active = false
	_auto_advance_timer = 0.0

# ---------------------------------------------------------------------------
# Input reactions
# ---------------------------------------------------------------------------
func _on_advance_input() -> void:
	if current_state == State.PAUSED:
		return
	if current_state != State.WAITING_FOR_ADVANCE:
		return
	if is_typewriter_active:
		typewriter_skip_requested.emit()
	else:
		advance_to_next_line()
	get_viewport().set_input_as_handled()

func _on_settings_toggle_requested() -> void:
	_toggle_settings_menu()
	get_viewport().set_input_as_handled()

func _on_skip_held_changed(held: bool) -> void:
	_skip_held = held
	_skip_timer = 0.0
	if held:
		_auto_advance_timer = 0.0

# ---------------------------------------------------------------------------
# Pause / settings
# ---------------------------------------------------------------------------
func pause_trial():
	if current_state != State.IDLE and current_state != State.TRIAL_COMPLETE:
		_pre_pause_state = current_state
		_transition_to(State.PAUSED)

func resume_trial():
	if current_state == State.PAUSED:
		_transition_to(_pre_pause_state)

func get_current_line() -> Dictionary:
	if current_line_index >= 0 and current_line_index < script_lines.size():
		return script_lines[current_line_index]
	return {}

func get_progress() -> float:
	if script_lines.is_empty():
		return 0.0
	return float(current_line_index + 1) / float(script_lines.size())

func _process(delta):
	if _skip_held and current_state == State.WAITING_FOR_ADVANCE:
		_skip_timer += delta
		if _skip_timer >= MinigameConfig.SKIP_INTERVAL:
			_skip_timer = 0.0
			if is_typewriter_active:
				typewriter_skip_requested.emit()
			else:
				advance_to_next_line()
		return

	if Settings and Settings.auto_advance and current_state == State.WAITING_FOR_ADVANCE and not is_typewriter_active:
		_auto_advance_timer += delta
		if _auto_advance_timer >= Settings.auto_advance_delay:
			_auto_advance_timer = 0.0
			advance_to_next_line()

func _toggle_settings_menu():
	if _settings_menu:
		return

	_pre_pause_state = current_state
	if current_state != State.IDLE and current_state != State.TRIAL_COMPLETE:
		_transition_to(State.PAUSED)

	_settings_menu = ResourceRegistry.instantiate("settings_menu")
	add_child(_settings_menu)
	_settings_menu.open()
	_settings_menu.closed.connect(func():
		_settings_menu = null
		if current_state == State.PAUSED:
			_transition_to(_pre_pause_state)
	)
