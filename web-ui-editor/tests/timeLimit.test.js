// @vitest-environment jsdom
//
// The time limit input ran parseInt(this.value) inline. Clearing the box gives
// NaN, JSON.stringify writes NaN as null, and the schema declares timeLimit a
// number - so the file was invalid. writeTrialJson only console.warns, and
// both ends then substituted 60 silently: the engine falls back at parse time
// and the field re-renders as `mg.timeLimit || 60`. Clearing the box intending
// to retype "45" left a trial that looked like it said 60 forever after.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const showToast = vi.fn();

vi.mock('../js/ui/dialogs.js', () => ({
  alertDialog: vi.fn(async () => undefined),
  confirmDialog: vi.fn(async () => true),
  promptDialog: vi.fn(async () => ''),
  showToast,
}));
vi.mock('../js/core/storage.js', () => ({ autoSaveTrial: vi.fn(async () => {}) }));

const { state } = await import('../js/core/state.js');
const { updateMinigameTimeLimit } = await import('../js/views/minigameView.js');
const { validateTrialData } = await import('../js/core/trialSchema.js');

beforeEach(() => {
  document.body.innerHTML = '<div id="mainGrid"></div>';
  window.icon = () => '';
  showToast.mockClear();
  state.cast = [];
  state.scriptLines = [];
  state.truthBullets = [];
  state.minigames = [
    {
      gameId: 'mg_1',
      name: 'Debate',
      gameType: 'nonstop_debate',
      difficulty: 'medium',
      timeLimit: 45,
      typeSpecific: { selectedBullets: [], dialogueLines: [] },
    },
  ];
});

describe('the time limit field', () => {
  it('keeps the stored value when the box is cleared', () => {
    updateMinigameTimeLimit('mg_1', '');
    expect(state.minigames[0].timeLimit).toBe(45);
  });

  it('says why rather than failing silently', () => {
    updateMinigameTimeLimit('mg_1', '');
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it('accepts a real number', () => {
    updateMinigameTimeLimit('mg_1', '90');
    expect(state.minigames[0].timeLimit).toBe(90);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('accepts 0, which the engine reads as no time limit', () => {
    updateMinigameTimeLimit('mg_1', '0');
    expect(state.minigames[0].timeLimit).toBe(0);
  });

  it('refuses values outside the range the schema allows', () => {
    updateMinigameTimeLimit('mg_1', '-5');
    updateMinigameTimeLimit('mg_1', '4000');
    updateMinigameTimeLimit('mg_1', 'abc');
    expect(state.minigames[0].timeLimit).toBe(45);
    expect(showToast).toHaveBeenCalledTimes(3);
  });

  it('never leaves a value the validator would reject', () => {
    for (const raw of ['', 'abc', '-1', '99999', '30']) updateMinigameTimeLimit('mg_1', raw);
    const issues = validateTrialData({
      trialName: 'T',
      characters: [],
      script: { lines: [] },
      minigames: state.minigames,
      metadata: { version: '4.0' },
    });
    expect(issues.filter((m) => m.includes('timeLimit'))).toEqual([]);
  });
});
