class_name UITheme
extends RefCounted
## Shared colors/sizes for the procedural minigame VFX and the small bits of
## runtime state-coloring that aren't scene-authored (particle shards, damage
## popups, timer warning tints, the Hangman space width). Editable UI styling
## now lives in the .tscn scenes.

const COLOR_ACCENT_GOLD := Color(1.0, 0.855, 0.039)
const COLOR_CORRECT := Color(0.3, 1.0, 0.5)
const COLOR_CORRECT_BRIGHT := Color(0.2, 1.0, 0.4)
const COLOR_WRONG := Color(1.0, 0.3, 0.3)
const COLOR_WRONG_BRIGHT := Color(1.0, 0.2, 0.2)
const COLOR_WARN_YELLOW := Color(1.0, 0.8, 0.2)
const COLOR_SLOW_VIGNETTE := Color(0.0, 0.1, 0.3, 0.0)
const COLOR_SHATTER_SHARD := Color(0.9, 0.9, 1.0, 0.85)
const COLOR_SCREEN_SHARD := Color(0.7, 0.7, 0.8, 0.7)

const FONT_SIZE_POPUP: int = 28
const HANGMAN_SPACE_MIN_WIDTH: float = 18.0
