class_name DebateTextPanel
extends Control
## A scrolling debate-statement panel. The scene supplies the labels; this
## script configures and animates them per instance.

signal panel_exited_screen(panel: DebateTextPanel)

const WEAK_POINT_COLOR: String = "#FFFF00"
const NORMAL_TEXT_COLOR: String = "#FFFFFF"
const TEXT_OUTLINE_COLOR: Color = Color(0, 0, 0, 0.9)
const TEXT_OUTLINE_SIZE: int = 6

const MAIN_FONT_SIZE: int = 42
const MAIN_PANEL_HEIGHT: float = 84.0
const MAIN_MIN_WIDTH: float = 350.0

const WHITE_NOISE_FONT_SIZE: int = 22
const WHITE_NOISE_PANEL_HEIGHT: float = 44.0
const WHITE_NOISE_MIN_WIDTH: float = 150.0

const VOICE_EXIT_BUFFER: float = 0.5

# One probability per effect is drawn per session; every panel rolls against it.
const RAMP_CHANCE_FLOOR: float = 0.25
const RAMP_CHANCE_CEIL: float = 0.90
const SQUASH_CHANCE_FLOOR: float = 0.20
const SQUASH_CHANCE_CEIL: float = 0.85

# Ramped panels rush in, ease through the middle, accelerate out. RAMP_MIN_SPEED
# keeps them moving at centre, where the eased curve would stop dead.
const RAMP_POWER_FLOOR: float = 1.4
const RAMP_POWER_CEIL: float = 2.2
const RAMP_MIN_SPEED: float = 0.35

# --- Depth / parallax -------------------------------------------------------
# _depth runs [0,1], far to near: drives size, opacity, draw order and extrusion.
const DEPTH_SIZE_FAR: float = 0.95
const DEPTH_SIZE_NEAR: float = 1.55
const DEPTH_ALPHA_FAR: float = 0.55
const DEPTH_Z_FAR: int = -8
const DEPTH_Z_NEAR: int = 8
const NOISE_DEPTH_SPEED_FAR: float = 0.7  # far noise drifts slower (parallax)

# --- Faux extrusion + bevel -------------------------------------------------
# Dimmed copies stack behind the front face along EXTRUDE_DIR, so glyphs read as
# solid blocks with a shaded side.
const EXTRUDE_DIR: Vector2 = Vector2(1.0, 1.2)  # local light/extrude direction
const EXTRUDE_LAYERS_FAR: float = 2.0
const EXTRUDE_LAYERS_NEAR: float = 4.0          # must be <= shadow layers in scene
const EXTRUDE_STEP_FAR: float = 1.5             # px between layers when far
const EXTRUDE_STEP_NEAR: float = 3.0            # px between layers when near
const EXTRUDE_SHADE_TOP: float = 0.40           # closest layer brightness
const EXTRUDE_SHADE_DEEP: float = 0.10          # deepest layer brightness
const BEVEL_HIGHLIGHT_COLOR: Color = Color(1, 1, 1, 0.45)
const BEVEL_HIGHLIGHT_OFFSET: int = -3

@onready var _prefix_label: RichTextLabel = %PrefixLabel
@onready var _weak_label: RichTextLabel = %WeakLabel
@onready var _suffix_label: RichTextLabel = %SuffixLabel
@onready var _shadow_root: Control = %ShadowLayers

# One [prefix, weak, suffix] trio per extrusion layer, closest first; the scene
# decides the count.
var _shadow_sets: Array = []

var line_data: Dictionary = {}
var is_shootable: bool = false
var answer_bullet_id: String = ""
var use_negative_bullet: bool = false
var movement_direction: String = "left_to_right"
var character_id: String = ""
var text_effect: String = "normal"
var text_font: String = "default"
var is_white_noise: bool = false

var _move_speed: float = 150.0
var _is_active: bool = true
var _fade_timer: float = 0.0
var _pending_setup_data: Dictionary
var _pending_speed_multiplier: float = 1.0
var _pending_audio_duration: float = -1.0
var _setup_pending: bool = false

# Traversal state, derived in _ready() from the viewport and _move_speed.
var _elapsed: float = 0.0
var _start_pos: Vector2 = Vector2.ZERO
var _end_x: float = 0.0
var _travel_distance: float = 0.0
var _total_time: float = 0.0

# Per-panel variation, rolled from one GameRandom stream so a seed reproduces it.
var _size_scale: float = 1.0
var _slant_rad: float = 0.0
var _depth: float = 1.0
var _base_alpha: float = 1.0
var _has_ramp: bool = false
var _ramp_power: float = 1.0
var _has_squash: bool = false
var _squash_amp: float = 0.0
var _squash_freq: float = 0.0
var _squash_phase: float = 0.0

