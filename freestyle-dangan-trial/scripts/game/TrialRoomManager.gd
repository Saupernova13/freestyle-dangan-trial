extends Node3D
## Composition root for the trial room. Loads the trial, wires ScriptDirector's
## flow signals to the collaborators that render them — CharacterStage (3D bench
## sprites), the DialogueBox (speech), and MinigameRunner (minigame lines) — and
## owns the speaker name/portrait presentation plus the game-over hand-off.

@onready var trial_posts = $Trial_Posts/Trial_Benches
@onready var name_label = get_node("../UI/Conversation_UI/Control_Center_Name_Label/Label_Center_Name")
@onready var portrait_rect = get_node(
	"../UI/Conversation_UI/Panel_Top_Left/Control_Top_Left/TextureRect_Speaker_Portrait"
)
@onready var dialogue_label = get_node("../UI/Conversation_UI/RichTextLabel_Bottom_Speech")
@onready var camera = get_node_or_null("../Camera3D")

var trial_file_path: String = "user://trial.drtrial"

var _stage: CharacterStage
var _dialogue_box: Node
var _minigame_runner: MinigameRunner

func _ready():
	await get_tree().process_frame

	_stage = CharacterStage.new(trial_posts)

	_dialogue_box = preload("res://scripts/ui/DialogueBox.gd").new()
	add_child(_dialogue_box)
	_dialogue_box.setup(dialogue_label, name_label, portrait_rect)
	_dialogue_box.typewriter_started.connect(ScriptDirector.notify_typewriter_started)
	_dialogue_box.typewriter_finished.connect(ScriptDirector.notify_typewriter_finished)
	ScriptDirector.typewriter_skip_requested.connect(func():
		if _dialogue_box:
			_dialogue_box.skip_typewriter()
	)

	_minigame_runner = MinigameRunner.new()
	add_child(_minigame_runner)
	_minigame_runner.setup(
		get_node_or_null("../UI/Conversation_UI"),
		get_node_or_null("../Path2D_RoamingText"),
		dialogue_label)

	add_to_group("trial_room")

	# Wire script signals BEFORE loading the trial. start_trial() emits
	# line_started / dialogue_displayed for the first line synchronously, so the
	# listeners must already be connected — otherwise line 0 is lost and the
	# trial appears to open on a blank dialogue box one line early.
	ScriptDirector.line_started.connect(_on_line_started)
	ScriptDirector.dialogue_displayed.connect(_on_dialogue_displayed)
	ScriptDirector.narrator_displayed.connect(_on_narrator_displayed)
	ScriptDirector.minigame_requested.connect(_on_minigame_requested)
	ScriptDirector.trial_ended.connect(_on_trial_ended)
	InfluenceGauge.influence_depleted.connect(_on_game_over)

	_load_and_display_trial()

func _load_and_display_trial():
	if TrialLoader.loaded_async:
		# Pre-loaded via loading screen — jump straight to scene setup
		_setup_trial_room()
		return

	# Fallback synchronous path (direct launch from editor, etc.)
	if TrialLoader.has_meta("pending_trial_path"):
		trial_file_path = TrialLoader.get_meta("pending_trial_path")
		TrialLoader.remove_meta("pending_trial_path")

	if not TrialLoader.load_trial(trial_file_path):
		var msg := (TrialLoader.last_load_error
			if not TrialLoader.last_load_error.is_empty()
			else "Failed to load trial.")
		push_error(msg)
		MobileToast.show_message(get_tree().root, msg, true, 5.0)
		await get_tree().create_timer(1.0).timeout
		get_tree().change_scene_to_file("res://scenes/start_menu.tscn")
		return

	_setup_trial_room()

func _setup_trial_room() -> void:
	_stage.populate(TrialLoader.get_character_ids())
	if dialogue_label:
		dialogue_label.text = ""
	ScriptDirector.start_trial()

# ---------------------------------------------------------------------------
# Speaker presentation — the conversation UI reflecting the current line.
# ---------------------------------------------------------------------------
func _set_name(character_name: String) -> void:
	if name_label:
		name_label.text = character_name

