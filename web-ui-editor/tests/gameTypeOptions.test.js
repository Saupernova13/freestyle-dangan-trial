// @vitest-environment jsdom
//
// MINIGAME_TYPE_LABELS declares eight types and trialSchema validates gameType
// against its keys, but the dropdown hardcoded five <option> elements. A
// minigame of one of the other three displayed "Nonstop Debate" as selected
// while the data said otherwise, and editing anything else on it could commit
// that wrong type.
import { beforeEach, describe, expect, it } from 'vitest';
import { MINIGAME_TYPE_LABELS } from '../js/core/constants.js';
import { renderGameTypeOptions } from '../js/views/minigameView.js';

const WITHOUT_EDITOR = ['rebuttal_showdown', 'psyche_taxi', 'closing_argument'];

function optionsFor(selected) {
  const select = document.createElement('select');
  select.innerHTML = renderGameTypeOptions(selected);
  return [...select.options];
}

beforeEach(() => {
  window.icon = () => '';
});

describe('renderGameTypeOptions', () => {
  it('offers every type the schema accepts', () => {
    const values = optionsFor('nonstop_debate').map((o) => o.value);
    expect(values).toEqual(Object.keys(MINIGAME_TYPE_LABELS));
  });

  it('selects the type the minigame actually is', () => {
    for (const type of Object.keys(MINIGAME_TYPE_LABELS)) {
      const selected = optionsFor(type).filter((o) => o.selected);
      expect(
        selected.map((o) => o.value),
        type
      ).toEqual([type]);
    }
  });

  it('does not misreport an editor-less type as Nonstop Debate', () => {
    // The reported failure, stated directly.
    const options = optionsFor('psyche_taxi');
    const shown = options.find((o) => o.selected);
    expect(shown.value).toBe('psyche_taxi');
    expect(shown.textContent).toContain('Psyche Taxi');
  });

  it('disables the types with no editor so a new one cannot be authored', () => {
    const disabled = optionsFor('nonstop_debate')
      .filter((o) => o.disabled)
      .map((o) => o.value);
    expect(disabled).toEqual(WITHOUT_EDITOR);
  });

  it('leaves the current type selectable even when it has no editor', () => {
    // Disabling the selected option would leave the control unable to show it.
    const current = optionsFor('closing_argument').find((o) => o.value === 'closing_argument');
    expect(current.disabled).toBe(false);
    expect(current.selected).toBe(true);
  });

  it('says which types have no editor rather than leaving it unexplained', () => {
    const label = optionsFor('nonstop_debate').find((o) => o.value === 'psyche_taxi').textContent;
    expect(label).toContain('no editor yet');
  });
});
