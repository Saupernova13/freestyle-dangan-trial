// @vitest-environment jsdom
//
// jsdom because the editors transitively import app.js, which needs a DOM at
// module scope (#53).
//
// All five minigame editors seeded typeSpecific defaults inside their render
// function, so expanding a card mutated trial data and the next autosave
// persisted it - invisible to undo, since those writes never passed through
// recordChange. Three also sorted the live array in place, with a comparator
// that returns NaN for any item missing `order`; renderMinigameDetails runs
// after every field edit, so the author watched lines reshuffle as they typed.
import { describe, expect, it } from 'vitest';
import {
  ensureAllTypeSpecific,
  ensureTypeSpecific,
  normalizeOrder,
  orderedCopy,
} from '../js/core/minigameDefaults.js';
import { renderNonstopDebateEditor } from '../js/views/minigames/nonstopDebateEditor.js';
import { renderHangmansGambitEditor } from '../js/views/minigames/hangmansGambitEditor.js';

describe('ensureTypeSpecific', () => {
  it('seeds the keys each type expects', () => {
    const cases = {
      nonstop_debate: ['selectedBullets', 'dialogueLines'],
      mass_panic_debate: [
        'lineGroups',
        'speaker1CharacterId',
        'speaker2CharacterId',
        'speaker3CharacterId',
      ],
      logic_dive: ['questions'],
      hangmans_gambit: ['answerKey'],
      debate_scrum: ['arguments'],
    };
    for (const [gameType, keys] of Object.entries(cases)) {
      const mg = ensureTypeSpecific({ gameId: 'mg', gameType });
      expect(Object.keys(mg.typeSpecific).sort(), gameType).toEqual([...keys].sort());
    }
  });

  it('never replaces authored content', () => {
    const mg = {
      gameId: 'mg',
      gameType: 'nonstop_debate',
      typeSpecific: { dialogueLines: [{ lineId: 'l1', order: 0 }] },
    };
    ensureTypeSpecific(mg);
    expect(mg.typeSpecific.dialogueLines).toHaveLength(1);
    expect(mg.typeSpecific.selectedBullets).toEqual([]);
  });

  it('gives an unknown type an empty payload rather than throwing', () => {
    const mg = ensureTypeSpecific({ gameId: 'mg', gameType: 'psyche_taxi' });
    expect(mg.typeSpecific).toEqual({});
  });

  it('replaces a typeSpecific that is not an object', () => {
    const mg = ensureTypeSpecific({ gameId: 'mg', gameType: 'logic_dive', typeSpecific: [] });
    expect(mg.typeSpecific.questions).toEqual([]);
  });
});

describe('normalizeOrder', () => {
  it('numbers items that have no order', () => {
    const mg = {
      gameType: 'debate_scrum',
      typeSpecific: { arguments: [{ argumentId: 'a' }, { argumentId: 'b', order: 7 }] },
    };
    normalizeOrder(mg);
    expect(mg.typeSpecific.arguments.map((a) => a.order)).toEqual([0, 7]);
  });

  it('leaves a type with no ordered list alone', () => {
    const mg = { gameType: 'hangmans_gambit', typeSpecific: { answerKey: 'KNIFE' } };
    expect(() => normalizeOrder(mg)).not.toThrow();
  });
});

describe('orderedCopy', () => {
  it('does not reorder the array it was given', () => {
    // Array.prototype.sort mutates, and these arrays are live trial data.
    const list = [{ order: 2 }, { order: 1 }];
    const sorted = orderedCopy(list);
    expect(sorted.map((x) => x.order)).toEqual([1, 2]);
    expect(list.map((x) => x.order)).toEqual([2, 1]);
  });

  it('treats a missing order as 0 instead of producing NaN', () => {
    const sorted = orderedCopy([{ id: 'b', order: 1 }, { id: 'a' }]);
    expect(sorted.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('tolerates a non-array', () => {
    expect(orderedCopy(undefined)).toEqual([]);
  });
});

describe('the editors', () => {
  it('do not seed typeSpecific as a side effect of rendering', () => {
    window.icon = () => '';
    for (const [gameType, render] of [
      ['nonstop_debate', renderNonstopDebateEditor],
      ['hangmans_gambit', renderHangmansGambitEditor],
    ]) {
      const mg = { gameId: 'mg', gameType };
      render(mg);
      expect(mg.typeSpecific, gameType).toBeUndefined();
    }
  });

  it('do not reorder a live list as a side effect of rendering', () => {
    window.icon = () => '';
    const mg = {
      gameId: 'mg',
      gameType: 'nonstop_debate',
      typeSpecific: {
        selectedBullets: [],
        dialogueLines: [
          { lineId: 'l2', order: 1 },
          { lineId: 'l1', order: 0 },
        ],
      },
    };
    renderNonstopDebateEditor(mg);
    expect(mg.typeSpecific.dialogueLines.map((l) => l.lineId)).toEqual(['l2', 'l1']);
  });
});

describe('ensureAllTypeSpecific', () => {
  it('seeds every minigame at load', () => {
    const minigames = ensureAllTypeSpecific([
      { gameId: 'a', gameType: 'logic_dive' },
      { gameId: 'b', gameType: 'debate_scrum' },
    ]);
    expect(minigames[0].typeSpecific.questions).toEqual([]);
    expect(minigames[1].typeSpecific.arguments).toEqual([]);
  });

  it('tolerates a missing list', () => {
    expect(ensureAllTypeSpecific(undefined)).toBeUndefined();
  });
});
