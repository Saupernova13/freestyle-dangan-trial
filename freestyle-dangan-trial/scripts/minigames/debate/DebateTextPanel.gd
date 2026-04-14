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
var _rich_label: RichTextLabel
var _move_speed: float = 150.0
var _is_active: bool = true
var _fade_timer: float = 0.0

const PANEL_HEIGHT: float = 50.0
const WEAK_POINT_COLOR: String = "#FF8800"
const NORMAL_TEXT_COLOR: String = "#FFFFFF"
const SHOOTABLE_BORDER_COLOR: Color = Color(1.0, 0.5, 0.0, 0.7)
const DEFAULT_BORDER_COLOR: Color = Color(0.3, 0.3, 0.5, 0.5)

func setup(data: Dictionary, speed_multiplier: float = 1.0):
	line_data = data
	is_shootable = data.get("isShootable", false)
	answer_bullet_id = data.get("answerBulletId", "")
	use_negative_bullet = data.get("useNegativeBullet", false)
	movement_direction = data.get("textMovementDirection", "left_to_right")
	character_id = data.get("characterId", "")
	has_spotlight = data.get("characterSpotlight", false)
	text_effect = data.get("textEffect", "normal")
	text_font = data.get("textFont", "default")

	_move_speed = 150.0 * speed_multiplier
	_build_panel()

func _build_panel():
	_panel = PanelContainer.new()
	_panel_style = StyleBoxFlat.new()
	_panel_style.bg_color = Color(0.1, 0.1, 0.2, 0.75)
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

	_rich_label = RichTextLabel.new()
	_rich_label.bbcode_enabled = true
	_rich_label.fit_content = true
	_rich_label.scroll_active = false
	_rich_label.add_theme_font_size_override("normal_font_size", 18)
	_panel.add_child(_rich_label)

	_rebuild_bbcode()

	custom_minimum_size.y = PANEL_HEIGHT
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _rebuild_bbcode():
	if not _rich_label:
		return

	var sentence_begin = line_data.get("sentenceBeginning", "")
	var target = line_data.get("target", "")
	var sentence_end = line_data.get("sentenceEnd", "")

	var bbcode = ""
	if not sentence_begin.is_empty():
		bbcode += "[color=%s]%s[/color]" % [NORMAL_TEXT_COLOR, sentence_begin]

	if not target.is_empty():
		if is_shootable:
			bbcode += "[color=%s][b]%s[/b][/color]" % [WEAK_POINT_COLOR, target]
		else:
			bbcode += "[color=%s]%s[/color]" % [NORMAL_TEXT_COLOR, target]

	if not sentence_end.is_empty():
		bbcode += "[color=%s]%s[/color]" % [NORMAL_TEXT_COLOR, sentence_end]

	bbcode = _apply_font_wrap(bbcode)
	bbcode = _apply_effect_wrap(bbcode)

	_rich_label.text = bbcode

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
	_rebuild_bbcode()

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
	if not is_shootable or not _is_active:
		return false

	var panel_rect = Rect2(global_position, _panel.size if _panel else Vector2(200, 50))
	return panel_rect.has_point(click_pos)

func get_weak_point_rect() -> Rect2:
	return Rect2(global_position, _panel.size if _panel else Vector2.ZERO)

func destroy_with_effect():
	_is_active = false
	var tween = create_tween()
	tween.set_parallel(true)
	tween.tween_property(self, "modulate:a", 0.0, 0.3)
	tween.tween_property(self, "scale", Vector2(1.5, 1.5), 0.3)
	tween.finished.connect(func(): queue_free())

func set_panel_active(active: bool):
	_is_active = active
