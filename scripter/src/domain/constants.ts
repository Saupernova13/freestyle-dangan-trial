/** Total cast slots (16 students + 1 headmaster) */
export const CAST_SLOTS = 17;

/** Number of student positions */
export const STUDENT_COUNT = 16;

/** Maximum sprite slots per character */
export const MAX_SPRITES = 25;

/** Maximum truth bullets selectable per debate */
export const MAX_BULLETS_PER_DEBATE = 6;

/** Maximum dialogue lines per nonstop debate */
export const MAX_DEBATE_DIALOGUE_LINES = 30;

/** Maximum arguments per debate scrum */
export const MAX_DEBATE_SCRUM_ARGUMENTS = 8;

/** Maximum answers per logic dive question */
export const MAX_LOGIC_DIVE_ANSWERS = 5;

/** All supported minigame type identifiers */
export const MINIGAME_TYPES = [
  'nonstop_debate',
  'mass_panic_debate',
  'logic_dive',
  'debate_scrum',
  'hangmans_gambit',
  'rebuttal_showdown',
  'psyche_taxi',
  'closing_argument',
] as const;

/** Human-readable labels for each minigame type */
export const MINIGAME_TYPE_LABELS: Record<MinigameType, string> = {
  nonstop_debate: 'Nonstop Debate',
  mass_panic_debate: 'Mass Panic Debate',
  logic_dive: 'Logic Dive',
  debate_scrum: 'Debate Scrum',
  hangmans_gambit: "Hangman's Gambit",
  rebuttal_showdown: 'Rebuttal Showdown',
  psyche_taxi: 'Psyche Taxi',
  closing_argument: 'Closing Argument',
};

export type MinigameType = (typeof MINIGAME_TYPES)[number];

/** Difficulty levels */
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Blood types */
export const BLOOD_TYPES = ['A', 'B', 'O', 'AB', 'Unknown'] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

/** Script line types */
export const LINE_TYPES = ['speaking', 'narrator', 'minigame'] as const;
export type LineType = (typeof LINE_TYPES)[number];

/** Camera motion types */
export const CAMERA_MOTION_TYPES = ['none', 'pan', 'zoom', 'shake'] as const;
export type CameraMotionType = (typeof CAMERA_MOTION_TYPES)[number];

/** Camera easing options */
export const CAMERA_EASINGS = ['ease-in-out', 'ease-in', 'ease-out', 'linear'] as const;
export type CameraEasing = (typeof CAMERA_EASINGS)[number];

/** Special effect types */
export const SPECIAL_EFFECT_TYPES = [
  'screen_flash',
  'screen_shake',
  'vignette',
  'color_overlay',
  'text_shake',
] as const;
export type SpecialEffectType = (typeof SPECIAL_EFFECT_TYPES)[number];

/** Dialogue box style options */
export const DIALOGUE_BOX_STYLES = ['default', 'shout', 'whisper', 'thought', 'system'] as const;
export type DialogueBoxStyle = (typeof DIALOGUE_BOX_STYLES)[number];

/** Text effects for debate panels */
export const TEXT_EFFECTS = ['normal', 'shake', 'fade', 'glow'] as const;
export type TextEffect = (typeof TEXT_EFFECTS)[number];

/** Text font styles for debate panels */
export const TEXT_FONTS = ['default', 'bold', 'italic', 'handwritten', 'glitch'] as const;
export type TextFont = (typeof TEXT_FONTS)[number];

/** Text movement directions */
export const TEXT_MOVEMENT_DIRECTIONS = ['left_to_right', 'right_to_left'] as const;
export type TextMovementDirection = (typeof TEXT_MOVEMENT_DIRECTIONS)[number];

/** Trial data format version */
export const TRIAL_FORMAT_VERSION = '4.0';
