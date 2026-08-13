class_name HangmanSlot
extends PanelContainer
## One answer-letter slot in Hangman's Gambit. Layout and the unrevealed "_"
## are scene-owned; this only flips it to a letter or an inert space.

@onready var _letter: Label = %Letter

## Turn this slot into a blank space: no visible box, no letter.
func mark_space() -> void:
	_letter.text = " "
	_letter.custom_minimum_size.x = UITheme.HANGMAN_SPACE_MIN_WIDTH
	_letter.add_theme_color_override("font_color", Color(0, 0, 0, 0))
	var style: StyleBoxFlat = get_theme_stylebox("panel").duplicate()
	style.bg_color = Color(0, 0, 0, 0)
	style.border_width_bottom = 0
	style.content_margin_left = 4
	style.content_margin_right = 4
	add_theme_stylebox_override("panel", style)

func reveal(text: String) -> void:
	_letter.text = text
	_letter.add_theme_color_override("font_color", UITheme.COLOR_CORRECT)
