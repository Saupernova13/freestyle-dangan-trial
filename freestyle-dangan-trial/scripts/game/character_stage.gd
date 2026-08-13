class_name CharacterStage
extends RefCounted
## The 3D bench sprites: fills each bench quad, swaps sprites, and answers
## id<->bench lookups. Owns nothing visual of its own; it drives the
## MeshInstance3D nodes already under `trial_posts`.

const BENCH_COUNT := 17
const MONOKUMA_BENCH := 16  # 0-based; its marker has a distinct name

var _trial_posts: Node3D

# Keyed both by character id (what script lines reference) and by bench index
# (what the camera and navigation reference), from one insert point.
# The cast is sparse — empty seats, failed loads, the Monokuma seat — so a
# dense Array indexed by bench drifts out of step with load order, which once
# put lines under the previous speaker.
var _by_id: Dictionary = {}
var _by_bench: Dictionary = {}

func _init(trial_posts: Node3D) -> void:
	_trial_posts = trial_posts

## Benches are filled in the order the trial lists character ids.
func populate(character_ids: Array) -> void:
	if character_ids.size() != BENCH_COUNT:
		push_warning("Expected %d characters, got %d" % [BENCH_COUNT, character_ids.size()])

	for bench_index in range(BENCH_COUNT):
		var character_id: String = ""
		if bench_index < character_ids.size() and character_ids[bench_index] is String:
			character_id = character_ids[bench_index]

		if character_id.is_empty() or character_id == "null":
			Log.debug("CharacterStage", "No character at bench %d" % bench_index)
			continue
		_populate_bench(bench_index, character_id)

func _populate_bench(bench_index: int, character_id: String) -> void:
	var mesh_instance := _mesh_for_bench(bench_index, true)
	if not mesh_instance:
		return

	var char_data := TrialLoader.load_character(character_id)
	if char_data.is_empty():
		push_warning("Character data not found for ID: ", character_id)
		return

	char_data["_bench_index"] = bench_index
	_by_id[character_id] = char_data
	_by_bench[bench_index] = char_data

	var texture := TrialLoader.get_sprite_texture(character_id, 1)
	if not texture:
		push_warning("Sprite not found for character: ", char_data.get("name", character_id))
		return

	mesh_instance.material_override = _make_sprite_material(texture)
	_fit_quad_to_texture(mesh_instance, texture)
	_ensure_black_backplane(mesh_instance)
	Log.debug("CharacterStage", "Loaded character: %s at bench %d" % [char_data.get("name", ""), bench_index])

## Used for emotion changes mid-line.
func update_sprite(bench_index: int, character_id: String, sprite_index: int) -> void:
	var texture := TrialLoader.get_sprite_texture(character_id, sprite_index)
	if not texture:
		return
	var mesh_instance := _mesh_for_bench(bench_index, false)
	if not mesh_instance:
		return

	if mesh_instance.material_override:
		mesh_instance.material_override.albedo_texture = texture
	else:
		mesh_instance.material_override = _make_sprite_material(texture)
	_fit_quad_to_texture(mesh_instance, texture)
	_ensure_black_backplane(mesh_instance)

func find_bench(character_id: String) -> int:
	return int(_by_id.get(character_id, {}).get("_bench_index", -1))

func character_at_bench(bench_index: int) -> Dictionary:
	return _by_bench.get(bench_index, {})

func _mesh_for_bench(bench_index: int, warn: bool) -> MeshInstance3D:
	var position := bench_index + 1
	var marker_name := "Bench_Marker3D_%03d" % position
	if bench_index == MONOKUMA_BENCH:
		marker_name = "Bench_Marker3D_017_Monokuma"

	var marker = _trial_posts.get_node_or_null(marker_name)
	if not marker:
		if warn:
			push_warning("Marker not found: ", marker_name)
		return null

	var mesh_name := "MeshInstance3D_Char_%03d" % position
	var mesh_instance = marker.get_node_or_null(mesh_name)
	if not mesh_instance:
		if warn:
			push_warning("MeshInstance3D not found: ", mesh_name)
		return null
	return mesh_instance

func _make_sprite_material(texture: Texture2D) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_texture = texture
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.cull_mode = BaseMaterial3D.CULL_BACK
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	return material

func _ensure_black_backplane(mesh_instance: MeshInstance3D) -> void:
	if mesh_instance.get_node_or_null("BackPlane"):
		return
	var back := MeshInstance3D.new()
	back.name = "BackPlane"
	back.mesh = mesh_instance.mesh
	back.rotation_degrees.y = 180.0
	var black_mat := StandardMaterial3D.new()
	black_mat.albedo_color = Color.BLACK
	black_mat.cull_mode = BaseMaterial3D.CULL_BACK
	black_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	back.material_override = black_mat
	mesh_instance.add_child(back)

## Keeps the texture's native aspect instead of stretching it to the bench
## quad. Each bench bakes its own non-uniform scale into its transform, so the
## plane needs its own QuadMesh — never the shared bench mesh. The backplane
## holds that QuadMesh by reference and tracks resizes for free.
func _fit_quad_to_texture(mesh_instance: MeshInstance3D, texture: Texture2D) -> void:
	if not texture:
		return
	var tex_w := float(texture.get_width())
	var tex_h := float(texture.get_height())
	if tex_w <= 0.0 or tex_h <= 0.0:
		return

	var quad: QuadMesh
	if mesh_instance.has_meta("own_quad"):
		quad = mesh_instance.mesh as QuadMesh
	if not quad:
		quad = QuadMesh.new()
		mesh_instance.mesh = quad
		mesh_instance.set_meta("own_quad", true)

	# Hold world height (size.y * sy) and solve width, so the on-screen quad
	# satisfies (size.x * sx) / (size.y * sy) == tex_w / tex_h.
	var node_scale := mesh_instance.transform.basis.get_scale()
	var sx := maxf(absf(node_scale.x), 0.0001)
	var sy := maxf(absf(node_scale.y), 0.0001)
	quad.size = Vector2((tex_w / tex_h) * sy / sx, 1.0)