## Callable before or after the node enters the tree: the data is held until
## _ready() if it is not there yet. Both callers deliberately call this BEFORE
## add_child(), because _ready() computes _total_time from _move_speed, which
## _apply_setup() assigns - call it after and the crossing time is banked at
## the 150.0 default and voice sync silently drifts.
func setup(data: Dictionary, speed_multiplier: float = 1.0, audio_duration: float = -1.0):
	_pending_setup_data = data
	_pending_speed_multiplier = speed_multiplier
	_pending_audio_duration = audio_duration
	_setup_pending = true
	if is_node_ready():
		_apply_setup()

func _ready():
	if _setup_pending:
		_apply_setup()
	var viewport_width = get_viewport_rect().size.x
	if movement_direction == "left_to_right":
		position.x = -400
		_end_x = viewport_width + 100.0
	else:
		position.x = viewport_width + 50
		_end_x = -500.0

	# Traversal runs on elapsed/total time, so a ramp redistributes speed without
	# changing the crossing duration that voice sync depends on.
	_start_pos = position
	_travel_distance = _end_x - _start_pos.x
	_total_time = abs(_travel_distance) / max(_move_speed, 1.0)

func _apply_setup():
	_setup_pending = false
	var data = _pending_setup_data
	line_data = data
	# Defaults to false to match the editor, which sets isShootable exactly when
	# a line is given an answerBulletId and always writes the field.
	#
	# Every field is coerced: a number where a String belongs used to pass the
	# `!= null` guard and then fail the typed assignment, aborting _apply_setup()
	# partway. The panel still scrolled and still answered check_hit(), so a
	# shot at a blank panel was scored against a bullet id that was never set.
	is_shootable = JsonRead.bool_of(data.get("isShootable"))
	answer_bullet_id = JsonRead.str_of(data.get("answerBulletId"))
	use_negative_bullet = JsonRead.bool_of(data.get("useNegativeBullet"))
	movement_direction = JsonRead.str_of(data.get("textMovementDirection"), "left_to_right")
	character_id = JsonRead.str_of(data.get("characterId"))
	text_effect = JsonRead.str_of(data.get("textEffect"), "normal")
	text_font = JsonRead.str_of(data.get("textFont"), "default")
	is_white_noise = JsonRead.bool_of(data.get("isWhiteNoise"))

	_roll_variance()

	if _pending_audio_duration > 0.0:
		# Voice-synced lines keep their exact crossing time.
		var viewport_width = get_viewport_rect().size.x
		var total_distance = viewport_width + 500.0
		_move_speed = total_distance / (_pending_audio_duration + VOICE_EXIT_BUFFER)
	else:
		_move_speed = 200.0 * _pending_speed_multiplier
		# Parallax: chatter drifts slower the farther back it sits.
		if is_white_noise:
			_move_speed *= lerp(NOISE_DEPTH_SPEED_FAR, 1.0, _depth)

	_apply_sizing()
	_rebuild_text()

func _roll_variance():
	var rng := GameRandom.stream("debate_panel")

	# Fixed for the whole run, unlike the per-panel rolls below.
	var session := GameRandom.session_stream("debate_chances")
	var ramp_chance := session.randf_range(RAMP_CHANCE_FLOOR, RAMP_CHANCE_CEIL)
	var squash_chance := session.randf_range(SQUASH_CHANCE_FLOOR, SQUASH_CHANCE_CEIL)

	if is_white_noise:
		_depth = rng.randf_range(0.0, 0.55)
	else:
		_depth = rng.randf_range(0.45, 1.0)
	_size_scale = lerp(DEPTH_SIZE_FAR, DEPTH_SIZE_NEAR, _depth)
	_slant_rad = deg_to_rad(rng.randf_range(-18.0, 18.0))
	_has_ramp = rng.randf() < ramp_chance
	_ramp_power = rng.randf_range(RAMP_POWER_FLOOR, RAMP_POWER_CEIL)
	_has_squash = rng.randf() < squash_chance
	_squash_amp = rng.randf_range(0.03, 0.11)
	_squash_freq = rng.randf_range(1.5, 4.0)
	_squash_phase = rng.randf() * TAU

func _gather_shadows():
	if not _shadow_sets.is_empty() or not _shadow_root:
		return
	for hbox in _shadow_root.get_children():
		var labels: Array = []
		for child in hbox.get_children():
			if child is RichTextLabel:
				labels.append(child)
		if labels.size() == 3:
			_shadow_sets.append(labels)

