extends Node
## Renders a script line: highlight BBCode, box styling, typewriter reveal.
## Reveal start/finish are signals so ScriptDirector can gate input.

signal typewriter_started
signal typewriter_finished

var _rich_label: RichTextLabel
var _name_label: Label
var _portrait_rect: TextureRect
var _style_panel: Control

var _typewriter_speed: float = 30.0
var _is_typing: bool = false
var _typewriter_anim: AnimationPlayer = null

func setup(rich_label: RichTextLabel, name_label: Label = null, portrait_rect: TextureRect = null):
	_rich_label = rich_label
	_name_label = name_label
	_portrait_rect = portrait_rect

	if _rich_label:
		_rich_label.bbcode_enabled = true
		_ensure_styled_font_variants()
		# The typewriter reveal is a clip on the conversation UI scene.
		_typewriter_anim = _rich_label.get_parent().get_node_or_null("%TypewriterAnimator")
		if _typewriter_anim:
			_typewriter_anim.animation_finished.connect(_on_typewriter_finished)
		# The label is a sibling of its backdrop, not a child, so box styling
		# targets the backdrop by unique name rather than by walking up.
		_style_panel = _rich_label.get_parent().get_node_or_null("%Panel_Text_BG") as Control
		if _style_panel == null:
			push_warning("DialogueBox: %Panel_Text_BG not found; dialogueBoxStyle is inert.")

## Highlights emit [b]...[/b], which RichTextLabel resolves through separate
## theme entries; unset ones fall back to a tiny default. Mirror the normal
## font into every undefined variant so highlights match.
func _ensure_styled_font_variants():
	var normal_size := _rich_label.get_theme_font_size("normal_font_size")
	for size_name in ["bold_font_size", "italics_font_size", "bold_italics_font_size", "mono_font_size"]:
		if not _theme_chain_defines(size_name, false):
			_rich_label.add_theme_font_size_override(size_name, normal_size)

	var normal_font := _rich_label.get_theme_font("normal_font")
	if normal_font:
		for font_name in ["bold_font", "italics_font", "bold_italics_font", "mono_font"]:
			if not _theme_chain_defines(font_name, true):
				_rich_label.add_theme_font_override(font_name, normal_font)

## Searches the label, ancestor Themes and the project theme. Only unset entries
## are mirrored, so deliberate styling wins.
func _theme_chain_defines(prop: String, is_font: bool) -> bool:
	if is_font and _rich_label.has_theme_font_override(prop):
		return true
	if not is_font and _rich_label.has_theme_font_size_override(prop):
		return true

	var node: Node = _rich_label
	while node:
		var theme: Theme = node.theme if (node is Control or node is Window) else null
		if theme:
			if is_font and theme.has_font(prop, "RichTextLabel"):
				return true
			if not is_font and theme.has_font_size(prop, "RichTextLabel"):
				return true
		node = node.get_parent()

	var project_theme := ThemeDB.get_project_theme()
	if project_theme:
		if is_font and project_theme.has_font(prop, "RichTextLabel"):
			return true
		if not is_font and project_theme.has_font_size(prop, "RichTextLabel"):
			return true
	return false

func display_speaking_line(line: ScriptLine):
	if not line or not _rich_label:
		return

	var dialogue_text := line.dialogue
	var highlights := line.highlights
	var box_style := line.dialogue_box_style

	var bbcode = _apply_highlights(dialogue_text, highlights)
	_rich_label.text = bbcode

	_apply_box_style(box_style)
	_start_typewriter()

func display_narrator_line(line: ScriptLine):
	if not line or not _rich_label:
		return

	var text := line.display_text()
	# Narrator lines carry highlights and box style too.
	var highlights := line.highlights
	var bbcode = _apply_highlights(text, highlights)
	_rich_label.text = "[center][color=#AABBCC]" + bbcode + "[/color][/center]"

	_apply_box_style(line.dialogue_box_style)

	if _name_label:
		_name_label.text = ""
	if _portrait_rect:
		_portrait_rect.texture = null

	_start_typewriter()

## Older trials carry startIndex/endIndex instead of startChar/endChar.
static func _highlight_start(h: Dictionary) -> int:
	return int(h.get("startChar", h.get("startIndex", 0)))

static func _highlight_end(h: Dictionary) -> int:
	return int(h.get("endChar", h.get("endIndex", 0)))

## A user-typed "[" must never parse as a tag; "[lb]" renders it literally.
static func _escape_bbcode(text: String) -> String:
	return text.replace("[", "[lb]")

## Highlights paint a per-character color map (later entries win), then emit as
## disjoint runs. Every segment is escaped, so bad ranges and typed brackets
## cannot break the markup.
func _apply_highlights(text: String, highlights: Array) -> String:
	var length := text.length()
	if highlights.is_empty() or length == 0:
		return _escape_bbcode(text)

	var color_at := PackedStringArray()
	color_at.resize(length)
	for h in highlights:
		if not (h is Dictionary):
			continue
		var start_idx: int = clampi(_highlight_start(h), 0, length)
		var end_idx: int = clampi(_highlight_end(h), 0, length)
		var color := str(h.get("color", "#FFFF00"))
		# Unvalidated, this string goes straight into a [color=...] tag.
		if not Color.html_is_valid(color):
			color = "#FFFF00"
		for i in range(start_idx, end_idx):
			color_at[i] = color

	var result := ""
	var i := 0
	while i < length:
		var run_color := color_at[i]
		var j := i
		while j < length and color_at[j] == run_color:
			j += 1
		var segment := _escape_bbcode(text.substr(i, j - i))
		if run_color.is_empty():
			result += segment
		else:
			result += "[color=%s][b]%s[/b][/color]" % [run_color, segment]
		i = j

	return result

var _default_panel_style: StyleBoxFlat = null

func _apply_box_style(style: Dictionary):
	var panel := _style_panel
	if panel == null:
		return

	# Cached pristine, so each line styles a fresh duplicate.
	if _default_panel_style == null:
		var base = panel.get_theme_stylebox("panel")
		if base and base is StyleBoxFlat:
			_default_panel_style = base.duplicate()
	if _default_panel_style == null:
		return

	var stylebox: StyleBoxFlat = _default_panel_style.duplicate()

	if not style.is_empty():
		# StyleBoxFlat approximations of the editor's presets.
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
		typewriter_finished.emit()
		return

	var total_chars := _rich_label.get_total_character_count()
	if total_chars <= 0:
		_rich_label.visible_characters = -1
		typewriter_finished.emit()
		return

	_rich_label.visible_characters = 0
	_is_typing = true
	typewriter_started.emit()

	if not _typewriter_anim:
		# Headless or tests: no animator, so reveal immediately.
		_on_typewriter_finished()
		return

	# The curve lives in the scene's `typewriter` clip; scaling by chars/sec
	# honours the speed setting.
	_typewriter_anim.speed_scale = _typewriter_speed / float(total_chars)
	_typewriter_anim.play("typewriter")

func _on_typewriter_finished(_anim_name: StringName = &""):
	if not _is_typing:
		return
	if _rich_label:
		_rich_label.visible_characters = -1
	_is_typing = false
	typewriter_finished.emit()

func skip_typewriter():
	if _is_typing and _rich_label:
		if _typewriter_anim:
			_typewriter_anim.stop()
		_rich_label.visible_characters = -1
		_is_typing = false
		typewriter_finished.emit()
