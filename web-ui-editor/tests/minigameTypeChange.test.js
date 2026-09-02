// @vitest-environment jsdom
//
// Changing a minigame's gameType replaces typeSpecific wholesale, so
// switching a nonstop debate to mass panic destroys every authored dialogue
// line. changeScriptLineType confirms for the exactly analogous case; this
// path did it silently.
//
// The seeding was also inconsistent: four branches guarded on their own key,
// and the nonstop branch guarded on `!mg.typeSpecific`, which is never true
// for a minigame addMinigame created.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const confirmDialog = vi.fn(async () => true);

vi.mock('../js/ui/dialogs.js', () => ({
  alertDialog: vi.fn(async () => undefined),
  confirmDialog,
  promptDialog: vi.fn(async () => ''),
  showToast: vi.fn(),
}));
vi.mock('../js/core/storage.js', () => ({ autoSaveTrial: vi.fn(async () => {}) }));

const { state } = await import('../js/core/state.js');
const { updateMinigameField } = await import('../js/views/minigameView.js');

function seed(minigame) {
  state.minigames = [minigame];
  state.scriptLines = [];
  state.cast = [];
  state.truthBullets = [];
}

function nonstopWithLines() {
  return {
    gameId: 'mg_1',
    name: 'Debate',
    gameType: 'nonstop_debate',
    difficulty: 'medium',
    timeLimit: 60,
    typeSpecific: {
      selectedBullets: ['tb_1'],
      dialogueLines: [{ lineId: 'l1', sentenceBeginning: 'It was', target: 'you', order: 0 }],
    },
  };
}

beforeEach(() => {
  document.body.innerHTML = '<div id="mainGrid"></div>';
  window.icon = () => '';
  confirmDialog.mockClear();
  confirmDialog.mockResolvedValue(true);
});

describe('changing gameType', () => {
  it('asks before discarding authored content', async () => {
    seed(nonstopWithLines());
    await updateMinigameField('mg_1', 'gameType', 'mass_panic_debate');
    expect(confirmDialog).toHaveBeenCalledTimes(1);
  });

  it('keeps the old type and its content when the author cancels', async () => {
    confirmDialog.mockResolvedValue(false);
    seed(nonstopWithLines());
    await updateMinigameField('mg_1', 'gameType', 'mass_panic_debate');
    expect(state.minigames[0].gameType).toBe('nonstop_debate');
    expect(state.minigames[0].typeSpecific.dialogueLines).toHaveLength(1);
  });

  it('does not ask when there is nothing to lose', async () => {
    seed({
      gameId: 'mg_1',
      gameType: 'nonstop_debate',
      typeSpecific: { selectedBullets: [], dialogueLines: [] },
    });
    await updateMinigameField('mg_1', 'gameType', 'logic_dive');
    expect(confirmDialog).not.toHaveBeenCalled();
    expect(state.minigames[0].gameType).toBe('logic_dive');
  });

  it('does not ask when the type has not actually changed', async () => {
    seed(nonstopWithLines());
    await updateMinigameField('mg_1', 'gameType', 'nonstop_debate');
    expect(confirmDialog).not.toHaveBeenCalled();
    expect(state.minigames[0].typeSpecific.dialogueLines).toHaveLength(1);
  });

  it('seeds dialogueLines when switching TO nonstop debate', async () => {
    seed({ gameId: 'mg_1', gameType: 'logic_dive', typeSpecific: { questions: [] } });
    await updateMinigameField('mg_1', 'gameType', 'nonstop_debate');
    expect(state.minigames[0].typeSpecific.dialogueLines).toEqual([]);
    expect(state.minigames[0].typeSpecific.selectedBullets).toEqual([]);
  });

  it('leaves no keys from the old type behind, whichever way it switches', async () => {
    // The branches disagreed: four replaced typeSpecific wholesale, and the
    // nonstop one fell through to ensureTypeSpecific, which is additive - so
    // logic_dive -> nonstop_debate kept `questions` on a nonstop debate and
    // carried it into trial.json.
    seed({
      gameId: 'mg_1',
      gameType: 'logic_dive',
      typeSpecific: { questions: [{ questionId: 'q1', answers: [] }] },
    });
    await updateMinigameField('mg_1', 'gameType', 'nonstop_debate');
    expect(Object.keys(state.minigames[0].typeSpecific).sort()).toEqual([
      'dialogueLines',
      'selectedBullets',
    ]);

    seed(nonstopWithLines());
    await updateMinigameField('mg_1', 'gameType', 'logic_dive');
    expect(Object.keys(state.minigames[0].typeSpecific).sort()).toEqual(['questions']);
  });

  it('seeds every type it can switch to', async () => {
    const expected = {
      nonstop_debate: ['dialogueLines', 'selectedBullets'],
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
    for (const [type, keys] of Object.entries(expected)) {
      seed({ gameId: 'mg_1', gameType: 'closing_argument', typeSpecific: {} });
      await updateMinigameField('mg_1', 'gameType', type);
      expect(Object.keys(state.minigames[0].typeSpecific).sort(), type).toEqual(keys.sort());
    }
  });

  it('leaves other fields alone', async () => {
    seed(nonstopWithLines());
    await updateMinigameField('mg_1', 'name', 'Renamed');
    expect(confirmDialog).not.toHaveBeenCalled();
    expect(state.minigames[0].name).toBe('Renamed');
    expect(state.minigames[0].typeSpecific.dialogueLines).toHaveLength(1);
  });
});
