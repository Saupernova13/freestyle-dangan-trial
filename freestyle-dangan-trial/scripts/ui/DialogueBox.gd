extends Node

var _rich_label: RichTextLabel
var _name_label: Label
var _portrait_rect: TextureRect

var _typewriter_speed: float = 30.0
var _typewriter_timer: float = 0.0
var _target_visible_chars: int = 0
var _is_typing: bool = false
var _blip_counter: int = 0

enum TextSpeed { SLOW, NORMAL, FAST, INSTANT }
var text_speed: TextSpeed = TextSpeed.NORMAL

func setup(rich_label: RichTextLabel, name_label: Label = null, portrait_rect: TextureRect = null):
	_rich_label = rich_label
	_name_label = name_label
	_portrait_rect = portrait_rect

	if _rich_label:
		_rich_label.bbcode_enabled = true

func display_speaking_line(line: Dictionary):
	if not _rich_label:
		return

	var dialogue_text = line.get("dialogue", "")
	var highlights = line.get("highlights", [])
	var box_style = line.get("dialogueBoxStyle", {})

	var bbcode = _apply_highlights(dialogue_text, highlights)
	_rich_label.text = bbcode

	_apply_box_style(box_style)
	_start_typewriter()

func display_narrator_line(line: Dictionary):
	if not _rich_label:
		return

	var text = line.get("text", line.get("dialogue", ""))
	_rich_label.text = "[center][color=#AABBCC]" + text + "[/color][/center]"

	if _name_label:
		_name_label.text = ""

	_start_typewriter()

func _apply_highlights(text: String, highlights: Array) -> String:
	if highlights.is_empty():
		return text

	var sorted = highlights.duplicate()
	sorted.sort_custom(func(a, b): return a.get("startIndex", 0) > b.get("startIndex", 0))

	var result = text
	for h in sorted:
		var start_idx = int(h.get("startIndex", 0))
		var end_idx = int(h.get("endIndex", 0))
		var color = h.get("color", "#FFFF00")

		if start_idx >= 0 and end_idx > start_idx and end_idx <= result.length():
			var before = result.substr(0, start_idx)
			var highlighted = result.substr(start_idx, end_idx - start_idx)
			var after = result.substr(end_idx)
			result = before + "[color=" + color + "][b]" + highlighted + "[/b][/color]" + after

	return result

func _apply_box_style(style: Dictionary):
	if style.is_empty():
		return

	var panel = _rich_label.get_parent()
	if not panel or not panel is PanelContainer:
		return

	var stylebox = panel.get_theme_stylebox("panel")
	if stylebox and stylebox is StyleBoxFlat:
		var border_color_str = style.get("borderColor", "")
		if not border_color_str.is_empty():
			stylebox.border_color = Color.from_string(border_color_str, Color.WHITE)

		var bg_opacity = style.get("bgOpacity", -1.0)
		if bg_opacity >= 0:
			stylebox.bg_color.a = bg_opacity

		var border_thickness = int(style.get("borderThickness", -1))
		if border_thickness >= 0:
			stylebox.border_width_top = border_thickness
			stylebox.border_width_bottom = border_thickness
			stylebox.border_width_left = border_thickness
			stylebox.border_width_right = border_thickness

func _start_typewriter():
	if not _rich_label:
		return

	_typewriter_speed = Settings.get_typewriter_speed()
	if _typewriter_speed >= 999.0:
		_rich_label.visible_characters = -1
		ScriptDirector.notify_typewriter_finished()
		return

	_rich_label.visible_characters = 0
	_target_visible_chars = _rich_label.get_total_character_count()
	_typewriter_timer = 0.0
	_blip_counter = 0
	_is_typing = true
	ScriptDirector.notify_typewriter_started()

func skip_typewriter():
	if _is_typing and _rich_label:
		_rich_label.visible_characters = -1
		_is_typing = false
		ScriptDirector.notify_typewriter_finished()

func is_typing() -> bool:
	return _is_typing

func _process(delta):
	if not _is_typing or not _rich_label:
		return

	_typewriter_timer += delta
	var chars_to_show = int(_typewriter_timer * _typewriter_speed)

	if chars_to_show > _rich_label.visible_characters:
		_rich_label.visible_characters = min(chars_to_show, _target_visible_chars)

		_blip_counter += 1
		if _blip_counter % 3 == 0:
			AudioManager.play_sfx("text_blip")

	if _rich_label.visible_characters >= _target_visible_chars:
		_rich_label.visible_characters = -1
		_is_typing = false
		ScriptDirector.notify_typewriter_finished()

func set_text_speed(speed: TextSpeed):
	text_speed = speed
