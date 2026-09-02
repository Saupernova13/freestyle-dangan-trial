// Contract tests for schema/trial.schema.json, the normative trial.json
// contract. Two things must track it: js/core/trialSchema.js and the engine's
// trial_validator.gd. Comparing ajv's verdicts against the editor validator
// across the corpus is what stops silent drift.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { FORMAT_VERSION } from '../js/core/constants.js';
import { checkFormatVersion, validateTrialData } from '../js/core/trialSchema.js';
import { buildTrialJson } from '../js/core/trialSerialize.js';
import { sanitizeTrialJson } from '../js/export.js';

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(here, '../../schema/trial.schema.json');
const fixturePath = resolve(
  here,
  '../../freestyle-dangan-trial/tests/fixtures/minimal-trial/trial.json'
);

const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
const fixture = () => JSON.parse(readFileSync(fixturePath, 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
const ajvValidate = ajv.compile(schema);

// A minimal valid trial to base corpus mutations on.
const minimalTrial = () => ({
  trialName: 'T',
  characters: [],
  script: { lines: [] },
  metadata: { version: FORMAT_VERSION },
});

const speakingLine = (extra = {}) => ({
  id: 'line_1',
  order: 0,
  type: 'speaking',
  characterId: 'CH_1',
  dialogue: 'Hello.',
  ...extra,
});

// [name, buildTrial, expectValid]
const corpus = [
  ['fixture trial file', fixture, true],
  ['minimal empty trial', minimalTrial, true],
  [
    'narrator line',
    () => {
      const t = minimalTrial();
      t.script.lines = [{ id: 'l1', type: 'narrator', text: 'Silence.' }];
      return t;
    },
    true,
  ],
  [
    'minigame line with catalog entry',
    () => {
      const t = minimalTrial();
      t.script.lines = [{ id: 'l1', type: 'minigame', minigameId: 'mg_1' }];
      t.minigames = [{ gameId: 'mg_1', gameType: 'logic_dive' }];
      return t;
    },
    true,
  ],
  [
    'speaking line with nullable optionals',
    () => {
      const t = minimalTrial();
      t.script.lines = [speakingLine({ audioFile: null, spriteIndex: null })];
      return t;
    },
    true,
  ],
  [
    'unknown extra properties tolerated',
    () => {
      const t = minimalTrial();
      t.futureField = { anything: true };
      t.script.lines = [speakingLine({ someNewFlag: 1 })];
      t.metadata.extra = 'yes';
      return t;
    },
    true,
  ],
  [
    'older format version',
    () => {
      const t = minimalTrial();
      t.metadata.version = '3.0';
      return t;
    },
    true,
  ],
  [
    'characters with empty benches',
    () => {
      const t = minimalTrial();
      t.characters = ['CH_1', null, null];
      return t;
    },
    true,
  ],
  [
    'truth bullet with null image',
    () => {
      const t = minimalTrial();
      t.truthBullets = [{ bulletId: 'tb_1', name: 'B', imageFile: null }];
      return t;
    },
    true,
  ],
  [
    'highlighted speaking line',
    () => {
      const t = minimalTrial();
      t.script.lines = [
        speakingLine({ highlights: [{ startChar: 0, endChar: 3, color: '#FFAA00' }] }),
      ];
      return t;
    },
    true,
  ],
  ['root is an array', () => [], false],
  [
    'missing trialName',
    () => {
      const t = minimalTrial();
      delete t.trialName;
      return t;
    },
    false,
  ],
  [
    'trialName is a number',
    () => {
      const t = minimalTrial();
      t.trialName = 5;
      return t;
    },
    false,
  ],
  [
    'missing characters',
    () => {
      const t = minimalTrial();
      delete t.characters;
      return t;
    },
    false,
  ],
  [
    'characters entry is a number',
    () => {
      const t = minimalTrial();
      t.characters = [42];
      return t;
    },
    false,
  ],
  [
    'missing script',
    () => {
      const t = minimalTrial();
      delete t.script;
      return t;
    },
    false,
  ],
  [
    'script.lines not an array',
    () => {
      const t = minimalTrial();
      t.script.lines = {};
      return t;
    },
    false,
  ],
  [
    'script line without id',
    () => {
      const t = minimalTrial();
      const line = speakingLine();
      delete line.id;
      t.script.lines = [line];
      return t;
    },
    false,
  ],
  [
    'script line with unknown type',
    () => {
      const t = minimalTrial();
      t.script.lines = [{ id: 'l1', type: 'song' }];
      return t;
    },
    false,
  ],
  [
    'speaking line without dialogue',
    () => {
      const t = minimalTrial();
      const line = speakingLine();
      delete line.dialogue;
      t.script.lines = [line];
      return t;
    },
    false,
  ],
  [
    'narrator line without text',
    () => {
      const t = minimalTrial();
      t.script.lines = [{ id: 'l1', type: 'narrator' }];
      return t;
    },
    false,
  ],
  [
    'minigame line without minigameId',
    () => {
      const t = minimalTrial();
      t.script.lines = [{ id: 'l1', type: 'minigame' }];
      return t;
    },
    false,
  ],
  [
    'missing metadata',
    () => {
      const t = minimalTrial();
      delete t.metadata;
      return t;
    },
    false,
  ],
  [
    'version without minor part',
    () => {
      const t = minimalTrial();
      t.metadata.version = '4';
      return t;
    },
    false,
  ],
  [
    'minigame without gameId',
    () => {
      const t = minimalTrial();
      t.minigames = [{ gameType: 'logic_dive' }];
      return t;
    },
    false,
  ],
  [
    'minigame with unknown gameType',
    () => {
      const t = minimalTrial();
      t.minigames = [{ gameId: 'mg_1', gameType: 'karaoke' }];
      return t;
    },
    false,
  ],
  [
    'highlight with named color',
    () => {
      const t = minimalTrial();
      t.script.lines = [
        speakingLine({ highlights: [{ startChar: 0, endChar: 3, color: 'yellow' }] }),
      ];
      return t;
    },
    false,
  ],
  [
    'fractional spriteIndex',
    () => {
      const t = minimalTrial();
      t.script.lines = [speakingLine({ spriteIndex: 1.5 })];
      return t;
    },
    false,
  ],
  [
    'truth bullet without name',
    () => {
      const t = minimalTrial();
      t.truthBullets = [{ bulletId: 'tb_1' }];
      return t;
    },
    false,
  ],
  [
    'specialEffects as bare array',
    () => {
      const t = minimalTrial();
      t.script.lines = [speakingLine({ specialEffects: [] })];
      return t;
    },
    false,
  ],
  [
    // failComment is written by the editor, typed and used by the engine, and
    // tested by the engine - and was absent from the normative schema, so the
    // drift was permanently invisible to this cross-check.
    'minigame with a failComment',
    () => {
      const t = minimalTrial();
      t.minigames = [
        {
          gameId: 'mg_1',
          gameType: 'nonstop_debate',
          failComment: 'Not quite. Look again at the timeline.',
        },
      ];
      return t;
    },
    true,
  ],
  [
    'minigame whose failComment is not a string',
    () => {
      const t = minimalTrial();
      t.minigames = [{ gameId: 'mg_1', gameType: 'nonstop_debate', failComment: 42 }];
      return t;
    },
    false,
  ],
  [
    // No corpus line carried effects, so nothing exercised the shape the
    // editor actually writes - and both consumers of it tested `.length` on
    // the object, which is always undefined.
    'populated specialEffects',
    () => {
      const t = minimalTrial();
      t.script.lines = [
        speakingLine({
          specialEffects: { effects: [{ type: 'shake', intensity: 0.5, duration: 0.4 }] },
        }),
      ];
      return t;
    },
    true,
  ],
  [
    'line carrying every advanced field the modal can write',
    () => {
      const t = minimalTrial();
      t.script.lines = [
        speakingLine({
          spriteIndex: 2,
          audioFile: 'line_1.mp3',
          highlights: [{ startChar: 0, endChar: 5, color: '#FFFF00' }],
          cameraMotion: { type: 'zoom_in', duration: 1.5, easing: 'ease-in-out' },
          specialEffects: { effects: [{ type: 'flash' }] },
          dialogueBoxStyle: {
            style: 'slant_left',
            borderColor: '#FF0000',
            bgOpacity: 0.5,
            borderThickness: 4,
          },
        }),
      ];
      return t;
    },
    true,
  ],
];

describe('trial.schema.json and trialSchema.js agree', () => {
  it.each(corpus)('%s', (_name, build, expectValid) => {
    const data = build();
    const ajvVerdict = ajvValidate(data);
    const issues = validateTrialData(data);
    const handVerdict = issues.length === 0;
    expect(ajvVerdict, `ajv errors: ${JSON.stringify(ajvValidate.errors)}`).toBe(expectValid);
    expect(handVerdict, `hand-rolled issues: ${JSON.stringify(issues)}`).toBe(expectValid);
  });
});

describe('checkFormatVersion', () => {
  it('accepts the current version silently', () => {
    const res = checkFormatVersion(minimalTrial());
    expect(res.ok).toBe(true);
    expect(res.message).toBe('');
  });

  it('rejects files from a newer major version', () => {
    const t = minimalTrial();
    t.metadata.version = '5.0';
    const res = checkFormatVersion(t);
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/newer editor/);
  });

  it('accepts older majors with a warning message', () => {
    const t = minimalTrial();
    t.metadata.version = '3.2';
    const res = checkFormatVersion(t);
    expect(res.ok).toBe(true);
    expect(res.message).not.toBe('');
  });

  it('treats a missing version as legacy, not an error', () => {
    const t = minimalTrial();
    delete t.metadata;
    const res = checkFormatVersion(t);
    expect(res.ok).toBe(true);
    expect(res.message).toMatch(/legacy/);
  });
});

describe('export path keeps the contract', () => {
  it('sanitizeTrialJson output of the fixture still validates', () => {
    const out = JSON.parse(sanitizeTrialJson(readFileSync(fixturePath, 'utf8')));
    expect(ajvValidate(out), JSON.stringify(ajvValidate.errors)).toBe(true);
    expect(validateTrialData(out)).toEqual([]);
  });

  it('buildTrialJson output validates against the schema', () => {
    const f = fixture();
    const fakeState = {
      trialName: f.trialName,
      cast: [{ id: 'FC_20000101_FIXTUR', name: 'Fixture' }, null, null],
      scriptLines: f.script.lines,
      minigames: f.minigames.map((mg) => ({ ...mg, voiceLineBlob: 'runtime-junk' })),
      truthBullets: f.truthBullets.map((b) => ({ ...b, imageDataURL: 'data:image/png;...' })),
    };
    const out = JSON.parse(JSON.stringify(buildTrialJson(fakeState)));
    expect(ajvValidate(out), JSON.stringify(ajvValidate.errors)).toBe(true);
    expect(validateTrialData(out)).toEqual([]);
    expect(out.metadata.version).toBe(FORMAT_VERSION);
    expect(JSON.stringify(out)).not.toContain('voiceLineBlob');
    expect(JSON.stringify(out)).not.toContain('imageDataURL');
  });
});
