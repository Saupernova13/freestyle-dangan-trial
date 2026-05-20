extends Node3D
## Trial Room Manager
##
## Manages trial loading and character display in the trial room.
## Responds to ScriptDirector signals for dialogue/sprite/camera updates.

@onready var trial_posts = $Trial_Posts/Trial_Benches
@onready var name_label = get_node("../UI/Conversation_UI/Control_Center_Name_Label/Label_Center_Name")
@onready var portrait_rect = get_node("../UI/Conversation_UI/Panel_Top_Left/Control_Top_Left/TextureRect_Speaker_Portrait")
@onready var dialogue_label = get_node("../UI/Conversation_UI/RichTextLabel_Bottom_Speech")
@onready var camera = get_node_or_null("../Camera3D")

var trial_file_path: String = "user://trial.drtrial"

# Store character data for quick lookup
var character_data: Array = []

# Dialogue box controller
var _dialogue_box: Node

var _conversation_ui_was_visible: bool = true
var _roaming_text_was_visible: bool = true

func _ready():
	await get_tree().process_frame

	_dialogue_box = preload("res://scripts/ui/DialogueBox.gd").new()
	add_child(_dialogue_box)
	_dialogue_box.setup(dialogue_label, name_label, portrait_rect)
	ScriptDirector.typewriter_skip_requested.connect(func():
		if _dialogue_box:
			_dialogue_box.skip_typewriter()
	)

	load_and_display_trial()

	add_to_group("trial_room")

	ScriptDirector.line_started.connect(_on_line_started)
	ScriptDirector.dialogue_displayed.connect(_on_dialogue_displayed)
	ScriptDirector.narrator_displayed.connect(_on_narrator_displayed)
	ScriptDirector.minigame_requested.connect(_on_minigame_requested)
	ScriptDirector.trial_ended.connect(_on_trial_ended)
	InfluenceGauge.influence_depleted.connect(_on_game_over)

func load_and_display_trial():
	# Check if a file was selected from the picker
	if TrialLoader.has_meta("pending_trial_path"):
		trial_file_path = TrialLoader.get_meta("pending_trial_path")
		TrialLoader.remove_meta("pending_trial_path")

	print("Loading trial from: ", trial_file_path)

	var success = TrialLoader.load_trial(trial_file_path)
	if not success:
		var msg = TrialLoader.last_load_error if not TrialLoader.last_load_error.is_empty() else "Failed to load trial."
		push_error(msg)
		# Surface the error and return to the start menu — without this the user
		# sees a blank trial room with no indication of what went wrong, which is
		# the original Android-side complaint.
		MobileToast.show(get_tree().root, msg, true, 5.0)
		await get_tree().create_timer(1.0).timeout
		get_tree().change_scene_to_file("res://scenes/start_menu.tscn")
		return

	var character_ids = TrialLoader.get_character_ids()
	if character_ids.size() != 17:
		push_warning("Expected 17 characters, got ", character_ids.size())

	for i in range(17):
		var position_index = i + 1
		var character_id: String = ""
		if i < character_ids.size() and character_ids[i] is String:
			character_id = character_ids[i]

		if not character_id.is_empty() and character_id != "null":
			populate_character_position(position_index, character_id)
		else:
			print("No character at position ", position_index)

	if dialogue_label:
		dialogue_label.text = ""

	ScriptDirector.start_trial()

func populate_character_position(position_index: int, character_id: String):
	var marker_name = "Bench_Marker3D_%03d" % position_index
	if position_index == 17:
		marker_name = "Bench_Marker3D_017_Monokuma"

	var marker = trial_posts.get_node_or_null(marker_name)
	if not marker:
		push_warning("Marker not found: ", marker_name)
		return

	var mesh_name = "MeshInstance3D_Char_%03d" % position_index
	var mesh_instance = marker.get_node_or_null(mesh_name)
	if not mesh_instance:
		push_warning("MeshInstance3D not found: ", mesh_name)
		return

	var char_data = TrialLoader.load_character(character_id)
	if char_data.is_empty():
		push_warning("Character data not found for ID: ", character_id)
		return

	character_data.append(char_data)

	var sprite_path = TrialLoader.get_character_sprite(character_id, 1)
	if sprite_path.is_empty():
		push_warning("Sprite not found for character: ", char_data.get("name", character_id))
		return

	var image = Image.load_from_file(sprite_path)
	if not image:
		push_error("Failed to load image: ", sprite_path)
		return

	var texture = ImageTexture.create_from_image(image)

	var material = StandardMaterial3D.new()
	material.albedo_texture = texture
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.cull_mode = BaseMaterial3D.CULL_BACK
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mesh_instance.material_override = material
	_ensure_black_backplane(mesh_instance)

	print("Loaded character: ", char_data.get("name", ""), " at position ", position_index)

