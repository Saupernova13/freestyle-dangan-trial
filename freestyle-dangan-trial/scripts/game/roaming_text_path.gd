extends Path2D
## Roaming background text: builds a viewport-fitting oval path and animates one
## PathFollow2D + Label per character around it. Character count is data-driven
## (from JSON), so the labels are generated in code rather than authored in a scene.

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
	z_index = render_z_index
	load_paths_config()
	update_oval_path()
	get_viewport().size_changed.connect(update_oval_path)

	# The curve must be baked before characters can be placed on it.
	await get_tree().process_frame
	generate_curved_text()

	if animate:
		start_animation()

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
		text_config_path = "res://data/curved_text.json"

## Rebuild the oval curve to fit the current viewport. Runs on ready and on
## every resize.
func update_oval_path():
	position = Vector2.ZERO
	var viewport_size = get_viewport_rect().size

	var left_edge = padding_left
	var right_edge = viewport_size.x - padding_right
	var top_edge = padding_top
	var bottom_edge = viewport_size.y - padding_bottom

	var center_x = (left_edge + right_edge) / 2
	var center_y = (top_edge + bottom_edge) / 2
	var radius_x = (right_edge - left_edge) / 2
	var radius_y = (bottom_edge - top_edge) / 2

	var new_curve = Curve2D.new()

	# 0.551915 is the cubic-bezier handle length that best approximates a quarter
	# circle; the four control points below trace the oval clockwise from the right.
	var handle_length = 0.551915

	new_curve.add_point(  # right (0.0)
		Vector2(center_x + radius_x, center_y),
		Vector2(0, -radius_y * handle_length),
		Vector2(0, radius_y * handle_length)
	)
	new_curve.add_point(  # bottom (0.25)
		Vector2(center_x, center_y + radius_y),
		Vector2(radius_x * handle_length, 0),
		Vector2(-radius_x * handle_length, 0)
	)
	new_curve.add_point(  # left (0.5)
		Vector2(center_x - radius_x, center_y),
		Vector2(0, radius_y * handle_length),
		Vector2(0, -radius_y * handle_length)
	)
	new_curve.add_point(  # top (0.75)
		Vector2(center_x, center_y - radius_y),
		Vector2(-radius_x * handle_length, 0),
		Vector2(radius_x * handle_length, 0)
	)
	new_curve.add_point(  # close back to right
		Vector2(center_x + radius_x, center_y),
		Vector2(0, -radius_y * handle_length),
		Vector2(0, radius_y * handle_length)
	)

	curve = new_curve
	queue_redraw()

## Rebuild one PathFollow2D + Label per character of the configured text, spaced
## evenly along the curve and centered on start_position.
func generate_curved_text():
	for node in character_nodes:
		node.queue_free()
	character_nodes.clear()

	if text_config_path == "":
		push_error("Text config path not set. Check paths.json file.")
		return

	var json_text = FileAccess.get_file_as_string(text_config_path)
	if json_text.is_empty():
		push_error("Failed to read JSON file: " + text_config_path)
		return

	var json = JSON.new()
	if json.parse(json_text) != OK:
		push_error("Failed to parse JSON file: " + text_config_path)
		return

	var data = json.data
	if not data.has("text"):
		push_error("JSON file missing 'text' field")
		return

	var text: String = data.text
	var char_count = text.length()

	var total_width = char_count * character_spacing
	var start_offset = start_position - (total_width / 2.0)

	for i in range(char_count):
		var path_follow = PathFollow2D.new()
		path_follow.rotates = true  # label follows the path tangent
		path_follow.loop = true

		var label = Label.new()
		label.text = text[i]
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER

		if font_file != "" and FileAccess.file_exists(font_file):
			var font = load(font_file)
			if font:
				label.add_theme_font_override("font", font)
		label.add_theme_font_size_override("font_size", font_size)
		label.add_theme_color_override("font_color", text_color)

		# progress_ratio only takes effect once the node is in the tree.
		path_follow.add_child(label)
		add_child(path_follow)
		character_nodes.append(path_follow)
		label.z_index = render_z_index
		path_follow.progress_ratio = wrapf(start_offset + (i * character_spacing), 0.0, 1.0)

## Animate every character one full loop around the path, forever. PathFollow2D.loop
## handles the 1.0<->0.0 wrap; sign picks rotation direction.
func start_animation():
	if tween:
		tween.kill()

	tween = create_tween()
	tween.set_loops()

	for path_follow in character_nodes:
		var start_progress = path_follow.progress_ratio
		var end_progress = start_progress + 1.0 if clockwise else start_progress - 1.0
		tween.parallel().tween_property(path_follow, "progress_ratio", end_progress, animation_speed)

func _draw():
	if not draw_path or curve == null:
		return

	var points: PackedVector2Array = []
	var sample_count = 100
	for i in range(sample_count + 1):
		var offset = (float(i) / sample_count) * curve.get_baked_length()
		points.append(curve.sample_baked(offset))

	if points.size() > 1:
		draw_polyline(points, path_color, path_width, true)
