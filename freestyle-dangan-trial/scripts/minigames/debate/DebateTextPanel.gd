class_name DebateTextPanel
extends Control

## A scrolling debate-statement panel. Scene-driven —
## see scenes/minigames/debate_text_panel.tscn.
## The scene supplies Panel + HBox + 3 RichTextLabels. The script handles
## per-instance configuration (text, styling, white-noise/main sizing,
## scrolling animation).

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

# Occurrence chance is not fixed. The session seed picks a probability somewhere
# within each effect's floor..ceiling, and every panel then rolls against that
# session probability — so one run may ramp/squash often, another rarely.
const RAMP_CHANCE_FLOOR: float = 0.25
const RAMP_CHANCE_CEIL: float = 0.90
const SQUASH_CHANCE_FLOOR: float = 0.20
const SQUASH_CHANCE_CEIL: float = 0.85

@onready var _prefix_label: RichTextLabel = %PrefixLabel
@onready var _weak_label: RichTextLabel = %WeakLabel
@onready var _suffix_label: RichTextLabel = %SuffixLabel

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

# Per-panel seeded variation (size, slant, ramp-in pacing, squash/stretch).
# All rolled from one GameRandom stream so a session seed reproduces it exactly.
var _elapsed: float = 0.0
var _start_x: float = 0.0
var _end_x: float = 0.0
var _travel_distance: float = 0.0
var _total_time: float = 0.0

var _size_scale: float = 1.0
var _slant_rad: float = 0.0
var _has_ramp: bool = false
var _ramp_power: float = 1.0
var _has_squash: bool = false
var _squash_amp: float = 0.0
var _squash_freq: float = 0.0
var _squash_phase: float = 0.0

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

	# Drive traversal by elapsed/total time so the ramp-in profile can redistribute
	# speed across the crossing without changing how long it takes (keeps voice sync).
	_start_x = position.x
	_travel_distance = _end_x - _start_x
	_total_time = abs(_travel_distance) / max(_move_speed, 1.0)

func _apply_setup():
	_setup_pending = false
	var data = _pending_setup_data
	line_data = data
	is_shootable = data.get("isShootable", false)
	var raw_bullet_id = data.get("answerBulletId", "")
	answer_bullet_id = raw_bullet_id if raw_bullet_id != null else ""
	use_negative_bullet = data.get("useNegativeBullet", false)
	movement_direction = data.get("textMovementDirection", "left_to_right")
	character_id = data.get("characterId", "")
	text_effect = data.get("textEffect", "normal")
	text_font = data.get("textFont", "default")
	is_white_noise = data.get("isWhiteNoise", false)

	_roll_variance()

	if _pending_audio_duration > 0.0:
		var viewport_width = get_viewport_rect().size.x
		var total_distance = viewport_width + 500.0
		_move_speed = total_distance / (_pending_audio_duration + VOICE_EXIT_BUFFER)
	else:
		_move_speed = 200.0 * _pending_speed_multiplier

	_apply_sizing()
	_rebuild_text()

# Roll all per-panel cosmetic variation from one seeded stream. The base size
# is the smallest case (_size_scale starts at 1.0) and only ever grows.
func _roll_variance():
	var rng := GameRandom.stream("debate_panel")

	# Session-stable chances: the seed sets how often each effect occurs this run
	# (a probability inside its floor..ceiling); each panel rolls against it below.
	var session := GameRandom.session_stream("debate_chances")
	var ramp_chance := session.randf_range(RAMP_CHANCE_FLOOR, RAMP_CHANCE_CEIL)
	var squash_chance := session.randf_range(SQUASH_CHANCE_FLOOR, SQUASH_CHANCE_CEIL)

	_size_scale = rng.randf_range(1.0, 1.55)
	_slant_rad = deg_to_rad(rng.randf_range(-18.0, 18.0))
	_has_ramp = rng.randf() < ramp_chance
	_ramp_power = rng.randf_range(1.6, 3.2)
	_has_squash = rng.randf() < squash_chance
	_squash_amp = rng.randf_range(0.03, 0.11)
	_squash_freq = rng.randf_range(1.5, 4.0)
	_squash_phase = rng.randf() * TAU

