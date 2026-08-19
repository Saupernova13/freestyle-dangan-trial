class_name MinigameConfig
extends RefCounted
##
## Every minigame's tuning constant, in one place. Look values up here rather
## than hardcoding them in a minigame script.

# Seconds between spawns, per difficulty.
const SPAWN_INTERVALS := {
	"nonstop_debate": {"easy": 2.8, "medium": 2.0, "hard": 1.5},
	"hangmans_gambit": {"easy": 2.0, "medium": 1.5, "hard": 1.0},
	"mass_panic_debate": {"easy": 3.5, "medium": 3.0, "hard": 2.0},
}

# Secondary spawns, such as white noise lines.
const NOISE_SPAWN_INTERVAL: float = 1.2

# Applied to panel scroll speed, damage, and similar.
const DIFFICULTY_MULTIPLIERS := {
	"easy": 0.7,
	"medium": 1.0,
	"hard": 1.5,
}

# Logic Dive floating-letter speeds.
const FLOATING_LETTER_SPEEDS := {
	"easy": {"base": 40.0, "range": 40.0},
	"medium": {"base": 60.0, "range": 60.0},
	"hard": {"base": 80.0, "range": 80.0},
}

# Debate panel safe areas and row counts.
const SCREEN_LAYOUT := {
	"debate_safe_top": 100,
	"debate_safe_bottom": 180,
	"debate_rows": 5,
	"mass_panic_row_y": [100, 250, 400],
}

# Gaps between break-sequence beats; the beats themselves are scene animations.
const TIMING := {
	"impact_frame": 0.05,
	"shatter_to_wrong": 0.1,
	"wrong_to_screen_shatter": 0.6,
	"break_to_evidence": 0.25,
	"evidence_hold": 1.2,
	"result_pause": 1.0,
}

# Concentrate gauge and slow-time; the vignette's look is scene-owned.
const SLOW_TIME_SCALE: float = 0.4

# Debate scrum turn timing.
const SCRUM_TURN_TIME_LIMIT: float = 5.0
const SCRUM_KEYWORD_BUTTON_COUNT: int = 5

# ScriptDirector skip / auto-advance.
const SKIP_INTERVAL: float = 0.05
const MINIGAME_RESULT_PAUSE: float = 1.5

# Helper accessors with safe fallbacks.
static func get_spawn_interval(game: String, difficulty: String) -> float:
	var per_game = SPAWN_INTERVALS.get(game, {})
	return per_game.get(difficulty, per_game.get("medium", 2.0))

static func get_difficulty_multiplier(difficulty: String) -> float:
	return DIFFICULTY_MULTIPLIERS.get(difficulty, 1.0)

static func get_floating_letter_speed(difficulty: String) -> Dictionary:
	return FLOATING_LETTER_SPEEDS.get(difficulty, FLOATING_LETTER_SPEEDS["medium"])
