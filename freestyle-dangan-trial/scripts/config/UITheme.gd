class_name UITheme
extends RefCounted
##
## Centralized colors, font sizes, and spacing values used by minigames and HUD.
## Use these constants instead of inline Color()/font_size literals so the
## look-and-feel can be retuned in one place.

# ---------------------------------------------------------------------------
# Palette
# ---------------------------------------------------------------------------
const COLOR_TRUTH_BULLET := Color(0.91, 0.239, 0.502)        # signature pink
const COLOR_ACCENT_GOLD := Color(1.0, 0.855, 0.039)
const COLOR_ACCENT_CYAN := Color(0.4, 0.7, 1.0)
const COLOR_CORRECT := Color(0.3, 1.0, 0.5)
const COLOR_CORRECT_BRIGHT := Color(0.2, 1.0, 0.4)
const COLOR_WRONG := Color(1.0, 0.3, 0.3)
const COLOR_WRONG_BRIGHT := Color(1.0, 0.2, 0.2)
const COLOR_WARN_YELLOW := Color(1.0, 0.8, 0.2)
const COLOR_WARN_DIM := Color(0.8, 0.8, 0.3)
const COLOR_BG_PANEL := Color(0.039, 0.039, 0.078, 0.95)
const COLOR_BG_BUTTON := Color(0.1, 0.15, 0.3, 0.9)
const COLOR_BG_BUTTON_HOVER := Color(0.25, 0.2, 0.45, 0.95)
const COLOR_BORDER_BUTTON := Color(0.3, 0.5, 0.8, 0.6)
const COLOR_BORDER_BUTTON_HOVER := Color(0.5, 0.7, 1.0)
const COLOR_SLOW_VIGNETTE := Color(0.0, 0.1, 0.3, 0.0)
const COLOR_FLASH_RED := Color(1.0, 0.0, 0.0, 0.3)
const COLOR_OVERLAY_DIM := Color(0.0, 0.0, 0.0, 0.75)
const COLOR_SHATTER_SHARD := Color(0.9, 0.9, 1.0, 0.85)
const COLOR_SCREEN_SHARD := Color(0.7, 0.7, 0.8, 0.7)
const COLOR_HANGMAN_SLOT_BG := Color(0.15, 0.1, 0.25, 0.9)
const COLOR_HANGMAN_SLOT_BORDER := Color(0.6, 0.3, 0.8)
const COLOR_HANGMAN_BLANK := Color(0.8, 0.8, 0.9)

# ---------------------------------------------------------------------------
# Font sizes
# ---------------------------------------------------------------------------
const FONT_SIZE_LARGE: int = 32
const FONT_SIZE_HEADER: int = 22
const FONT_SIZE_BODY: int = 20
const FONT_SIZE_BUTTON: int = 18
const FONT_SIZE_KEYWORD: int = 16
const FONT_SIZE_LABEL: int = 13
const FONT_SIZE_TINY: int = 12
const FONT_SIZE_POPUP: int = 28

# ---------------------------------------------------------------------------
# Spacing & sizing
# ---------------------------------------------------------------------------
const KEYWORD_BUTTON_SIZE := Vector2(240, 40)
const LANE_BUTTON_SIZE := Vector2(180, 80)
const PREVIEW_LABEL_MIN_WIDTH: float = 120.0
const HANGMAN_LETTER_MIN_WIDTH: float = 36.0
const HANGMAN_SPACE_MIN_WIDTH: float = 18.0

# ---------------------------------------------------------------------------
# Helper builders
# ---------------------------------------------------------------------------
static func make_button_style(
	bg: Color = COLOR_BG_BUTTON,
	border: Color = COLOR_BORDER_BUTTON,
	corner_radius: int = 4,
	border_width: int = 1
) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = border
	style.border_width_top = border_width
	style.border_width_bottom = border_width
	style.border_width_left = border_width
	style.border_width_right = border_width
	style.corner_radius_top_left = corner_radius
	style.corner_radius_top_right = corner_radius
	style.corner_radius_bottom_left = corner_radius
	style.corner_radius_bottom_right = corner_radius
	return style

static func make_panel_style(
	bg: Color = COLOR_BG_PANEL,
	border: Color = COLOR_ACCENT_GOLD,
	border_width: int = 2,
	margin: int = 16
) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = border
	style.border_width_top = border_width
	style.border_width_bottom = border_width
	style.border_width_left = border_width
	style.border_width_right = border_width
	style.content_margin_top = margin
	style.content_margin_bottom = margin
	style.content_margin_left = margin + 8
	style.content_margin_right = margin + 8
	return style

static func make_centered_label(text: String, font_size: int, color: Color) -> Label:
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", font_size)
	lbl.add_theme_color_override("font_color", color)
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	return lbl
