extends Path2D
## Dynamic roaming text that follows an oval path around the viewport
##
## This script creates an oval path that adapts to window size, loads text from a JSON file,
## and animates individual characters along the curve. All characters are created as
## PathFollow2D nodes with Label children.

## Path to the JSON file containing configuration paths (paths.json)
@export_file("*.json") var paths_config_file: String = "res://data/paths.json"

## Spacing between characters as a percentage of the total path length (0.0 to 1.0)
## Lower values bring letters closer together
@export_range(0.001, 0.2, 0.001) var character_spacing: float = 0.015

## Enable or disable the animation of text moving along the path
@export var animate: bool = true

## Duration in seconds for one complete loop around the path
@export_range(1.0, 60.0, 0.1) var animation_speed: float = 20.0

## Padding from the left edge of the viewport (positive = inset, negative = expand beyond viewport)
@export_range(-500.0, 500.0, 1.0) var padding_left: float = 185.0

## Padding from the right edge of the viewport (positive = inset, negative = expand beyond viewport)
@export_range(-500.0, 500.0, 1.0) var padding_right: float = 275.0

## Padding from the top edge of the viewport (positive = inset, negative = expand beyond viewport)
@export_range(-500.0, 500.0, 1.0) var padding_top: float = -50.0

## Padding from the bottom edge of the viewport (positive = inset, negative = expand beyond viewport)
@export_range(-500.0, 500.0, 1.0) var padding_bottom: float = -200.0

## Font size for all character labels
@export_range(8, 128, 1) var font_size: int = 74

## Font file to use for character labels
@export_file("*.ttf") var font_file: String = "res://fonts/LexendMega-Regular.ttf"

## Color of the text (supports hex codes with transparency)
@export var text_color: Color = Color(1.0, 1.0, 1.0, 0.2)

## Direction of rotation (true = clockwise, false = counter-clockwise)
@export var clockwise: bool = false

## Starting position on the path (0.0 = right, 0.25 = bottom, 0.5 = left, 0.75 = top)
@export_range(0.0, 1.0, 0.01) var start_position: float = 0.25

## Z-index for rendering order (lower values render behind everything)
@export_range(-1000, 1000, 1) var render_z_index: int = -1000

## Draw the path outline for visual debugging
@export var draw_path: bool = false

## Color of the drawn path outline
@export var path_color: Color = Color(1.0, 1.0, 1.0, 0.3)

## Width of the drawn path outline in pixels
@export_range(1.0, 10.0, 0.5) var path_width: float = 2.0

# Internal variables
var character_nodes: Array[PathFollow2D] = []
var tween: Tween
var text_config_path: String = ""

func _ready():
	# Set z-index to render on top of other elements
	z_index = render_z_index

	# Load the paths configuration to get the text config path
	load_paths_config()

	# Create the oval path
	update_oval_path()

	# Connect to viewport resize signal to update path dynamically
	get_viewport().size_changed.connect(update_oval_path)

	# Wait a frame for the curve to be set up
	await get_tree().process_frame

	# Generate the text characters
	generate_curved_text()

	# Start animation if enabled
	if animate:
		start_animation()

## Loads the paths.json file to retrieve the text configuration path
func load_paths_config():
	var json_text = FileAccess.get_file_as_string(paths_config_file)
	if json_text.is_empty():
		push_error("Failed to read paths config file: " + paths_config_file)
		return

	var json = JSON.new()
	var parse_result = json.parse(json_text)

	if parse_result != OK:
		push_error("Failed to parse paths config file: " + paths_config_file)
		return

	var data = json.data
	if data.has("text_config_path"):
		text_config_path = data.text_config_path
	else:
		push_error("Paths config missing 'text_config_path' field")
		# Fallback to default
		text_config_path = "res://data/curved_text.json"

