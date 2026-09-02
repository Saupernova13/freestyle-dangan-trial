// @vitest-environment jsdom
//
// expandedSections is keyed by lineId and lives for the life of the page. It
// was never pruned, so it grew by one entry per deleted line and never shrank.
// Small in absolute terms, but the delete path it belongs in already exists.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../js/ui/dialogs.js', () => ({
  alertDialog: vi.fn(async () => undefined),
  confirmDialog: vi.fn(async () => true),
  promptDialog: vi.fn(async () => ''),
  showToast: vi.fn(),
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
const { deleteDialogueLine, toggleSection, isSectionExpanded } = await import(
  '../js/views/minigames/nonstopDebateEditor.js'
);

function lines(count) {
  return Array.from({ length: count }, (_, i) => ({ lineId: `dl_${i}`, order: i }));
}

beforeEach(() => {
  window.icon = () => '';
  state.dirHandle = null;
  state.minigames = [
    {
      gameId: 'mg_1',
      gameType: 'nonstop_debate',
      typeSpecific: { selectedBullets: [], dialogueLines: lines(2) },
    },
  ];
});

describe('per-line collapse state', () => {
  // expandedSections is keyed by lineId and lives for the life of the page, so
  // without pruning it grows by one entry per deleted line and never shrinks.
  it('is forgotten when its line is deleted', async () => {
    toggleSection('dl_0', 'audio');
    expect(isSectionExpanded('dl_0', 'audio')).toBe(true);

    await deleteDialogueLine('mg_1', 'dl_0');
    expect(isSectionExpanded('dl_0', 'audio')).toBe(false);
  });

  it('leaves the surviving lines' + String.fromCharCode(39) + ' state alone', async () => {
    toggleSection('dl_1', 'audio');

    await deleteDialogueLine('mg_1', 'dl_0');
    expect(isSectionExpanded('dl_1', 'audio')).toBe(true);
  });
});
