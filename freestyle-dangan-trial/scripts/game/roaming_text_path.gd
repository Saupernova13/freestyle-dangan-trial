extends Path2D
## Roaming background text: an oval path fitted to the viewport, with one
## roaming_char scene per character of the JSON-configured text. The count is
## data-driven, so characters are instanced rather than authored; look and orbit
## stay editable in scenes/ui/roaming_char.tscn. Only the curve is procedural,
## because it refits the live viewport.

## JSON file holding the configuration paths.
@export_file("*.json") var paths_config_file: String = "res://data/paths.json"

## Character spacing, as a fraction of total path length. Lower packs tighter.
@export_range(0.001, 0.2, 0.001) var character_spacing: float = 0.015

## Animate the text along the path.
@export var animate: bool = true

## Seconds per complete loop.
@export_range(1.0, 60.0, 0.1) var animation_speed: float = 20.0

## Left inset. Negative values expand past the viewport edge.
@export_range(-500.0, 500.0, 1.0) var padding_left: float = 185.0

## Right inset. Negative values expand past the viewport edge.
@export_range(-500.0, 500.0, 1.0) var padding_right: float = 275.0

## Top inset. Negative values expand past the viewport edge.
@export_range(-500.0, 500.0, 1.0) var padding_top: float = -50.0

## Bottom inset. Negative values expand past the viewport edge.
@export_range(-500.0, 500.0, 1.0) var padding_bottom: float = -200.0

## Rotate clockwise rather than counter-clockwise.
@export var clockwise: bool = false

## Start point on the path: 0 right, 0.25 bottom, 0.5 left, 0.75 top.
@export_range(0.0, 1.0, 0.01) var start_position: float = 0.25

## Render order; lower sits behind everything.
@export_range(-1000, 1000, 1) var render_z_index: int = -1000

## Draw the path outline, for debugging.
@export var draw_path: bool = false

## Color of the debug outline.
@export var path_color: Color = Color(1.0, 1.0, 1.0, 0.3)

## Width of the debug outline, in pixels.
@export_range(1.0, 10.0, 0.5) var path_width: float = 2.0

var character_nodes: Array[PathFollow2D] = []
var text_config_path: String = ""

func _ready():
	z_index = render_z_index
	load_paths_config()
	update_oval_path()
	get_viewport().size_changed.connect(update_oval_path)

	# The curve must be baked before characters can be placed on it.
	await get_tree().process_frame
	generate_curved_text()

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

## Runs on ready and on every viewport resize.
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

	# 0.551915 is the cubic-bezier handle length that best fits a quarter circle.
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

## Characters are spaced evenly along the curve, centred on start_position.
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
		var path_follow: PathFollow2D = ResourceRegistry.instantiate("roaming_char")
		# progress_ratio and the orbit clip only take effect once in the tree.
		add_child(path_follow)
		character_nodes.append(path_follow)
		var phase := wrapf(start_offset + (i * character_spacing), 0.0, 1.0)
		path_follow.setup(text[i], phase, animation_speed, clockwise, animate)

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
