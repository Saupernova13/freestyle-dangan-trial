class_name DebateTextPanel
extends Control

signal panel_exited_screen(panel: DebateTextPanel)

var line_data: Dictionary = {}
var is_shootable: bool = false
var answer_bullet_id: String = ""
var use_negative_bullet: bool = false
var movement_direction: String = "left_to_right"
var character_id: String = ""
var has_spotlight: bool = false
var text_effect: String = "normal"
var text_font: String = "default"

var _panel: PanelContainer
var _panel_style: StyleBoxFlat
var _hbox: HBoxContainer
var _prefix_label: RichTextLabel
var _weak_label: RichTextLabel
var _suffix_label: RichTextLabel
var _move_speed: float = 150.0
var _is_active: bool = true
var _fade_timer: float = 0.0
var is_white_noise: bool = false

const WEAK_POINT_COLOR: String = "#FF8800"
const NORMAL_TEXT_COLOR: String = "#FFFFFF"
const SHOOTABLE_BORDER_COLOR: Color = Color(1.0, 0.5, 0.0, 0.7)
const DEFAULT_BORDER_COLOR: Color = Color(0.3, 0.3, 0.5, 0.5)

const MAIN_FONT_SIZE: int = 20
const MAIN_PANEL_HEIGHT: float = 54.0
const MAIN_MIN_WIDTH: float = 350.0

const WHITE_NOISE_FONT_SIZE: int = 13
const WHITE_NOISE_PANEL_HEIGHT: float = 36.0
const WHITE_NOISE_MIN_WIDTH: float = 150.0

func setup(data: Dictionary, speed_multiplier: float = 1.0):
	line_data = data
	is_shootable = data.get("isShootable", false)
	var raw_bullet_id = data.get("answerBulletId", "")
	answer_bullet_id = raw_bullet_id if raw_bullet_id != null else ""
	use_negative_bullet = data.get("useNegativeBullet", false)
	movement_direction = data.get("textMovementDirection", "left_to_right")
	character_id = data.get("characterId", "")
	has_spotlight = data.get("characterSpotlight", false)
	text_effect = data.get("textEffect", "normal")
	text_font = data.get("textFont", "default")
	is_white_noise = data.get("isWhiteNoise", false)

	_move_speed = 200.0 * speed_multiplier
	_build_panel()

func _build_panel():
	_panel = PanelContainer.new()
	_panel_style = StyleBoxFlat.new()

	var font_size = WHITE_NOISE_FONT_SIZE if is_white_noise else MAIN_FONT_SIZE
	var panel_height = WHITE_NOISE_PANEL_HEIGHT if is_white_noise else MAIN_PANEL_HEIGHT
	var min_width = WHITE_NOISE_MIN_WIDTH if is_white_noise else MAIN_MIN_WIDTH
	var bg_alpha = 0.45 if is_white_noise else 0.75

	_panel_style.bg_color = Color(0.1, 0.1, 0.2, bg_alpha)
	_panel_style.border_width_bottom = 1
	_panel_style.border_width_top = 1
	_panel_style.border_width_left = 1
	_panel_style.border_width_right = 1
	_panel_style.border_color = SHOOTABLE_BORDER_COLOR if is_shootable else DEFAULT_BORDER_COLOR
	_panel_style.content_margin_left = 12
	_panel_style.content_margin_right = 12
	_panel_style.content_margin_top = 6
	_panel_style.content_margin_bottom = 6
	_panel.add_theme_stylebox_override("panel", _panel_style)
	add_child(_panel)

	_hbox = HBoxContainer.new()
	_hbox.add_theme_constant_override("separation", 0)
	_panel.add_child(_hbox)

	_prefix_label = _create_rich_label(font_size)
	_hbox.add_child(_prefix_label)

	_weak_label = _create_rich_label(font_size)
	_hbox.add_child(_weak_label)

	_suffix_label = _create_rich_label(font_size)
	_hbox.add_child(_suffix_label)

	_rebuild_text()

	custom_minimum_size = Vector2(min_width, panel_height)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _create_rich_label(font_size: int) -> RichTextLabel:
	var label = RichTextLabel.new()
	label.bbcode_enabled = true
	label.fit_content = true
	label.scroll_active = false
	label.autowrap_mode = TextServer.AUTOWRAP_OFF
	label.add_theme_font_size_override("normal_font_size", font_size)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return label

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
		if is_shootable:
			weak_bbcode = "[color=%s][b]%s[/b][/color]" % [WEAK_POINT_COLOR, target]
		else:
			weak_bbcode = "[color=%s]%s[/color]" % [NORMAL_TEXT_COLOR, target]
	weak_bbcode = _apply_font_wrap(weak_bbcode)
	weak_bbcode = _apply_effect_wrap(weak_bbcode)
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

func _apply_effect_wrap(bbcode: String) -> String:
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
	if _panel_style:
		_panel_style.border_color = SHOOTABLE_BORDER_COLOR if is_shootable else DEFAULT_BORDER_COLOR
	_rebuild_text()

func get_hit_zone(click_pos: Vector2) -> String:
	if not _is_active:
		return ""
	if is_white_noise:
		if Rect2(global_position, size).has_point(click_pos):
			return "white_noise"
		return ""
	if _prefix_label.visible and Rect2(_prefix_label.global_position, _prefix_label.size).has_point(click_pos):
		return "prefix"
	if _weak_label.visible and Rect2(_weak_label.global_position, _weak_label.size).has_point(click_pos):
		return "weakpoint"
	if _suffix_label.visible and Rect2(_suffix_label.global_position, _suffix_label.size).has_point(click_pos):
		return "suffix"
	return ""

func _ready():
	var viewport_width = get_viewport_rect().size.x
	if movement_direction == "left_to_right":
		position.x = -400
	else:
		position.x = viewport_width + 50

func _process(delta):
	if not _is_active:
		return

	if text_effect == "fade":
		_fade_timer += delta
		modulate.a = 0.5 + 0.5 * sin(_fade_timer * 3.0)

	var viewport_width = get_viewport_rect().size.x

	if movement_direction == "left_to_right":
		position.x += _move_speed * delta
		if position.x > viewport_width + 100:
			_is_active = false
			panel_exited_screen.emit(self)
	else:
		position.x -= _move_speed * delta
		if position.x < -500:
			_is_active = false
			panel_exited_screen.emit(self)

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
