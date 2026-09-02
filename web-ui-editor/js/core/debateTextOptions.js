// The text-styling options both debate editors offer.
//
// Nonstop Debate and Mass Panic Debate are rendered by the same engine panel,
// scripts/minigames/debate/debate_text_panel.gd, but each editor had grown its
// own arbitrary subset by copy-paste. An author could not pick wave for a
// nonstop debate or glow for a mass panic one, though the engine renders both.
// One table, so the two cannot drift again.
//
// `supported: false` marks a value the engine parses but does not render. Such
// an option is shown and disabled rather than dropped, so a line already
// authored with it still displays truthfully instead of the control silently
// reporting the first entry.
//
// DOM-free, so the tests can run it under node.

// debate_text_panel.gd:333-340. "normal" is the absence of an effect.
export const TEXT_EFFECTS = [
  { value: 'normal', label: 'Normal' },
  { value: 'shake', label: 'Shake' },
  { value: 'wave', label: 'Wave' },
  { value: 'glow', label: 'Glow' },
  // _apply_effect_wrap has no branch for it, so it renders as plain text.
  { value: 'fade', label: 'Fade', supported: false },
];

// debate_text_panel.gd:312-322. italic and handwritten both map to [i].
export const TEXT_FONTS = [
  { value: 'default', label: 'Default' },
  { value: 'bold', label: 'Bold' },
  { value: 'italic', label: 'Italic' },
  { value: 'handwritten', label: 'Handwritten' },
  { value: 'monospace', label: 'Monospace' },
  { value: 'glitch', label: 'Glitch' },
];

// debate_text_panel.gd:120 - anything that is not left_to_right travels the
// other way, so these two are the whole set.
export const TEXT_DIRECTIONS = [
  { value: 'left_to_right', label: 'Left to Right' },
  { value: 'right_to_left', label: 'Right to Left' },
];

// <option> markup for one of the tables above. The selected value is never
// disabled, or the control could not display what the line actually holds.
export function renderOptions(options, selected) {
  return options
    .map((option) => {
      const isSelected = option.value === selected;
      const unsupported = option.supported === false;
      const attrs =
        (isSelected ? ' selected' : '') + (unsupported && !isSelected ? ' disabled' : '');
      const label = unsupported ? `${option.label} (not rendered yet)` : option.label;
      return `<option value="${option.value}"${attrs}>${label}</option>`;
    })
    .join('');
}
