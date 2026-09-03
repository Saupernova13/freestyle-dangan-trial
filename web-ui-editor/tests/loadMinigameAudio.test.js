// @vitest-environment jsdom
//
// The loader had no coverage at all, and every one of its failure paths is a
// console.warn - so a clip that stopped loading would show up as a preview
// that plays silence, with the only evidence in a console nobody has open.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../js/ui/dialogs.js', () => ({
  alertDialog: vi.fn(async () => undefined),
  confirmDialog: vi.fn(async () => true),
  promptDialog: vi.fn(async () => ''),
  showToast: vi.fn(),
}));

const { state } = await import('../js/core/state.js');
const { loadMinigameAudio } = await import('../js/core/storage.js');

// A directory tree of { 'Audio': { 'Minigames': { g1: { 'a.wav': 'contents' } } } }.
function dirHandle(tree) {
  const wrap = (node, name) => ({
    name,
    getDirectoryHandle: async (childName) => {
      const child = node[childName];
      if (!child || typeof child !== 'object') throw new Error('NotFoundError');
      return wrap(child, childName);
    },
    getFileHandle: async (fileName) => {
      const contents = node[fileName];
      if (typeof contents !== 'string') throw new Error('NotFoundError');
      return { getFile: async () => ({ name: fileName, contents }) };
    },
  });
  return wrap(tree, 'trial');
}

function audioTree(files) {
  return { Audio: { Minigames: { g1: files } } };
}

beforeEach(() => {
  state.minigames = [];
  state.dirHandle = null;
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('loading a trial folder that holds minigame audio', () => {
  it('hydrates a nonstop dialogue line', async () => {
    const line = { lineId: 'l1', voiceLineFile: 'a.wav' };
    state.minigames = [
      { gameId: 'g1', gameType: 'nonstop_debate', typeSpecific: { dialogueLines: [line] } },
    ];
    state.dirHandle = dirHandle(audioTree({ 'a.wav': 'clip' }));

    await loadMinigameAudio();

    expect(line.voiceLineBlob.contents).toBe('clip');
  });

  it('hydrates both sides of a scrum argument independently', async () => {
    const arg = {
      argumentId: 'a1',
      oppositionAudioFile: 'opp.wav',
      defenseAudioFile: 'def.wav',
    };
    state.minigames = [
      { gameId: 'g1', gameType: 'debate_scrum', typeSpecific: { arguments: [arg] } },
    ];
    state.dirHandle = dirHandle(audioTree({ 'opp.wav': 'one' }));

    await loadMinigameAudio();

    // The missing half does not take the present one down with it.
    expect(arg.oppositionAudioBlob.contents).toBe('one');
    expect(arg.defenseAudioBlob).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('argument a1 defense'),
      expect.anything()
    );
  });

  it('hydrates every filled speaker of a mass panic group', async () => {
    const group = {
      groupId: 'g',
      speaker1: { voiceLineFile: '1.wav' },
      speaker2: null,
      speaker3: { voiceLineFile: '3.wav' },
    };
    state.minigames = [
      { gameId: 'g1', gameType: 'mass_panic_debate', typeSpecific: { lineGroups: [group] } },
    ];
    state.dirHandle = dirHandle(audioTree({ '1.wav': 'one', '3.wav': 'three' }));

    await loadMinigameAudio();

    expect(group.speaker1.voiceLineBlob.contents).toBe('one');
    expect(group.speaker3.voiceLineBlob.contents).toBe('three');
  });

  it('carries on past a minigame with no audio folder', async () => {
    const line = { lineId: 'l1', voiceLineFile: 'a.wav' };
    state.minigames = [
      { gameId: 'missing', gameType: 'nonstop_debate', typeSpecific: { dialogueLines: [{}] } },
      { gameId: 'g1', gameType: 'nonstop_debate', typeSpecific: { dialogueLines: [line] } },
    ];
    state.dirHandle = dirHandle(audioTree({ 'a.wav': 'clip' }));

    await loadMinigameAudio();

    expect(line.voiceLineBlob.contents).toBe('clip');
  });

  it('does nothing at all when the trial has no Audio folder', async () => {
    state.minigames = [
      {
        gameId: 'g1',
        gameType: 'nonstop_debate',
        typeSpecific: { dialogueLines: [{ lineId: 'l1', voiceLineFile: 'a.wav' }] },
      },
    ];
    state.dirHandle = dirHandle({});

    await expect(loadMinigameAudio()).resolves.toBeUndefined();
    expect(state.minigames[0].typeSpecific.dialogueLines[0].voiceLineBlob).toBeUndefined();
  });

  it('survives a trial.json whose line list is not a list', async () => {
    state.minigames = [
      { gameId: 'g1', gameType: 'nonstop_debate', typeSpecific: { dialogueLines: 'oops' } },
    ];
    state.dirHandle = dirHandle(audioTree({}));

    await expect(loadMinigameAudio()).resolves.toBeUndefined();
  });
});