func _apply_sizing():
	_gather_shadows()

	var base_font = WHITE_NOISE_FONT_SIZE if is_white_noise else MAIN_FONT_SIZE
	var base_height = WHITE_NOISE_PANEL_HEIGHT if is_white_noise else MAIN_PANEL_HEIGHT
	var base_width = WHITE_NOISE_MIN_WIDTH if is_white_noise else MAIN_MIN_WIDTH

	var font_size = int(round(base_font * _size_scale))
	var panel_height = base_height * _size_scale
	var min_width = base_width * _size_scale

	# Identical glyph metrics on every layer, or the copies stop registering.
	for lbl in _all_labels():
		for size_key in [
			"normal_font_size",
			"bold_font_size",
			"italics_font_size",
			"bold_italics_font_size",
			"mono_font_size",
		]:
			lbl.add_theme_font_size_override(size_key, font_size)

	# No panel sits behind the text, so the front face carries its own outline.
	for lbl in [_prefix_label, _weak_label, _suffix_label]:
		lbl.add_theme_color_override("font_outline_color", TEXT_OUTLINE_COLOR)
		lbl.add_theme_constant_override("outline_size", TEXT_OUTLINE_SIZE)
		lbl.add_theme_color_override("font_shadow_color", BEVEL_HIGHLIGHT_COLOR)
		lbl.add_theme_constant_override("shadow_offset_x", BEVEL_HIGHLIGHT_OFFSET)
		lbl.add_theme_constant_override("shadow_offset_y", BEVEL_HIGHLIGHT_OFFSET)
		lbl.add_theme_constant_override("shadow_outline_size", 0)

	custom_minimum_size = Vector2(min_width, panel_height)
	size = custom_minimum_size
	# Rotate and squash about the centre, not the top-left corner.
	pivot_offset = size / 2.0
	rotation = _slant_rad

	_apply_depth()

func _all_labels() -> Array:
	var labels: Array = [_prefix_label, _weak_label, _suffix_label]
	for layer in _shadow_sets:
		labels.append_array(layer)
	return labels

# The layers are children, so EXTRUDE_DIR follows the slant.
func _apply_depth():
	z_index = int(round(lerp(float(DEPTH_Z_FAR), float(DEPTH_Z_NEAR), _depth)))
	_base_alpha = lerp(DEPTH_ALPHA_FAR, 1.0, _depth)
	modulate.a = _base_alpha

	var step = lerp(EXTRUDE_STEP_FAR, EXTRUDE_STEP_NEAR, _depth)
	var visible_layers = int(round(lerp(EXTRUDE_LAYERS_FAR, EXTRUDE_LAYERS_NEAR, _depth)))
	var dir = EXTRUDE_DIR.normalized()
	for i in _shadow_sets.size():
		var hbox: Control = _shadow_sets[i][0].get_parent()
		if i < visible_layers:
			hbox.visible = true
			hbox.position = dir * step * float(i + 1)
			# Brightest at the front, darkest at the back.
			var t = float(i + 1) / float(maxi(visible_layers, 1))
			var shade = lerp(EXTRUDE_SHADE_TOP, EXTRUDE_SHADE_DEEP, t)
			hbox.modulate = Color(shade, shade, shade, 1.0)
		else:
			hbox.visible = false

func _rebuild_text():
	if not _prefix_label or not _weak_label or not _suffix_label:
		return
	_gather_shadows()

	var sentence_begin := JsonRead.str_of(line_data.get("sentenceBeginning"))
	var target := JsonRead.str_of(line_data.get("target"))
	var sentence_end := JsonRead.str_of(line_data.get("sentenceEnd"))

	var has_weak = not target.is_empty()

	var prefix_text = sentence_begin
	if has_weak and not sentence_begin.is_empty() and not sentence_begin.ends_with(" "):
		prefix_text += " "
	var prefix_bbcode = ""
	if not prefix_text.is_empty():
		prefix_bbcode = "[color=%s]%s[/color]" % [NORMAL_TEXT_COLOR, prefix_text]
	prefix_bbcode = _apply_font_wrap(prefix_bbcode)
	prefix_bbcode = _apply_effect_wrap(prefix_bbcode)
	_prefix_label.text = prefix_bbcode

	var weak_bbcode = ""
	if has_weak:
		weak_bbcode = "[color=%s][b]%s[/b][/color]" % [WEAK_POINT_COLOR, target]
	weak_bbcode = _apply_font_wrap(weak_bbcode)
	weak_bbcode = _apply_effect_wrap(weak_bbcode, true)
	_weak_label.text = weak_bbcode
	_weak_label.visible = has_weak

	var suffix_text = sentence_end
	if has_weak and not sentence_end.is_empty() and not sentence_end.begins_with(" "):
		suffix_text = " " + suffix_text
	var suffix_bbcode = ""
	if not suffix_text.is_empty():
		suffix_bbcode = "[color=%s]%s[/color]" % [NORMAL_TEXT_COLOR, suffix_text]
	suffix_bbcode = _apply_font_wrap(suffix_bbcode)
	suffix_bbcode = _apply_effect_wrap(suffix_bbcode)
	_suffix_label.text = suffix_bbcode

	# _apply_depth's modulate flattens the copies.
	for layer in _shadow_sets:
		layer[0].text = prefix_bbcode
		layer[1].text = weak_bbcode
		layer[1].visible = has_weak
		layer[2].text = suffix_bbcode

