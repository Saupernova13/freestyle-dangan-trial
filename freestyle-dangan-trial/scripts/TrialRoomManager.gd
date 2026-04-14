extends Node3D
## Trial Room Manager
##
## Manages trial loading and character display in the trial room.
## Responds to ScriptDirector signals for dialogue/sprite/camera updates.

@onready var trial_posts = $Trial_Posts/Trial_Benches
@onready var name_label = get_node("../UI/Conversation_UI/Control_Center_Name_Label/Label_Center_Name")
@onready var portrait_rect = get_node("../UI/Conversation_UI/Panel_Top_Left/Control_Top_Left/TextureRect_Speaker_Portrait")
@onready var dialogue_label = get_node("../UI/Conversation_UI/RichTextLabel_Bottom_Speech")
@onready var camera = get_node("../Camera3D")

# Hardcoded trial path - change this to point to your exported .drtrial file
# Options:
#   - "user://trial.drtrial" (AppData folder)
#   - "res://trial.drtrial" (project folder)
#   - "C:/Users/YourName/Desktop/trial.drtrial" (absolute path)
var trial_file_path: String = "C:/Users/RaaViVi/Desktop/trial.drtrial"

# Store character data for quick lookup
var character_data: Array = []

func _ready():
	await get_tree().process_frame
	load_and_display_trial()

	add_to_group("trial_room")

	ScriptDirector.line_started.connect(_on_line_started)
	ScriptDirector.dialogue_displayed.connect(_on_dialogue_displayed)
	ScriptDirector.narrator_displayed.connect(_on_narrator_displayed)
	ScriptDirector.minigame_requested.connect(_on_minigame_requested)
	ScriptDirector.trial_ended.connect(_on_trial_ended)

func load_and_display_trial():
	print("Loading trial from: ", trial_file_path)

	var success = TrialLoader.load_trial(trial_file_path)
	if not success:
		push_error("Failed to load trial file!")
		return

	var character_ids = TrialLoader.get_character_ids()
	if character_ids.size() != 17:
		push_warning("Expected 17 characters, got ", character_ids.size())

	for i in range(17):
		var position_index = i + 1
		var character_id = character_ids[i] if i < character_ids.size() else null

		if character_id and character_id != "null":
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
	material.cull_mode = BaseMaterial3D.CULL_DISABLED
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mesh_instance.material_override = material

	print("Loaded character: ", char_data.get("name", ""), " at position ", position_index)

func update_character_name_label(character_name: String):
	if name_label:
		name_label.text = character_name

func update_character_portrait(bench_index: int):
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

	var sprite_path = TrialLoader.get_character_sprite(character_id, 1)
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
			if camera and camera.has_method("jump_to_bench"):
				camera.jump_to_bench(character_position, true)
			update_character_sprite(character_position, character_id, sprite_index)

			var char_data = character_data[character_position]
			if char_data:
				var full_name = char_data.get("name", "") + " " + char_data.get("surname", "")
				update_character_name_label(full_name.strip_edges())
				update_character_portrait(character_position)

func _on_dialogue_displayed(character_id: String, text: String):
	if dialogue_label:
		dialogue_label.text = text

func _on_narrator_displayed(text: String):
	update_character_name_label("")
	if dialogue_label:
		dialogue_label.text = text

func _on_minigame_requested(minigame_data: Dictionary):
	var game_type = minigame_data.get("gameType", "")
	var minigame: MinigameBase = null

	match game_type:
		"nonstop_debate":
			minigame = preload("res://scripts/minigames/NonstopDebate.gd").new()
		_:
			print("TrialRoomManager: Unimplemented minigame type: ", game_type)
			# Auto-succeed for unimplemented types
			await get_tree().create_timer(1.0).timeout
			ScriptDirector.on_minigame_finished(true)
			return

	add_child(minigame)
	minigame.initialize(minigame_data)
	minigame.minigame_completed.connect(func(success, _data):
		minigame.cleanup()
		minigame.queue_free()
		ScriptDirector.on_minigame_finished(success)
	)
	ScriptDirector.on_minigame_started(minigame)
	minigame.start()

	if dialogue_label:
		dialogue_label.text = ""

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
		material.cull_mode = BaseMaterial3D.CULL_DISABLED
		material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		mesh_instance.material_override = material

	update_character_portrait(position_index)