## Creates or updates the oval path based on current viewport size
## The path is created using bezier curves to form a smooth oval
## Called on ready and whenever the viewport is resized
func update_oval_path():
	# Ensure the Path2D is at origin so curve coordinates match viewport space
	position = Vector2.ZERO

	var viewport_size = get_viewport_rect().size

	# Calculate the bounding box for the oval using individual padding values
	var left_edge = padding_left
	var right_edge = viewport_size.x - padding_right
	var top_edge = padding_top
	var bottom_edge = viewport_size.y - padding_bottom

	# Calculate center and radii from the bounding box
	var center_x = (left_edge + right_edge) / 2
	var center_y = (top_edge + bottom_edge) / 2
	var radius_x = (right_edge - left_edge) / 2
	var radius_y = (bottom_edge - top_edge) / 2

	var new_curve = Curve2D.new()

	# Magic number for circular bezier curves: 0.551915
	# This creates smooth circular/oval arcs using cubic bezier curves
	var handle_length = 0.551915

	# Right point (0.0 on path)
	new_curve.add_point(
		Vector2(center_x + radius_x, center_y),
		Vector2(0, -radius_y * handle_length),
		Vector2(0, radius_y * handle_length)
	)

	# Bottom point (0.25 on path)
	new_curve.add_point(
		Vector2(center_x, center_y + radius_y),
		Vector2(radius_x * handle_length, 0),
		Vector2(-radius_x * handle_length, 0)
	)

	# Left point (0.5 on path)
	new_curve.add_point(
		Vector2(center_x - radius_x, center_y),
		Vector2(0, radius_y * handle_length),
		Vector2(0, -radius_y * handle_length)
	)

	# Top point (0.75 on path)
	new_curve.add_point(
		Vector2(center_x, center_y - radius_y),
		Vector2(-radius_x * handle_length, 0),
		Vector2(radius_x * handle_length, 0)
	)

	# Close the loop by returning to the right point
	new_curve.add_point(
		Vector2(center_x + radius_x, center_y),
		Vector2(0, -radius_y * handle_length),
		Vector2(0, radius_y * handle_length)
	)

	curve = new_curve

	# Trigger redraw to show the new path
	queue_redraw()

## Generates PathFollow2D nodes for each character in the text
## Loads text from the JSON file specified in paths.json
## Creates a Label for each character and positions them along the path
func generate_curved_text():
	# Clear existing character nodes
	for node in character_nodes:
		node.queue_free()
	character_nodes.clear()

	# Load and parse text configuration JSON
	if text_config_path == "":
		push_error("Text config path not set. Check paths.json file.")
		return

	var json_text = FileAccess.get_file_as_string(text_config_path)
	if json_text.is_empty():
		push_error("Failed to read JSON file: " + text_config_path)
		return

	var json = JSON.new()
	var parse_result = json.parse(json_text)

	if parse_result != OK:
		push_error("Failed to parse JSON file: " + text_config_path)
		return

	var data = json.data
	if not data.has("text"):
		push_error("JSON file missing 'text' field")
		return

	var text: String = data.text
	var char_count = text.length()

	# Calculate starting position to center the text around the start_position
	var total_width = char_count * character_spacing
	var start_offset = start_position - (total_width / 2.0)

	# Create a PathFollow2D and Label for each character
	for i in range(char_count):
		var character = text[i]

		# Create PathFollow2D for this character
		# This node will follow the path and position the label
		var path_follow = PathFollow2D.new()
		path_follow.rotates = true  # Rotate label to follow path tangent
		path_follow.loop = true  # Enable looping so progress wraps smoothly

		# Create Label for the character
		var label = Label.new()
		label.text = character
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER

		# Apply font from export variable
		if font_file != "" and FileAccess.file_exists(font_file):
			var font = load(font_file)
			if font:
				label.add_theme_font_override("font", font)

		# Apply font size from export variable
		label.add_theme_font_size_override("font_size", font_size)

		# Apply text color from export variable
		label.add_theme_color_override("font_color", text_color)

		# Build hierarchy - must add to scene tree BEFORE setting progress_ratio
		path_follow.add_child(label)
		add_child(path_follow)
		character_nodes.append(path_follow)

		# Ensure labels also render on top
		label.z_index = render_z_index

		# Set position along path (must be done AFTER adding to scene tree)
		# wrapf ensures the value stays between 0.0 and 1.0
		path_follow.progress_ratio = wrapf(start_offset + (i * character_spacing), 0.0, 1.0)

## Starts the animation loop for all character nodes
## All characters move together around the path, maintaining their spacing
## The animation loops infinitely
func start_animation():
	# Kill any existing tween to prevent conflicts
	if tween:
		tween.kill()

	# Create a new looping tween
	tween = create_tween()
	tween.set_loops()  # Loop forever

	# Animate all characters together in parallel
	# Each character moves continuously, and PathFollow2D.loop handles wrapping
	for path_follow in character_nodes:
		var start_progress = path_follow.progress_ratio
		# Animate from current position to one full loop ahead (or behind for counter-clockwise)
		# The loop property ensures smooth wrapping at 1.0 -> 0.0 (or 0.0 -> 1.0)
		var end_progress = start_progress + 1.0 if clockwise else start_progress - 1.0
		tween.parallel().tween_property(path_follow, "progress_ratio", end_progress, animation_speed)

## Draws the path outline if draw_path is enabled
## This provides a visual reference for the oval path the text follows
func _draw():
	if not draw_path or curve == null:
		return

	# Sample points along the curve to draw it
	var points: PackedVector2Array = []
	var sample_count = 100  # Number of points to sample for smooth curve

	for i in range(sample_count + 1):
		var offset = (float(i) / sample_count) * curve.get_baked_length()
		points.append(curve.sample_baked(offset))

	# Draw the path as a polyline
	if points.size() > 1:
		draw_polyline(points, path_color, path_width, true)
