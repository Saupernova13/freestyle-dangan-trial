extends Node3D
## Trial Room Manager
##
## Manages trial loading and character display in the trial room.
## Auto-loads a trial file on scene start and populates character sprites.

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

# Script playback state
var script_lines: Array = []
var current_line_index: int = 0
var is_playing_script: bool = false

func _ready():
	await get_tree().process_frame  # Wait one frame for autoloads to initialize
	load_and_display_trial()

func load_and_display_trial():
	print("Loading trial from: ", trial_file_path)

	# Load trial using TrialLoader autoload
	var success = TrialLoader.load_trial(trial_file_path)

	if not success:
		push_error("Failed to load trial file!")
		return

	# Get character IDs from trial data
	var character_ids = TrialLoader.get_character_ids()

	if character_ids.size() != 17:
		push_warning("Expected 17 characters, got ", character_ids.size())

	# Populate each character position
	for i in range(17):
		var position_index = i + 1  # 1-based indexing (001-017)
		var character_id = character_ids[i] if i < character_ids.size() else null

		if character_id and character_id != "null":
			populate_character_position(position_index, character_id)
		else:
			print("No character at position ", position_index)

	# Load script lines
	script_lines = TrialLoader.get_script_lines()
	print("Loaded ", script_lines.size(), " script lines")

	# Clear dialogue initially
	if dialogue_label:
		dialogue_label.text = ""

	# Start playing script automatically
	if script_lines.size() > 0:
		is_playing_script = true
		display_current_line()
	else:
		# No script, just update first character
		if character_data.size() > 0 and character_data[0]:
			var first_char = character_data[0]
			var full_name = first_char.get("name", "") + " " + first_char.get("surname", "")
			update_character_name_label(full_name.strip_edges())
			update_character_portrait(0)

func populate_character_position(position_index: int, character_id: String):
	# Get marker node
	var marker_name = "Bench_Marker3D_%03d" % position_index
	if position_index == 17:
		marker_name = "Bench_Marker3D_017_Monokuma"

	var marker = trial_posts.get_node_or_null(marker_name)
	if not marker:
		push_warning("Marker not found: ", marker_name)
		return

	# Get MeshInstance3D child
	var mesh_name = "MeshInstance3D_Char_%03d" % position_index
	var mesh_instance = marker.get_node_or_null(mesh_name)
	if not mesh_instance:
		push_warning("MeshInstance3D not found: ", mesh_name)
		return

	# Load character data
	var char_data = TrialLoader.load_character(character_id)
	if char_data.is_empty():
		push_warning("Character data not found for ID: ", character_id)
		return

	# Store for later use
	character_data.append(char_data)

	# Get first sprite path (sprite_01.png)
	var sprite_path = TrialLoader.get_character_sprite(character_id, 1)
	if sprite_path.is_empty():
		push_warning("Sprite not found for character: ", char_data.get("name", character_id))
		return

	# Load texture from file
	var image = Image.load_from_file(sprite_path)
	if not image:
		push_error("Failed to load image: ", sprite_path)
		return

	var texture = ImageTexture.create_from_image(image)

	# Create new material with character sprite
	var material = StandardMaterial3D.new()
	material.albedo_texture = texture
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.cull_mode = BaseMaterial3D.CULL_DISABLED  # Double-sided
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED  # Pure sprite, no lighting

	# Apply material to mesh
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

	# Get character ID from stored data
	var character_id = char_data.get("id", "")
	if character_id.is_empty():
		return

	# Get first sprite path (sprite_01.png)
	var sprite_path = TrialLoader.get_character_sprite(character_id, 1)
	if sprite_path.is_empty():
		return

	# Load texture from file
	var image = Image.load_from_file(sprite_path)
	if not image:
		return

	var texture = ImageTexture.create_from_image(image)
	portrait_rect.texture = texture

# Called by bench_focus_camera when bench focus changes
func on_bench_focused(bench_index: int):
	# Don't update during script playback (script controls camera/name)
	if is_playing_script:
		return

	if bench_index >= 0 and bench_index < character_data.size():
		var char_data = character_data[bench_index]
		if char_data:
			var full_name = char_data.get("name", "") + " " + char_data.get("surname", "")
			update_character_name_label(full_name.strip_edges())
			update_character_portrait(bench_index)

## Script playback functions

func _input(event):
	# Only process spacebar during script playback
	if not is_playing_script:
		return

	if event is InputEventKey:
		if event.pressed and event.keycode == KEY_SPACE:
			advance_to_next_line()
			get_viewport().set_input_as_handled()

func advance_to_next_line():
	current_line_index += 1
	display_current_line()

func display_current_line():
	if current_line_index >= script_lines.size():
		print("End of script reached")
		is_playing_script = false
		return

	var line = script_lines[current_line_index]
	var line_type = line.get("type", "")

	# Only handle "speaking" type for now
	if line_type == "speaking":
		display_speaking_line(line)
	else:
		# Skip non-speaking lines for now
		print("Skipping line type: ", line_type)
		advance_to_next_line()

func display_speaking_line(line: Dictionary):
	var character_id = line.get("characterId", "")
	var dialogue_text = line.get("dialogue", "")
	var sprite_index = line.get("spriteIndex", 1)

	# Find character position in character_data array
	var character_position = find_character_position(character_id)

	if character_position >= 0:
		# Move camera to speaking character
		if camera and camera.has_method("jump_to_bench"):
			camera.jump_to_bench(character_position, true)

		# Display dialogue text
		if dialogue_label:
			dialogue_label.text = dialogue_text

		# Update character sprite on bench (if different from loaded sprite)
		update_character_sprite(character_position, character_id, sprite_index)
	else:
		push_warning("Character not found for ID: ", character_id)

func find_character_position(character_id: String) -> int:
	for i in range(character_data.size()):
		var char_data = character_data[i]
		if char_data and char_data.get("id", "") == character_id:
			return i
	return -1

func update_character_sprite(position_index: int, character_id: String, sprite_index: int):
	# Get the sprite for this character
	var sprite_path = TrialLoader.get_character_sprite(character_id, sprite_index)
	if sprite_path.is_empty():
		return

	# Get marker and mesh
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

	# Load and apply new sprite texture
	var image = Image.load_from_file(sprite_path)
	if not image:
		return

	var texture = ImageTexture.create_from_image(image)

	# Update material with new sprite
	if mesh_instance.material_override:
		mesh_instance.material_override.albedo_texture = texture
	else:
		var material = StandardMaterial3D.new()
		material.albedo_texture = texture
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		material.cull_mode = BaseMaterial3D.CULL_DISABLED
		material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		mesh_instance.material_override = material

	# Also update portrait
	update_character_portrait(position_index)