func _set_portrait(bench_index: int, sprite_index: int = 1) -> void:
	if not portrait_rect:
		return
	var char_data := _stage.character_at_bench(bench_index)
	var character_id = char_data.get("id", "")
	if character_id.is_empty():
		return
	# Fall back to the first sprite when the requested index doesn't exist.
	var texture := TrialLoader.get_sprite_texture(character_id, sprite_index)
	if not texture:
		texture = TrialLoader.get_sprite_texture(character_id, 1)
	if texture:
		portrait_rect.texture = texture

func _on_line_started(line: ScriptLine):
	if line.type == ScriptLine.TYPE_SPEAKING:
		_present_speaking_line(line)

	if not line.special_effects.is_empty():
		ScreenEffects.play_effects(line.special_effects)

func _present_speaking_line(line: ScriptLine) -> void:
	var character_id := line.character_id
	var sprite_index := line.sprite_index

	# Resolve the speaker by id — never via bench index, so a sparse cast can't
	# redirect the lookup. Fall back to the character file for speakers without
	# a bench (or report "???"), because leaving the previous speaker's name on
	# screen is never acceptable.
	var char_data: Dictionary = _stage.character_at_bench(_stage.find_bench(character_id))
	if char_data.is_empty():
		char_data = TrialLoader.load_character(character_id)
	var bench_index: int = int(char_data.get("_bench_index", -1))

	if char_data.is_empty():
		push_warning("Speaking line references unknown character: ", character_id)
		_set_name("???")
		if portrait_rect:
			portrait_rect.texture = null
		return

	var full_name = char_data.get("name", "") + " " + char_data.get("surname", "")
	_set_name(full_name.strip_edges())

	if bench_index >= 0:
		# Always hard-cut to the speaking character first (no smooth pan)
		if camera and camera.has_method("jump_to_bench"):
			camera.jump_to_bench(bench_index, false)
		var camera_motion := line.camera_motion
		if not camera_motion.is_empty() and camera_motion.get("type", "none") != "none":
			CameraDirector.execute_motion(camera_motion, bench_index)

		_stage.update_sprite(bench_index, character_id, sprite_index)
		_set_portrait(bench_index, sprite_index)

func _on_dialogue_displayed(_character_id: String, _text: String):
	if _dialogue_box:
		_dialogue_box.display_speaking_line(ScriptDirector.get_current_line())

func _on_narrator_displayed(_text: String):
	_set_name("")
	if _dialogue_box:
		_dialogue_box.display_narrator_line(ScriptDirector.get_current_line())

func _on_minigame_requested(minigame: MinigameData):
	_minigame_runner.run(minigame)

func _on_trial_ended():
	if dialogue_label:
		dialogue_label.text = "[Trial Complete]"
	_set_name("")

# ---------------------------------------------------------------------------
# Called by the bench-focus camera (player free-look) and MinigameBase.
# ---------------------------------------------------------------------------
func on_bench_focused(bench_index: int):
	# The bench-focus camera calls this from its own _ready(), which can run
	# before this manager finishes _ready() and assigns _stage (there is an
	# await'd frame first). Ignore focus events until the stage exists — the
	# first dialogue line sets the speaker name/portrait anyway.
	if _stage == null:
		return

	if (
		ScriptDirector.current_state == ScriptDirector.State.WAITING_FOR_ADVANCE
		or ScriptDirector.current_state == ScriptDirector.State.DIALOGUE
	):
		return

	var char_data: Dictionary = _stage.character_at_bench(bench_index)
	if not char_data.is_empty():
		var full_name = char_data.get("name", "") + " " + char_data.get("surname", "")
		_set_name(full_name.strip_edges())
		_set_portrait(bench_index)

func find_character_position(character_id: String) -> int:
	return _stage.find_bench(character_id)

func _on_game_over():
	ScriptDirector.pause_trial()
	if dialogue_label:
		dialogue_label.text = ""
	_set_name("")

	var game_over_screen = ResourceRegistry.instantiate("game_over_screen")
	add_child(game_over_screen)
	game_over_screen.show_game_over()

	game_over_screen.retry_requested.connect(func():
		Engine.time_scale = 1.0
		InfluenceGauge.reset()
		get_tree().reload_current_scene()
	)
	game_over_screen.return_to_menu.connect(func():
		Engine.time_scale = 1.0
		InfluenceGauge.reset()
		get_tree().change_scene_to_file("res://scenes/start_menu.tscn")
	)
