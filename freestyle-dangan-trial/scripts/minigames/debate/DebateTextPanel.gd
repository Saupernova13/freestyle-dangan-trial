class_name DebateTextPanel
extends Control

signal weak_point_hit(panel: DebateTextPanel)
signal panel_exited_screen(panel: DebateTextPanel)

var line_data: Dictionary = {}
var is_shootable: bool = false
var answer_bullet_id: String = ""
var use_negative_bullet: bool = false
var movement_direction: String = "left_to_right"
var character_id: String = ""
var has_spotlight: bool = false

var _panel: PanelContainer
var _rich_label: RichTextLabel
var _weak_point_area: Control
var _weak_point_rect: Rect2 = Rect2()
var _move_speed: float = 150.0
var _is_active: bool = true

const PANEL_HEIGHT: float = 50.0
const WEAK_POINT_COLOR: String = "#FF8800"
const NORMAL_TEXT_COLOR: String = "#FFFFFF"

func setup(data: Dictionary, speed_multiplier: float = 1.0):
	line_data = data
	is_shootable = data.get("isShootable", false)
	answer_bullet_id = data.get("answerBulletId", "")
	use_negative_bullet = data.get("useNegativeBullet", false)
	movement_direction = data.get("textMovementDirection", "left_to_right")
	character_id = data.get("characterId", "")
	has_spotlight = data.get("characterSpotlight", false)

	_move_speed = 150.0 * speed_multiplier

	_build_panel(data)

func _build_panel(data: Dictionary):
	_panel = PanelContainer.new()
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.1, 0.1, 0.2, 0.75)
	style.border_width_bottom = 1
	style.border_width_top = 1
	style.border_width_left = 1
	style.border_width_right = 1
	style.border_color = Color(0.3, 0.3, 0.5, 0.5)
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 6
	style.content_margin_bottom = 6
	_panel.add_theme_stylebox_override("panel", style)
	add_child(_panel)

	_rich_label = RichTextLabel.new()
	_rich_label.bbcode_enabled = true
	_rich_label.fit_content = true
	_rich_label.scroll_active = false
	_rich_label.add_theme_font_size_override("normal_font_size", 18)

	var sentence_begin = data.get("sentenceBeginning", "")
	var target = data.get("target", "")
	var sentence_end = data.get("sentenceEnd", "")

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

	_rich_label.text = bbcode
	_panel.add_child(_rich_label)

	custom_minimum_size.y = PANEL_HEIGHT
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _ready():
	var viewport_width = get_viewport_rect().size.x
	if movement_direction == "left_to_right":
		position.x = -400
	else:
		position.x = viewport_width + 50

func _process(delta):
	if not _is_active:
		return

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
