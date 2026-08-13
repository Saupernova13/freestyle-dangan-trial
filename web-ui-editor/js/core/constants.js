// Core constants for the trial editor.

// Written to metadata.version. The engine's trial_validator.gd
// SUPPORTED_FORMAT_MAJOR must track this major. Minor = additive changes.
export const FORMAT_VERSION = '4.0';

// 16 students + 1 headmaster.
export const BLOCK_COUNT = 17;

export const blockNames = [...Array(16)]
  .map((_, i) => `Student ${String(i + 1).padStart(2, '0')}`)
  .concat(['Headmaster']);

// false = student, true = headmaster.
export const blockTypes = [...Array(16)].fill(false).concat([true]);

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