func _apply_font_wrap(bbcode: String) -> String:
	match text_font:
		"bold":
			return "[b]%s[/b]" % bbcode
		"italic", "handwritten":
			return "[i]%s[/i]" % bbcode
		"monospace":
			return "[code]%s[/code]" % bbcode
		"glitch":
			return "[shake rate=15 level=3]%s[/shake]" % bbcode
	return bbcode

func _apply_effect_wrap(bbcode: String, preserve_color: bool = false) -> String:
	if preserve_color:
		match text_effect:
			"shake":
				return "[shake rate=10 level=5]%s[/shake]" % bbcode
			"wave":
				return "[wave amp=24 freq=4]%s[/wave]" % bbcode
		return bbcode

	match text_effect:
		"shake":
			return "[shake rate=10 level=5]%s[/shake]" % bbcode
		"wave":
			return "[wave amp=24 freq=4]%s[/wave]" % bbcode
		"glow":
			return "[rainbow freq=0.5 sat=0.3]%s[/rainbow]" % bbcode
	return bbcode

func has_answer() -> bool:
	return not answer_bullet_id.is_empty()

func set_shootable(value: bool):
	is_shootable = value
	_rebuild_text()

# Node space, so the hit zone follows the live scale and slant.
func _transform_has_point(node: Control, click_pos: Vector2) -> bool:
	var local = node.get_global_transform().affine_inverse() * click_pos
	return Rect2(Vector2.ZERO, node.size).has_point(local)

## Returns "", "white_noise", "prefix", "weakpoint", "suffix", or "inert" - the
## last being a weak point on a line the author marked isShootable: false.
func get_hit_zone(click_pos: Vector2) -> String:
	if not _is_active:
		return ""
	if is_white_noise:
		if _transform_has_point(self, click_pos):
			return "white_noise"
		return ""
	if _prefix_label.visible and _transform_has_point(_prefix_label, click_pos):
		return "prefix"
	if _weak_label.visible and _transform_has_point(_weak_label, click_pos):
		# isShootable gates the weak point and nothing else. White noise is a
		# separate mechanic keyed off isWhiteNoise, and a decoy's highlighted
		# text is still text - hitting it is a mis-shot, not a non-event.
		return "weakpoint" if is_shootable else "inert"
	if _suffix_label.visible and _transform_has_point(_suffix_label, click_pos):
		return "suffix"
	return ""

func _process(delta):
	if not _is_active:
		return

	_elapsed += delta

	if text_effect == "fade":
		_fade_timer += delta
		# Pulses around the depth alpha, so far panels stay dimmer.
		modulate.a = _base_alpha * (0.5 + 0.5 * sin(_fade_timer * 3.0))

	# x and y pulse in opposition, so the panel keeps its area.
	if _has_squash:
		var q = sin(_elapsed * _squash_freq + _squash_phase) * _squash_amp
		scale = Vector2(1.0 + q, 1.0 - q)

	if _total_time <= 0.0:
		return

	var u = _elapsed / _total_time
	if u >= 1.0:
		position.x = _end_x
		_is_active = false
		panel_exited_screen.emit(self)
		return

	var movement_distance = _travel_distance * _ramp_remap(u)
	var movement_dir = Vector2(cos(_slant_rad), sin(_slant_rad))
	position = _start_pos + movement_dir * movement_distance

# Redistributes crossing time without changing it: still maps [0,1] -> [0,1].
func _ramp_remap(u: float) -> float:
	if not _has_ramp:
		return u
	var s = 2.0 * u - 1.0
	var eased = 0.5 + 0.5 * signf(s) * pow(absf(s), _ramp_power)
	return lerp(eased, u, RAMP_MIN_SPEED)

func check_hit(click_pos: Vector2) -> bool:
	return get_hit_zone(click_pos) != ""

func destroy_with_effect():
	_is_active = false
	var anim: AnimationPlayer = %AnimationPlayer
	anim.play("destroy")
	await anim.animation_finished
	queue_free()

func set_panel_active(active: bool):
	_is_active = active
