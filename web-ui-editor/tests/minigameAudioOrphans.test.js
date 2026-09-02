// @vitest-environment jsdom
//
// Deleting a nonstop dialogue line or a scrum argument left its voice clip on
// disk. addDirectoryToZip walks the real directory tree, so every orphan
// ships in every .drtrial from then on, inflating a file the author has to
// distribute - which is the exact rationale app.js:342 gives for the pattern.
//
// deleteMassPanicLineGroup already got this right, in a sibling file, with a
// comment explaining why the delete is awaited.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const removed = [];

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
const { deleteDialogueLine } = await import('../js/views/minigames/nonstopDebateEditor.js');
const { deleteDebateScrumArgument } = await import(
  '../js/views/minigames/debateScrumEditor.js'
);
const { deleteMassPanicLineGroup } = await import(
  '../js/views/minigames/massPanicDebateEditor.js'
);

// Audio/Minigames/<gameId>/, recording what gets removed.
function audioFolder() {
  return {
    name: 'trial',
    getDirectoryHandle: async () => ({
      getDirectoryHandle: async () => ({
        getDirectoryHandle: async () => ({
          removeEntry: async (name) => removed.push(name),
        }),
      }),
    }),
  };
}

beforeEach(() => {
  document.body.innerHTML = '<div id="mainGrid"></div>';
  window.icon = () => '';
  removed.length = 0;
  state.dirHandle = audioFolder();
  state.scriptLines = [];
});

describe('deleting a nonstop dialogue line', () => {
  beforeEach(() => {
    state.minigames = [
      {
        gameId: 'mg_1',
        gameType: 'nonstop_debate',
        typeSpecific: {
          selectedBullets: [],
          dialogueLines: [
            { lineId: 'l1', order: 0, voiceLineFile: 'l1.mp3' },
            { lineId: 'l2', order: 1, voiceLineFile: 'l2.mp3' },
          ],
        },
      },
    ];
  });

  it('takes its voice clip with it', async () => {
    await deleteDialogueLine('mg_1', 'l1');
    expect(removed).toEqual(['l1.mp3']);
  });

  it('leaves the other lines and their clips alone', async () => {
    await deleteDialogueLine('mg_1', 'l1');
    expect(state.minigames[0].typeSpecific.dialogueLines.map((l) => l.lineId)).toEqual(['l2']);
    expect(removed).not.toContain('l2.mp3');
  });

  it('does not try to remove anything for a line with no audio', async () => {
    state.minigames[0].typeSpecific.dialogueLines[0].voiceLineFile = '';
    await deleteDialogueLine('mg_1', 'l1');
    expect(removed).toEqual([]);
  });
});

describe('deleting a scrum argument', () => {
  beforeEach(() => {
    state.minigames = [
      {
        gameId: 'mg_1',
        gameType: 'debate_scrum',
        typeSpecific: {
          arguments: [
            {
              argumentId: 'a1',
              order: 0,
              oppositionAudioFile: 'opp.mp3',
              defenseAudioFile: 'def.mp3',
            },
          ],
        },
      },
    ];
  });

  it('takes both of its clips with it', async () => {
    // The confirmation promises "their audio go with it" - two files.
    await deleteDebateScrumArgument('mg_1', 'a1');
    expect(removed.sort()).toEqual(['def.mp3', 'opp.mp3']);
  });
});

describe('the mass panic path, which already did this', () => {
  it('still removes all three speaker clips', async () => {
    state.minigames = [
      {
        gameId: 'mg_1',
        gameType: 'mass_panic_debate',
        typeSpecific: {
          lineGroups: [
            {
              groupId: 'g1',
              order: 0,
              speaker1: { voiceLineFile: 's1.mp3' },
              speaker2: { voiceLineFile: 's2.mp3' },
              speaker3: { voiceLineFile: 's3.mp3' },
            },
          ],
        },
      },
    ];
    await deleteMassPanicLineGroup('mg_1', 'g1');
    expect(removed.sort()).toEqual(['s1.mp3', 's2.mp3', 's3.mp3']);
  });
});