func update_character_name_label(character_name: String):
	if name_label:
		name_label.text = character_name

func update_character_portrait(bench_index: int, sprite_index: int = 1):
	if not portrait_rect:
		return
	if bench_index < 0 or bench_index >= character_data.size():
		return

	var char_data = character_data[bench_index]
	if not char_data:
		return

	var character_id = char_data.get("id", "")
	if character_id.is_empty():
		return

	var sprite_path = TrialLoader.get_character_sprite(character_id, sprite_index)
	if sprite_path.is_empty():
		sprite_path = TrialLoader.get_character_sprite(character_id, 1)
	if sprite_path.is_empty():
		return

	var image = Image.load_from_file(sprite_path)
	if not image:
		return

	var texture = ImageTexture.create_from_image(image)
	portrait_rect.texture = texture

func on_bench_focused(bench_index: int):
	if ScriptDirector.current_state == ScriptDirector.State.WAITING_FOR_ADVANCE or \
	   ScriptDirector.current_state == ScriptDirector.State.DIALOGUE:
		return

	if bench_index >= 0 and bench_index < character_data.size():
		var char_data = character_data[bench_index]
		if char_data:
			var full_name = char_data.get("name", "") + " " + char_data.get("surname", "")
			update_character_name_label(full_name.strip_edges())
			update_character_portrait(bench_index)

func _on_line_started(line: Dictionary):
	var line_type = line.get("type", "")
	if line_type == "speaking":
		var character_id = line.get("characterId", "")
		var sprite_index = line.get("spriteIndex", 1)
		var character_position = find_character_position(character_id)

		if character_position >= 0:
			# Always hard-cut to the speaking character first (no smooth pan)
			if camera and camera.has_method("jump_to_bench"):
				camera.jump_to_bench(character_position, false)
			var camera_motion = line.get("cameraMotion", {})
			if not camera_motion.is_empty() and camera_motion.get("type", "none") != "none":
				CameraDirector.execute_motion(camera_motion, character_position)

			update_character_sprite(character_position, character_id, sprite_index)

			var char_data = character_data[character_position]
			if char_data:
				var full_name = char_data.get("name", "") + " " + char_data.get("surname", "")
				update_character_name_label(full_name.strip_edges())
				update_character_portrait(character_position, sprite_index)

	var special_effects = line.get("specialEffects", {})
	if not special_effects.is_empty():
		ScreenEffects.play_effects(special_effects)

func _on_dialogue_displayed(_character_id: String, _text: String):
	var line = ScriptDirector.get_current_line()
	if _dialogue_box:
		_dialogue_box.display_speaking_line(line)

func _on_narrator_displayed(_text: String):
	var line = ScriptDirector.get_current_line()
	update_character_name_label("")
	if _dialogue_box:
		_dialogue_box.display_narrator_line(line)

## Map minigame `gameType` → script path. Used by _instantiate_minigame() to
## resolve the right MinigameBase subclass without a giant match statement.
const MINIGAME_SCRIPTS := {
	"nonstop_debate": "res://scripts/minigames/NonstopDebate.gd",
	"hangmans_gambit": "res://scripts/minigames/HangmansGambit.gd",
	"logic_dive": "res://scripts/minigames/LogicDive.gd",
	"debate_scrum": "res://scripts/minigames/DebateScrum.gd",
	"mass_panic_debate": "res://scripts/minigames/MassPanicDebate.gd",
	"rebuttal_showdown": "res://scripts/minigames/RebuttalShowdown.gd",
	"psyche_taxi": "res://scripts/minigames/PsycheTaxi.gd",
	"closing_argument": "res://scripts/minigames/ClosingArgument.gd",
}

func _instantiate_minigame(game_type: String) -> MinigameBase:
	if not MINIGAME_SCRIPTS.has(game_type):
		return null
	var script: GDScript = load(MINIGAME_SCRIPTS[game_type])
	return script.new() as MinigameBase

func _on_minigame_requested(minigame_data: Dictionary):
	var game_type = minigame_data.get("gameType", "")

	if not MINIGAME_SCRIPTS.has(game_type):
		print("TrialRoomManager: Unknown minigame type: ", game_type)
		await get_tree().create_timer(1.0).timeout
		ScriptDirector.on_minigame_finished(true)
		return

	if dialogue_label:
		dialogue_label.text = ""

	_hide_conversation_ui_for_minigame()

	# Title card plays once; each attempt then gets its own result card.
	var title_card = ResourceRegistry.instantiate("minigame_title_card")
	add_child(title_card)
	title_card.show_title(game_type, minigame_data.get("name", ""))
	await title_card.card_finished

	_start_minigame_attempt(minigame_data)

