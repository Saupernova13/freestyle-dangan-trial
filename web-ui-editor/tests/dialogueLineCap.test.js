// @vitest-environment jsdom
//
// "30 dialogue lines is the cap" described a number that only hid the Add
// button. addDialogueLine pushed unconditionally, so any other route in
// walked straight past it - and the word "cap" is what would stop a future
// reader from adding the guard that was missing.
//
// debateScrumEditor caps its 8 arguments properly, in a sibling file, which
// is why its comment is true.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const showToast = vi.fn();

vi.mock('../js/ui/dialogs.js', () => ({
  alertDialog: vi.fn(async () => undefined),
  confirmDialog: vi.fn(async () => true),
  promptDialog: vi.fn(async () => ''),
  showToast,
}));
vi.mock('../js/core/storage.js', () => ({ autoSaveTrial: vi.fn(async () => {}) }));
vi.mock('../js/views/minigameView.js', async () => {
  const { state } = await import('../js/core/state.js');
  return {
    findMinigame: (gameId) => state.minigames.find((mg) => mg.gameId === gameId),
    renderMinigameDetails: vi.fn(),
  };
});

const { state } = await import('../js/core/state.js');
const { addDialogueLine } = await import('../js/views/minigames/nonstopDebateEditor.js');
const { addDebateScrumArgument } = await import('../js/views/minigames/debateScrumEditor.js');

function lines(count) {
  return Array.from({ length: count }, (_, i) => ({ lineId: `dl_${i}`, order: i }));
}

beforeEach(() => {
  window.icon = () => '';
  showToast.mockClear();
  state.minigames = [
    {
      gameId: 'mg_1',
      gameType: 'nonstop_debate',
      typeSpecific: { selectedBullets: [], dialogueLines: [] },
    },
  ];
});

describe('adding a dialogue line', () => {
  it('refuses past the cap rather than pushing anyway', () => {
    state.minigames[0].typeSpecific.dialogueLines = lines(30);
    addDialogueLine('mg_1');
    expect(state.minigames[0].typeSpecific.dialogueLines).toHaveLength(30);
  });

  it('says why, instead of failing silently', () => {
    state.minigames[0].typeSpecific.dialogueLines = lines(30);
    addDialogueLine('mg_1');
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(String(showToast.mock.calls[0][0])).toContain('30');
  });

  it('still adds the thirtieth', () => {
    state.minigames[0].typeSpecific.dialogueLines = lines(29);
    addDialogueLine('mg_1');
    expect(state.minigames[0].typeSpecific.dialogueLines).toHaveLength(30);
    expect(showToast).not.toHaveBeenCalled();
  });
});

describe('the scrum cap it was measured against', () => {
  it('still refuses past 8 arguments', () => {
    state.minigames = [
      {
        gameId: 'mg_1',
        gameType: 'debate_scrum',
        typeSpecific: {
          arguments: Array.from({ length: 8 }, (_, i) => ({ argumentId: `a_${i}`, order: i })),
        },
      },
    ];
    addDebateScrumArgument('mg_1');
    expect(state.minigames[0].typeSpecific.arguments).toHaveLength(8);
  });
});
