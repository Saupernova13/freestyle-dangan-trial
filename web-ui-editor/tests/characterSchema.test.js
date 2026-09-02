// Contract tests for schema/character.schema.json. Roughly half the on-disk
// trial format had no schema, no validator, no CI check and no version, while
// trial.json had all four. The engine consumes character.json as an untyped
// Dictionary, so a missing id produced a character the trial references and
// cannot resolve - the `character_id == "null"` guard in character_library.gd
// is a scar from exactly that.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { CHARACTER_FORMAT_VERSION } from '../js/core/constants.js';
import { checkCharacterFormatVersion, validateCharacterData } from '../js/core/characterSchema.js';

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(
  readFileSync(resolve(here, '../../schema/character.schema.json'), 'utf8')
);
const fixture = JSON.parse(
  readFileSync(
    resolve(
      here,
      '../../freestyle-dangan-trial/tests/fixtures/minimal-trial/Characters/Fixture_Chan/character.json'
    ),
    'utf8'
  )
);

const ajvValidate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

const valid = () => ({
  id: 'SJ_20000101_AAA',
  name: 'Sakura',
  surname: 'Jin',
  heightM: 1.7,
  heightCM: 5,
  weight: 60,
  chest: 80,
  blood: 'A',
  dob: '2000-01-01',
  likes: 'Tea',
  dislikes: 'Lies',
  notes: 'Ultimate Something',
  isHeadmaster: false,
  position: 3,
  lastModified: '2026-01-01T00:00:00.000Z',
});

// [name, build, expectValid]
const corpus = [
  ['the shared fixture character', () => fixture, true],
  ['a fully populated character', valid, true],
  ['the minimum the engine needs', () => ({ id: 'A_1', name: 'A', surname: 'B' }), true],
  [
    'a draft with empty profile fields',
    () => ({ ...valid(), likes: '', dislikes: '', notes: '', dob: '' }),
    true,
  ],
  ['a character carrying its format version', () => ({ ...valid(), formatVersion: '1.0' }), true],
  [
    // Allowed on purpose, so a newer editor's field cannot make an older one
    // reject the file.
    'a character with a field neither side knows',
    () => ({ ...valid(), favouriteColour: 'purple' }),
    true,
  ],
  ['no id', () => ({ name: 'A', surname: 'B' }), false],
  [
    'an id that could break out of a handler',
    () => ({ ...valid(), id: "a'); alert(1); ('" }),
    false,
  ],
  ['no name', () => ({ id: 'A_1', surname: 'B' }), false],
  ['no surname', () => ({ id: 'A_1', name: 'A' }), false],
  ['a numeric name', () => ({ ...valid(), name: 42 }), false],
  ['a string height', () => ({ ...valid(), heightM: '1.7' }), false],
  ['a string weight', () => ({ ...valid(), weight: '60' }), false],
  ['isHeadmaster as a string', () => ({ ...valid(), isHeadmaster: 'yes' }), false],
  ['a position past the headmaster bench', () => ({ ...valid(), position: 17 }), false],
  ['a negative position', () => ({ ...valid(), position: -1 }), false],
  ['a fractional position', () => ({ ...valid(), position: 1.5 }), false],
  ['a malformed formatVersion', () => ({ ...valid(), formatVersion: 'one' }), false],
];

describe('character.schema.json and characterSchema.js agree', () => {
  it.each(corpus)('%s', (_name, build, expectValid) => {
    const data = build();
    const ajvVerdict = ajvValidate(data);
    const issues = validateCharacterData(data);
    expect(ajvVerdict, `ajv errors: ${JSON.stringify(ajvValidate.errors)}`).toBe(expectValid);
    expect(issues.length === 0, `hand-rolled issues: ${JSON.stringify(issues)}`).toBe(expectValid);
  });

  it('rejects something that is not an object at all', () => {
    for (const value of [null, 42, 'text', []]) {
      expect(validateCharacterData(value).length, String(value)).toBeGreaterThan(0);
    }
  });
});

describe('checkCharacterFormatVersion', () => {
  it('accepts the current version', () => {
    const res = checkCharacterFormatVersion({ formatVersion: CHARACTER_FORMAT_VERSION });
    expect(res.ok).toBe(true);
    expect(res.message).toBe('');
  });

  it('accepts a file written before the field existed', () => {
    // Every character.json on disk today is one of these.
    expect(checkCharacterFormatVersion({ id: 'A_1' }).ok).toBe(true);
  });

  it('refuses a newer major, matching how trial.json is gated', () => {
    const res = checkCharacterFormatVersion({ formatVersion: '99.0' });
    expect(res.ok).toBe(false);
    expect(res.message).toContain('newer editor');
  });

  it('accepts a newer minor, since minors are additive', () => {
    expect(checkCharacterFormatVersion({ formatVersion: '1.99' }).ok).toBe(true);
  });
});