## Run one attempt of the minigame. A wrong answer or running out of time
## replays the minigame after showing its failure dialog; only success advances
## the trial. An emptied influence gauge hands off to the game-over screen.
func _start_minigame_attempt(minigame_data: Dictionary):
	var minigame: MinigameBase = _instantiate_minigame(minigame_data.get("gameType", ""))
	add_child(minigame)
	minigame.initialize(minigame_data)
	minigame.minigame_completed.connect(func(success, data):
		minigame.cleanup()
		minigame.queue_free()

		# An emptied influence gauge is a hard fail — the game-over screen
		# takes over, so skip the result card and the replay.
		if not success and data.get("reason", "") == "influence_depleted":
			return

		var result_card = ResourceRegistry.instantiate("minigame_title_card")
		add_child(result_card)
		result_card.show_result(success, data.get("failComment", ""))
		await result_card.card_finished

		if success:
			_restore_conversation_ui_after_minigame()
			ScriptDirector.on_minigame_finished(true)
		else:
			_start_minigame_attempt(minigame_data)
	)
	ScriptDirector.on_minigame_started(minigame)
	minigame.start()

func _hide_conversation_ui_for_minigame():
	# The roaming background text is part of the dialogue presentation — hide it
	# alongside the conversation UI so minigames get a clean screen.
	var conversation_ui = get_node_or_null("../UI/Conversation_UI")
	if conversation_ui:
		_conversation_ui_was_visible = conversation_ui.visible
		conversation_ui.visible = false
	var roaming_text = get_node_or_null("../Path2D_RoamingText")
	if roaming_text:
		_roaming_text_was_visible = roaming_text.visible
		roaming_text.visible = false

func _restore_conversation_ui_after_minigame():
	var conversation_ui = get_node_or_null("../UI/Conversation_UI")
	if conversation_ui:
		conversation_ui.visible = _conversation_ui_was_visible
	var roaming_text = get_node_or_null("../Path2D_RoamingText")
	if roaming_text:
		roaming_text.visible = _roaming_text_was_visible

func _on_trial_ended():
	if dialogue_label:
		dialogue_label.text = "[Trial Complete]"
	update_character_name_label("")

func find_character_position(character_id: String) -> int:
	for i in range(character_data.size()):
		var char_data = character_data[i]
		if char_data and char_data.get("id", "") == character_id:
			return i
	return -1

func update_character_sprite(position_index: int, character_id: String, sprite_index: int):
	var sprite_path = TrialLoader.get_character_sprite(character_id, sprite_index)
	if sprite_path.is_empty():
		return

	var marker_name = "Bench_Marker3D_%03d" % (position_index + 1)
	if position_index == 16:
		marker_name = "Bench_Marker3D_017_Monokuma"

	var marker = trial_posts.get_node_or_null(marker_name)
	if not marker:
		return

	var mesh_name = "MeshInstance3D_Char_%03d" % (position_index + 1)
	var mesh_instance = marker.get_node_or_null(mesh_name)
	if not mesh_instance:
		return

	var image = Image.load_from_file(sprite_path)
	if not image:
		return

	var texture = ImageTexture.create_from_image(image)

	if mesh_instance.material_override:
		mesh_instance.material_override.albedo_texture = texture
	else:
		var material = StandardMaterial3D.new()
		material.albedo_texture = texture
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		material.cull_mode = BaseMaterial3D.CULL_BACK
		material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		mesh_instance.material_override = material
	_ensure_black_backplane(mesh_instance)

	update_character_portrait(position_index)

func _ensure_black_backplane(mesh_instance: MeshInstance3D):
	if mesh_instance.get_node_or_null("BackPlane"):
		return
	var back = MeshInstance3D.new()
	back.name = "BackPlane"
	back.mesh = mesh_instance.mesh
	back.rotation_degrees.y = 180.0
	var black_mat = StandardMaterial3D.new()
	black_mat.albedo_color = Color.BLACK
	black_mat.cull_mode = BaseMaterial3D.CULL_BACK
	black_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	back.material_override = black_mat
	mesh_instance.add_child(back)

func _on_game_over():
	ScriptDirector.pause_trial()
	if dialogue_label:
		dialogue_label.text = ""
	update_character_name_label("")

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
