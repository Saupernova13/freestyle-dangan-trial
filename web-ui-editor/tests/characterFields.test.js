// @vitest-environment jsdom
//
// The character field set was spelled out five times: the modal's empty
// buffer, the mapping that fills it from a saved character, the character.json
// the save path builds, the form markup, and a partial fifth copy as the
// required-field list. Only the form is visible while you are looking at the
// form, so a field could reach it without reaching character.json and be
// dropped on save with nothing to show for it.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHARACTER_FIELDS,
  characterFieldsFrom,
  characterJsonFields,
  emptyCharacterFields,
  requiredCharacterFields,
} from '../js/models/characterFields.js';
import { isCharacterComplete, missingCharacterFields } from '../js/models/characterModel.js';

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(
  readFileSync(resolve(here, '../../schema/character.schema.json'), 'utf8')
);

// What the save path adds around the authored fields.
const SAVE_PATH_KEYS = ['formatVersion', 'id', 'isHeadmaster', 'position', 'lastModified'];

describe('the character field table', () => {
  it('describes exactly the fields character.json holds', () => {
    // The cross-check the five copies could not give: a field added to the
    // form but not to the schema, or the reverse, fails here.
    const declared = CHARACTER_FIELDS.map((f) => f.key).sort();
    const inSchema = Object.keys(schema.properties)
      .filter((k) => !SAVE_PATH_KEYS.includes(k))
      .sort();
    expect(declared).toEqual(inSchema);
  });

  it('gives every field a default and a type', () => {
    for (const field of CHARACTER_FIELDS) {
      expect(field.default).toBeDefined();
      expect(field.type).toBeTruthy();
      expect(field.label).toBeTruthy();
    }
  });

  it('starts a new character on every key, none of them undefined', () => {
    const fields = emptyCharacterFields();
    expect(Object.keys(fields).sort()).toEqual(CHARACTER_FIELDS.map((f) => f.key).sort());
    for (const value of Object.values(fields)) expect(value).toBeDefined();
  });
});

describe('loading a saved character into the form', () => {
  it('keeps every stored value', () => {
    const saved = {
      name: 'Aoi',
      surname: 'Asahina',
      dob: '2000-01-01',
      blood: 'O',
      heightM: 1,
      heightCM: 65,
      weight: 56,
      chest: 82,
      likes: 'Donuts',
      dislikes: 'Ghosts',
      notes: 'Swimmer',
    };
    expect(characterFieldsFrom(saved)).toEqual(saved);
  });

  it('falls back to the declared default where the file has nothing', () => {
    // heightM 1 rather than 0 for a profile that never had a height, which is
    // what the hand-written mapping did.
    const fields = characterFieldsFrom({ name: 'Aoi' });
    expect(fields.heightM).toBe(1);
    expect(fields.heightCM).toBe(50);
    expect(fields.name).toBe('Aoi');
    expect(fields.likes).toBe('');
  });

  it('survives a character with nothing in it', () => {
    expect(characterFieldsFrom()).toEqual(emptyCharacterFields());
  });
});

describe('saving the form to character.json', () => {
  it('writes numbers as numbers, not as the form strings', () => {
    // The form hands back strings for every input. A string height reaches
    // the engine as a string, and the schema says number.
    const json = characterJsonFields({
      ...emptyCharacterFields(),
      heightM: '1.65',
      heightCM: '65',
      weight: '56',
      chest: '82',
    });
    expect(json.heightM).toBe(1.65);
    expect(json.heightCM).toBe(65);
    expect(json.weight).toBe(56);
    expect(json.chest).toBe(82);
    for (const key of ['heightM', 'heightCM', 'weight', 'chest']) {
      expect(typeof json[key]).toBe('number');
      expect(schema.properties[key].type).toBe('number');
    }
  });

  it('passes text through untouched', () => {
    const json = characterJsonFields({
      ...emptyCharacterFields(),
      name: 'Aoi',
      notes: 'A note\nwith a newline',
    });
    expect(json.name).toBe('Aoi');
    expect(json.notes).toBe('A note\nwith a newline');
  });

  it('writes every key the schema names', () => {
    const json = characterJsonFields(emptyCharacterFields());
    for (const field of CHARACTER_FIELDS) expect(json).toHaveProperty(field.key);
  });
});

