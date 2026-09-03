// Core constants for the trial editor.

// Written to metadata.version. The engine's trial_validator.gd
// SUPPORTED_FORMAT_MAJOR must track this major. Minor = additive changes.
export const FORMAT_VERSION = '4.0';

// character.json's own version, tracked separately: the two files change shape
// independently, and tying them would force a trial-format bump for a field
// only the character profile cares about.
export const CHARACTER_FORMAT_VERSION = '1.0';

// 16 students + 1 headmaster.
export const BLOCK_COUNT = 17;

export const blockNames = [...Array(16)]
  .map((_, i) => `Student ${String(i + 1).padStart(2, '0')}`)
  .concat(['Headmaster']);

// false = student, true = headmaster.
export const blockTypes = [...Array(16)].fill(false).concat([true]);

// The three line shapes changeScriptLineType() can produce. trialSchema
// derives its accepted line types from these keys, so the dropdown and the
// validator cannot come to disagree about what a line may be.
export const SCRIPT_LINE_TYPE_LABELS = {
  speaking: 'Speaking',
  narrator: 'Narrator',
  minigame: 'Minigame',
};

// The engine keys four independent tuning tables on this and falls back to
// medium for anything else, silently, in all four.
export const DIFFICULTY_LABELS = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

// These keys are the schema's allowed set for gameType: trialSchema derives
// GAME_TYPES from Object.keys, and the type dropdown renders every one of
// them (disabling those without an editor). So adding a label makes a type
// both selectable and valid, and trimming an "unused" one makes every trial
// that holds it fail validation.
export const MINIGAME_TYPE_LABELS = {
  nonstop_debate: 'Nonstop Debate',
  mass_panic_debate: 'Mass Panic Debate',
  logic_dive: 'Logic Dive',
  hangmans_gambit: "Hangman's Gambit",
  debate_scrum: 'Debate Scrum',
  rebuttal_showdown: 'Rebuttal Showdown',
  psyche_taxi: 'Psyche Taxi',
  closing_argument: 'Closing Argument',
};