func _apply_sizing():
	var base_font = WHITE_NOISE_FONT_SIZE if is_white_noise else MAIN_FONT_SIZE
	var base_height = WHITE_NOISE_PANEL_HEIGHT if is_white_noise else MAIN_PANEL_HEIGHT
	var base_width = WHITE_NOISE_MIN_WIDTH if is_white_noise else MAIN_MIN_WIDTH

	var font_size = int(round(base_font * _size_scale))
	var panel_height = base_height * _size_scale
	var min_width = base_width * _size_scale

	# No panel background or border — the text reads directly over the scene,
	# so each label gets an outline to stay legible.
	for lbl in [_prefix_label, _weak_label, _suffix_label]:
		for size_key in ["normal_font_size", "bold_font_size", "italic_font_size", "bold_italic_font_size"]:
			lbl.add_theme_font_size_override(size_key, font_size)
		lbl.add_theme_color_override("font_outline_color", TEXT_OUTLINE_COLOR)
		lbl.add_theme_constant_override("outline_size", TEXT_OUTLINE_SIZE)

	custom_minimum_size = Vector2(min_width, panel_height)
	size = custom_minimum_size
	# Rotate / squash about the visual center, not the top-left corner.
	pivot_offset = size / 2.0
	rotation = _slant_rad

func _rebuild_text():
	if not _prefix_label or not _weak_label or not _suffix_label:
		return

	var raw_begin = line_data.get("sentenceBeginning", "")
	var sentence_begin: String = raw_begin if raw_begin != null else ""
	var raw_target = line_data.get("target", "")
	var target: String = raw_target if raw_target != null else ""
	var raw_end = line_data.get("sentenceEnd", "")
	var sentence_end: String = raw_end if raw_end != null else ""

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

func _apply_font_wrap(bbcode: String) -> String:
	match text_font:
		"bold":
			return "[b]%s[/b]" % bbcode
		"italic", "handwritten":
			return "[i]%s[/i]" % bbcode
		"glitch":
			return "[shake rate=15 level=3]%s[/shake]" % bbcode
	return bbcode

func _apply_effect_wrap(bbcode: String, preserve_color: bool = false) -> String:
	if preserve_color:
		match text_effect:
			"shake":
				return "[shake rate=10 level=5]%s[/shake]" % bbcode
		return bbcode

	match text_effect:
		"shake":
			return "[shake rate=10 level=5]%s[/shake]" % bbcode
		"glow":
			return "[rainbow freq=0.5 sat=0.3]%s[/rainbow]" % bbcode
	return bbcode

func has_answer() -> bool:
	return not answer_bullet_id.is_empty()

func set_shootable(value: bool):
	is_shootable = value
	_rebuild_text()

# Hit-test in the node's own space so the zone tracks the live scale (font size +
# squash) and rotation (slant) instead of an axis-aligned screen rect.
func _transform_has_point(node: Control, click_pos: Vector2) -> bool:
	var local = node.get_global_transform().affine_inverse() * click_pos
	return Rect2(Vector2.ZERO, node.size).has_point(local)

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
		return "weakpoint"
	if _suffix_label.visible and _transform_has_point(_suffix_label, click_pos):
		return "suffix"
	return ""

func _process(delta):
	if not _is_active:
		return

	_elapsed += delta

	if text_effect == "fade":
		_fade_timer += delta
		modulate.a = 0.5 + 0.5 * sin(_fade_timer * 3.0)

	# Mild, volume-preserving squash/stretch — x and y pulse in opposition.
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

	position.x = _start_x + _travel_distance * _ramp_remap(u)

# Remap normalised crossing time so the panel rushes in, lingers near centre to
# read, then accelerates out — while still mapping [0,1] -> [0,1] (same total time).
func _ramp_remap(u: float) -> float:
	if not _has_ramp:
		return u
	var s = 2.0 * u - 1.0
	return 0.5 + 0.5 * signf(s) * pow(absf(s), _ramp_power)

func check_hit(click_pos: Vector2) -> bool:
	return get_hit_zone(click_pos) != ""

func destroy_with_effect():
	_is_active = false
	var tween = create_tween()
	tween.set_parallel(true)
	tween.tween_property(self, "modulate:a", 0.0, 0.3)
	tween.tween_property(self, "scale", Vector2(1.5, 1.5), 0.3)
	tween.finished.connect(func(): queue_free())

func set_panel_active(active: bool):
	_is_active = active
