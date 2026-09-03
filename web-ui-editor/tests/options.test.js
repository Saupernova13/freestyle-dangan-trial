// @vitest-environment jsdom
//
// Every <select> in the editor used to build its own <option> markup inline.
// The copies did not agree: most escaped the label, none escaped the value,
// and two had grown their own disabled-with-a-suffix convention. A select is
// the control that misreports most quietly - an option the browser cannot
// match leaves the first entry showing, so the author reads a value the trial
// does not hold.
import { beforeEach, describe, expect, it } from 'vitest';
import { renderLabelOptions, renderOptions } from '../js/ui/options.js';
import { renderBloodTypeOptions, renderCharacterOptions } from '../js/models/characterModel.js';
import { DIFFICULTY_LABELS, SCRIPT_LINE_TYPE_LABELS } from '../js/core/constants.js';
import { state } from '../js/core/state.js';
import { validateTrialData } from '../js/core/trialSchema.js';

function select(html) {
  const el = document.createElement('select');
  el.innerHTML = html;
  return el;
}

function values(el) {
  return [...el.options].map((o) => o.value);
}

describe('renderOptions', () => {
  it('marks exactly the entry whose value is selected', () => {
    const el = select(
      renderOptions(
        [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
        'b'
      )
    );
    expect(el.value).toBe('b');
    expect([...el.options].filter((o) => o.selected)).toHaveLength(1);
  });

  it('never disables the entry that is currently selected', () => {
    // A disabled option cannot be submitted back, so disabling the current
    // value makes the control report something the data does not hold.
    const el = select(renderOptions([{ value: 'a', label: 'A', disabled: true }], 'a'));
    expect(el.options[0].disabled).toBe(false);
    expect(el.value).toBe('a');
  });

  it('disables an entry that is not selected', () => {
    const el = select(
      renderOptions(
        [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B', disabled: true },
        ],
        'a'
      )
    );
    expect(el.options[1].disabled).toBe(true);
  });

  it('escapes the value, so an id out of a foreign trial cannot inject markup', () => {
    const el = select(
      renderOptions([{ value: '" onfocus="x', label: 'Odd' }], 'none')
    );
    expect(el.options).toHaveLength(1);
    expect(el.options[0].getAttribute('onfocus')).toBeNull();
    // And the value still round-trips: the browser decodes the entity back.
    expect(el.options[0].value).toBe('" onfocus="x');
  });

  it('escapes the label', () => {
    const el = select(renderOptions([{ value: 'a', label: '<img src=x>' }], 'a'));
    expect(el.querySelector('img')).toBeNull();
    expect(el.options[0].textContent).toBe('<img src=x>');
  });

  it('shows a suffix in the label without putting it in the value', () => {
    const el = select(renderOptions([{ value: 'a', label: 'A', suffix: ' (note)' }], 'z'));
    expect(el.options[0].value).toBe('a');
    expect(el.options[0].textContent).toBe('A (note)');
  });

  it('carries a title only when the item has one', () => {
    const el = select(
      renderOptions(
        [
          { value: 'a', label: 'A', title: 'what it does' },
          { value: 'b', label: 'B' },
        ],
        'a'
      )
    );
    expect(el.options[0].title).toBe('what it does');
    expect(el.options[1].hasAttribute('title')).toBe(false);
  });
});

describe('renderLabelOptions', () => {
  it('renders a value-to-label table in declaration order', () => {
    const el = select(renderLabelOptions({ x: 'Ex', y: 'Why' }, 'y'));
    expect(values(el)).toEqual(['x', 'y']);
    expect(el.options[1].textContent).toBe('Why');
    expect(el.value).toBe('y');
  });

  it('offers only line types the validator accepts', () => {
    // The dropdown and validateTrialData() read the same table, so a type the
    // editor can set is a type that saves clean.
    for (const type of Object.keys(SCRIPT_LINE_TYPE_LABELS)) {
      const issues = validateTrialData({
        trialName: 'T',
        characters: [],
        script: { lines: [{ id: 'l1', type, text: 't', minigameId: 'm1' }] },
        minigames: [],
        truthBullets: [],
        metadata: { version: '4.0' },
      });
      expect(issues.filter((i) => i.includes('type'))).toEqual([]);
    }
  });

  it('offers only difficulties the validator accepts', () => {
    for (const difficulty of Object.keys(DIFFICULTY_LABELS)) {
      const issues = validateTrialData({
        trialName: 'T',
        characters: [],
        script: { lines: [] },
        minigames: [{ gameId: 'm1', gameType: 'nonstop_debate', difficulty }],
        truthBullets: [],
        metadata: { version: '4.0' },
      });
      expect(issues.filter((i) => i.includes('difficulty'))).toEqual([]);
    }
  });
});

describe('renderCharacterOptions', () => {
  beforeEach(() => {
    state.cast = [
      { id: 'c1', name: 'Aoi', surname: 'Asahina' },
      { id: 'c2', name: 'Byakuya', surname: 'Togami' },
    ];
  });

  it('keeps a character selectable in the slot that already holds it', () => {
    // Mass Panic greys out the two characters the other slots hold. A trial
    // that arrived with the same character in two slots put a slot's own
    // value in that list, and the control then offered a value it refused.
    const el = select(renderCharacterOptions('c1', ['c1']));
    const option = [...el.options].find((o) => o.value === 'c1');
    expect(option.disabled).toBe(false);
    expect(el.value).toBe('c1');
  });

  it('greys out a character another slot holds', () => {
    const el = select(renderCharacterOptions('c1', ['c2']));
    const option = [...el.options].find((o) => o.value === 'c2');
    expect(option.disabled).toBe(true);
    expect(option.textContent).toBe('Byakuya Togami (already selected)');
  });

  it('leads with an empty None entry', () => {
    const el = select(renderCharacterOptions(''));
    expect(el.options[0].value).toBe('');
    expect(el.options[0].textContent).toBe('None');
    expect(values(el)).toEqual(['', 'c1', 'c2']);
  });

  it('escapes a cast name', () => {
    state.cast = [{ id: 'c1', name: '<img src=x>', surname: '' }];
    const el = select(renderCharacterOptions('c1'));
    expect(el.querySelector('img')).toBeNull();
  });
});

describe('renderBloodTypeOptions', () => {
  it('shows nothing selected when the character has no blood type', () => {
    // blood is optional. Showing "A" for a blank field is the control
    // inventing data, and the next save writes the invention to disk.
    const el = select(renderBloodTypeOptions(''));
    expect(el.value).toBe('');
    expect(el.options[0].textContent).toBe('Not set');
  });

  it('keeps a value the list does not name', () => {
    const el = select(renderBloodTypeOptions('AB-'));
    expect(el.value).toBe('AB-');
    expect(el.options[el.selectedIndex].textContent).toBe('AB- (from the file)');
  });

  it('selects a listed type', () => {
    const el = select(renderBloodTypeOptions('AB'));
    expect(el.value).toBe('AB');
    expect(values(el)).toEqual(['', 'A', 'B', 'O', 'AB', 'Unknown']);
  });
});