describe('the completeness check', () => {
  const complete = {
    name: 'Aoi',
    surname: 'Asahina',
    dob: '2000-01-01',
    weight: 56,
    chest: 82,
    likes: 'Donuts',
    dislikes: 'Ghosts',
    notes: 'Swimmer',
    heightM: 1,
    heightCM: 65,
    sprites: ['one'],
  };

  it('reads its list from the same table', () => {
    expect(requiredCharacterFields().map(([key]) => key)).toEqual(
      CHARACTER_FIELDS.filter((f) => f.required).map((f) => f.key)
    );
  });

  it('accepts a filled-in character', () => {
    expect(isCharacterComplete(complete)).toBe(true);
  });

  it('names what is still missing, in form order', () => {
    expect(missingCharacterFields({ name: 'Aoi', heightM: 1, heightCM: 65 }, true)).toEqual([
      'Last name',
      'Date of birth',
      'Weight',
      'Chest',
      'Likes',
      'Dislikes',
      'Notes',
    ]);
  });

  it('does not require the blood type', () => {
    // It is an optional free string in the schema, and the form offers a
    // "Not set" entry for exactly that reason.
    expect(isCharacterComplete({ ...complete, blood: '' })).toBe(true);
  });
});

describe('the rendered form', () => {
  // The form is the fifth copy the table replaces, and the one an author
  // actually sees. It is driven by module state, so drive it the way the
  // modal does.
  async function form(values = {}) {
    const modal = await import('../js/modals/characterModal.js');
    for (const [key, value] of Object.entries({ ...emptyCharacterFields(), ...values })) {
      modal.fieldUpdate(key, value);
    }
    const host = document.createElement('div');
    host.innerHTML = modal.renderCharDetailsTab();
    return host;
  }

  it('renders a control for every field in the table', async () => {
    const host = await form();
    const fields = [...host.querySelectorAll('[data-field]')].map((el) => el.dataset.field);
    for (const field of CHARACTER_FIELDS) {
      expect(fields).toContain(field.key);
    }
  });

  it('binds each input once, on input', async () => {
    // `input` fires for every control type here, type=date included, so the
    // onchange that used to sit beside each one was a second attribute doing
    // the same work.
    const host = await form();
    for (const el of host.querySelectorAll('input, textarea')) {
      if (el.type === 'file') continue;
      expect(el.dataset.onInput).toBe('fieldUpdate');
      expect(el.dataset.onChange).toBeUndefined();
    }
  });

  it('carries no executable attribute at all', async () => {
    // The field name is data now; nothing in this form is an inline handler.
    const host = await form();
    for (const el of host.querySelectorAll('*')) {
      for (const attr of el.attributes) {
        expect(attr.name.startsWith('on')).toBe(false);
      }
    }
  });

  it('flags an empty required field and leaves the optional one alone', async () => {
    const host = await form();
    const labels = [...host.querySelectorAll('label')];
    const flagged = labels.filter((l) => l.querySelector('.req-flag')).map((l) => l.textContent.trim());
    expect(flagged.some((t) => t.startsWith('First Name'))).toBe(true);
    expect(flagged.some((t) => t.startsWith('Blood Type'))).toBe(false);
    expect(flagged.some((t) => t.startsWith('Height'))).toBe(false);
  });

  it('carries the bounds the table declares', async () => {
    const host = await form();
    const numbers = [...host.querySelectorAll('input[type="number"]')];
    const bounds = numbers.map((el) => [el.min, el.max]);
    expect(bounds).toContainEqual(['0.9', '2.5']); // heightM
    expect(bounds).toContainEqual(['0', '99']); // heightCM
    expect(bounds).toContainEqual(['0', '300']); // weight
    expect(bounds).toContainEqual(['0', '200']); // chest
  });

  it('keeps the Height row as one label over two inputs', async () => {
    const host = await form();
    const heightLabel = [...host.querySelectorAll('label')].find(
      (l) => l.textContent.trim() === 'Height'
    );
    expect(heightLabel).toBeTruthy();
    expect(heightLabel.parentElement.querySelectorAll('.input2 input')).toHaveLength(2);
  });

  it('escapes what the author typed', async () => {
    const host = await form({ name: '"><img src=x onerror=boom>', notes: '<script>bad()' });
    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector('script')).toBeNull();
  });

  it('shows the value the buffer holds', async () => {
    const host = await form({ name: 'Aoi', notes: 'Swimmer', weight: 56 });
    const inputs = [...host.querySelectorAll('input')].map((el) => el.getAttribute('value'));
    expect(inputs).toContain('Aoi');
    expect(inputs).toContain('56');
    const notes = host.querySelector('textarea[data-field="notes"]');
    expect(notes.textContent).toBe('Swimmer');
  });
});
