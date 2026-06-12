// Core constants for the trial editor.

// Total number of cast slots: 16 students + 1 headmaster.
export const BLOCK_COUNT = 17;

// Display labels for each cast slot.
export const blockNames = [...Array(16)]
  .map((_, i) => `Student ${String(i + 1).padStart(2, '0')}`)
  .concat(['Headmaster']);

// Slot type per index: false = student, true = headmaster.
export const blockTypes = [...Array(16)].fill(false).concat([true]);
