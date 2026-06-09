extends Node

var _rich_label: RichTextLabel
var _name_label: Label
var _portrait_rect: TextureRect

var _typewriter_speed: float = 30.0
var _is_typing: bool = false
var _typewriter_tween: Tween = null

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
	# Narrator lines support the same highlight + box style data as speaking
	# lines — the editor exposes both tabs for them.
	var highlights = line.get("highlights", [])
	var bbcode = _apply_highlights(text, highlights)
	_rich_label.text = "[center][color=#AABBCC]" + bbcode + "[/color][/center]"

	_apply_box_style(line.get("dialogueBoxStyle", {}))

	if _name_label:
		_name_label.text = ""
	if _portrait_rect:
		_portrait_rect.texture = null

	_start_typewriter()

## Highlight range keys: the web editor writes startChar/endChar; older trials
## may carry startIndex/endIndex. Accept both.
static func _highlight_start(h: Dictionary) -> int:
	return int(h.get("startChar", h.get("startIndex", 0)))

static func _highlight_end(h: Dictionary) -> int:
	return int(h.get("endChar", h.get("endIndex", 0)))

func _apply_highlights(text: String, highlights: Array) -> String:
	if highlights.is_empty():
		return text

	var sorted = highlights.duplicate()
	sorted.sort_custom(func(a, b): return _highlight_start(a) > _highlight_start(b))

	var result = text
	for h in sorted:
		var start_idx = _highlight_start(h)
		var end_idx = _highlight_end(h)
		var color = h.get("color", "#FFFF00")

		if start_idx >= 0 and end_idx > start_idx and end_idx <= result.length():
			var before = result.substr(0, start_idx)
			var highlighted = result.substr(start_idx, end_idx - start_idx)
			var after = result.substr(end_idx)
			result = before + "[color=" + color + "][b]" + highlighted + "[/b][/color]" + after

	return result

var _default_panel_style: StyleBoxFlat = null

func _apply_box_style(style: Dictionary):
	var panel = _rich_label.get_parent()
	if not panel or not panel is PanelContainer:
		return

	# Cache the scene's pristine stylebox once; every line then styles a fresh
	# duplicate of it, so one line's style can never leak into the next.
	if _default_panel_style == null:
		var base = panel.get_theme_stylebox("panel")
		if base and base is StyleBoxFlat:
			_default_panel_style = base.duplicate()
	if _default_panel_style == null:
		return

	var stylebox: StyleBoxFlat = _default_panel_style.duplicate()

	if not style.is_empty():
		# Shape variants — StyleBoxFlat approximations of the editor presets.
		match str(style.get("style", "default")):
			"slant_left":
				stylebox.skew = Vector2(-0.2, 0.0)
			"slant_right":
				stylebox.skew = Vector2(0.2, 0.0)
			"spiky":
				stylebox.skew = Vector2(0.15, 0.0)
				stylebox.set_corner_radius_all(0)
			"bubbly":
				stylebox.set_corner_radius_all(28)
			"rounded":
				stylebox.set_corner_radius_all(14)
			"sharp":
				stylebox.set_corner_radius_all(0)

		var border_color_str = style.get("borderColor", "")
		if border_color_str is String and not border_color_str.is_empty():
			stylebox.border_color = Color.from_string(border_color_str, Color.WHITE)

		var bg_opacity = float(style.get("bgOpacity", -1.0))
		if bg_opacity >= 0:
			stylebox.bg_color.a = bg_opacity

		var border_thickness = int(style.get("borderThickness", -1))
		if border_thickness >= 0:
			stylebox.border_width_top = border_thickness
			stylebox.border_width_bottom = border_thickness
			stylebox.border_width_left = border_thickness
			stylebox.border_width_right = border_thickness

	panel.add_theme_stylebox_override("panel", stylebox)

func _start_typewriter():
	if not _rich_label:
		return

	_typewriter_speed = Settings.get_typewriter_speed()
	if _typewriter_speed >= 999.0:
		_rich_label.visible_characters = -1
		ScriptDirector.notify_typewriter_finished()
		return

	var total_chars := _rich_label.get_total_character_count()
	if total_chars <= 0:
		_rich_label.visible_characters = -1
		ScriptDirector.notify_typewriter_finished()
		return

	_rich_label.visible_characters = 0
	_is_typing = true
	ScriptDirector.notify_typewriter_started()

	# Linear char-by-char reveal driven by a Tween instead of a per-frame loop.
	# Duration is derived from chars/sec so reveal pacing matches the old timer.
	var duration := float(total_chars) / _typewriter_speed
	if _typewriter_tween and _typewriter_tween.is_valid():
		_typewriter_tween.kill()
	_typewriter_tween = create_tween()
	_typewriter_tween.tween_property(_rich_label, "visible_characters", total_chars, duration)
	_typewriter_tween.finished.connect(_on_typewriter_finished)

func _on_typewriter_finished():
	_typewriter_tween = null
	if not _is_typing:
		return
	if _rich_label:
		_rich_label.visible_characters = -1
	_is_typing = false
	ScriptDirector.notify_typewriter_finished()

func skip_typewriter():
	if _is_typing and _rich_label:
		if _typewriter_tween and _typewriter_tween.is_valid():
			_typewriter_tween.kill()
		_typewriter_tween = null
		_rich_label.visible_characters = -1
		_is_typing = false
		ScriptDirector.notify_typewriter_finished()

func is_typing() -> bool:
	return _is_typing

func set_text_speed(speed: TextSpeed):
	text_speed = speed
