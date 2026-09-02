extends Node3D
## Composition root for the trial room: loads the trial and wires
## ScriptDirector's flow signals to CharacterStage, the DialogueBox and
## MinigameRunner. Owns speaker presentation and the game-over hand-off.

@onready var trial_posts = $Trial_Posts/Trial_Benches
@onready var camera = get_node_or_null("../Camera3D")

## Conversation_UI is an instanced scene, so its children register their unique
## names against it rather than against this scene's root - %Label_Center_Name
## resolves from here only through this anchor. Reaching it is the one path
## left; everything inside it is re-nestable in the editor without touching
## this file.
@onready var conversation_ui: Node = get_node_or_null("../UI/Conversation_UI")

var name_label: Label
var portrait_rect: TextureRect
var dialogue_label: RichTextLabel

var trial_file_path: String = "user://trial.drtrial"

# Keys of warnings already emitted; see _warn_once.
var _warned: Dictionary = {}

var _stage: CharacterStage
var _dialogue_box: Node
var _minigame_runner: MinigameRunner

func _ready():
	await get_tree().process_frame

	_resolve_conversation_ui()
	_stage = CharacterStage.new(trial_posts)

	_dialogue_box = preload("res://scripts/ui/dialogue_box.gd").new()
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
		conversation_ui,
		get_node_or_null("../Path2D_RoamingText"),
		dialogue_label)

	add_to_group("trial_room")

	# Must precede loading: start_trial() emits line 0's signals synchronously,
	# so an unconnected listener opens the trial on a blank box.
	ScriptDirector.line_started.connect(_on_line_started)
	ScriptDirector.dialogue_displayed.connect(_on_dialogue_displayed)
	ScriptDirector.narrator_displayed.connect(_on_narrator_displayed)
	ScriptDirector.minigame_requested.connect(_on_minigame_requested)
	ScriptDirector.trial_ended.connect(_on_trial_ended)
	InfluenceGauge.influence_depleted.connect(_on_game_over)

	_load_and_display_trial()

func _load_and_display_trial():
	if TrialLoader.loaded_async:
		# The loading screen already loaded it; go straight to scene setup.
		_setup_trial_room()
		return

	# Synchronous fallback, for a direct launch out of the editor.
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
# Speaker presentation
# ---------------------------------------------------------------------------
func _set_name(character_name: String) -> void:
	if name_label:
		name_label.text = character_name

## Two silent fallbacks used to stack here: a missing sprite_index fell back to
## sprite 1 unlogged, and a missing sprite 1 left portrait_rect untouched - so
## the new speaker's name appeared over the previous speaker's face and nothing
## anywhere said so.
func _set_portrait(bench_index: int, sprite_index: int = 1) -> void:
	if not portrait_rect:
		return
	var char_data := _stage.character_at_bench(bench_index)
	var character_id = char_data.get("id", "")
	if character_id.is_empty():
		portrait_rect.texture = null
		return

	var texture := TrialLoader.get_sprite_texture(character_id, sprite_index)
	if not texture and sprite_index != 1:
		# Once per pair, not per line: an author who mistypes spriteIndex never
		# learns why the emotion never changes, but a per-line warning would be
		# one per frame of dialogue.
		_warn_once("sprite", "%s has no sprite %d; using sprite 1" % [character_id, sprite_index])
		texture = TrialLoader.get_sprite_texture(character_id, 1)

	if texture:
		portrait_rect.texture = texture
		return

	# Cleared, not left stale. A blank portrait is honest; the last speaker's
	# face under this speaker's name is not.
	_warn_once("sprite", "%s has no usable sprite; clearing the portrait" % character_id)
	portrait_rect.texture = null

## Keyed so a per-line problem is reported once rather than once per frame.
func _warn_once(category: String, message: String) -> void:
	var key := "%s:%s" % [category, message]
	if _warned.has(key):
		return
	_warned[key] = true
	Log.warn("TrialRoomManager", message)

## Named lookups, so re-nesting or renaming a container inside conversation_ui
## cannot break these. A missing node warns instead of erroring, which a
## hard-coded path could not do.
func _resolve_conversation_ui() -> void:
	if conversation_ui == null:
		push_warning("TrialRoomManager: Conversation_UI not found; dialogue will not display.")
		return
	name_label = _require_ui_node("%Label_Center_Name") as Label
	portrait_rect = _require_ui_node("%TextureRect_Speaker_Portrait") as TextureRect
	dialogue_label = _require_ui_node("%RichTextLabel_Bottom_Speech") as RichTextLabel

func _require_ui_node(unique_name: String) -> Node:
	var node := conversation_ui.get_node_or_null(unique_name)
	if node == null:
		push_warning("TrialRoomManager: %s not found in conversation_ui.tscn" % unique_name)
	return node

func _on_line_started(line: ScriptLine):
	if line.type == ScriptLine.TYPE_SPEAKING:
		_present_speaking_line(line)

	if not line.special_effects.is_empty():
		ScreenEffects.play_effects(line.special_effects)

func _present_speaking_line(line: ScriptLine) -> void:
	var character_id := line.character_id
	var sprite_index := line.sprite_index

	# By id, never bench index: a sparse cast would redirect the lookup.
	# Benchless speakers fall back to the character file, then "???" — never to
	# the previous speaker's name.
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
		# Hard cut, never a pan.
		if camera and camera.has_method("jump_to_bench"):
			camera.jump_to_bench(bench_index, false)
		var camera_motion := line.camera_motion
		if not camera_motion.is_empty() and camera_motion.get("type", "none") != "none":
			CameraDirector.execute_motion(camera_motion, bench_index)

		_stage.update_sprite(bench_index, character_id, sprite_index)
		_set_portrait(bench_index, sprite_index)
	else:
		# Present in character.json but not seated. The bench sprite and camera
		# have nothing to act on, and leaving the portrait alone would show the
		# previous speaker's face under this one's name.
		_warn_once(
			"bench",
			"%s speaks but is not in the cast list; no portrait" % character_id
		)
		if portrait_rect:
			portrait_rect.texture = null

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
	# The camera's _ready() can beat this manager's. Ignoring focus until _stage
	# exists is safe: the first dialogue line sets the speaker anyway.
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

	# The nodes holding time-scale requests are about to be freed with the
	# scene, so their releases will never run.
	game_over_screen.retry_requested.connect(func():
		TimeScale.release_all()
		InfluenceGauge.reset()
		get_tree().reload_current_scene()
	)
	game_over_screen.return_to_menu.connect(func():
		TimeScale.release_all()
		InfluenceGauge.reset()
		get_tree().change_scene_to_file("res://scenes/start_menu.tscn")
	)
