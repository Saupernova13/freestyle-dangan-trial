// @vitest-environment jsdom
//
// Two ways the cast array and the bench disagreed.
//
// A `characters` array with the same id twice gave two slots the SAME object
// by reference, so editing one edited both with nothing to say they were
// linked. And storage seeded BLOCK_COUNT nulls but then wrote state.cast[i]
// for every index in the file, so a file with 20 entries grew the array to 20
// - renderCastGrid draws 17, buildTrialJson wrote all 20 back, and slots
// 18-20 were permanent, invisible and uneditable.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../js/ui/dialogs.js', () => ({
  alertDialog: vi.fn(async () => undefined),
  confirmDialog: vi.fn(async () => true),
  promptDialog: vi.fn(async () => ''),
  showToast: vi.fn(),
}));

const { state } = await import('../js/core/state.js');
const { loadCharactersFromIds } = await import('../js/core/trialAssets.js');
const { BLOCK_COUNT } = await import('../js/core/constants.js');
const { validateTrialData } = await import('../js/core/trialSchema.js');

// Characters/ is unreadable, so every listed id resolves to the _loadFailed
// placeholder. That is enough: this is about which SLOT gets what.
function noCharactersFolder() {
  return {
    name: 'trial',
    getDirectoryHandle: async () => {
      throw new Error('NotFoundError');
    },
  };
}

// A Characters/ folder holding exactly one character, so an id can resolve.
function withCharacter(charData) {
  const folder = {
    kind: 'directory',
    getFileHandle: async (name) => {
      if (name !== 'character.json') throw new Error('NotFoundError');
      return { getFile: async () => ({ text: async () => JSON.stringify(charData) }) };
    },
  };
  return {
    name: 'trial',
    getDirectoryHandle: async () => ({
      entries: async function* () {
        yield ['Folder', folder];
      },
    }),
  };
}

beforeEach(() => {
  state.dirHandle = noCharactersFolder();
  state.cast = [];
});

describe('loading the cast', () => {
  it('keeps the cast exactly as long as the bench', async () => {
    const ids = Array.from({ length: 20 }, (_, i) => `ch_${i}`);
    await loadCharactersFromIds(ids);
    expect(state.cast).toHaveLength(BLOCK_COUNT);
  });

  it('reports the ids it had to drop off the end', async () => {
    const ids = Array.from({ length: 20 }, (_, i) => `ch_${i}`);
    const result = await loadCharactersFromIds(ids);
    expect(result.overflow).toEqual(['ch_17', 'ch_18', 'ch_19']);
  });

  it('gives a repeated id only its first slot', async () => {
    const result = await loadCharactersFromIds(['ch_a', 'ch_b', 'ch_a']);
    expect(state.cast[0].id).toBe('ch_a');
    expect(state.cast[1].id).toBe('ch_b');
    expect(state.cast[2]).toBeNull();
    expect(result.duplicated).toEqual(['ch_a']);
  });

  it('never puts one object in two slots', async () => {
    // Needs a character that actually resolves: an unresolved id gets a fresh
    // placeholder each time, so the shared reference only shows for a real one.
    state.dirHandle = withCharacter({ id: 'ch_a', name: 'A', surname: 'One' });
    await loadCharactersFromIds(['ch_a', 'ch_a']);
    expect(state.cast[0]).not.toBe(state.cast[1]);
    expect(state.cast[1]).toBeNull();
  });

  it('leaves a well-formed cast alone', async () => {
    const result = await loadCharactersFromIds(['ch_a', null, 'ch_b']);
    expect(result.duplicated).toEqual([]);
    expect(result.overflow).toEqual([]);
    expect(state.cast.filter(Boolean).map((c) => c.id)).toEqual(['ch_a', 'ch_b']);
  });
});

describe('the validator mirrors the constraint', () => {
  function trial(characters) {
    return {
      trialName: 'T',
      characters,
      script: { lines: [] },
      metadata: { version: '4.0' },
    };
  }

  it('rejects a cast longer than the bench', () => {
    const issues = validateTrialData(trial(Array.from({ length: 18 }, (_, i) => `ch_${i}`)));
    expect(issues.some((m) => m.includes('the bench holds'))).toBe(true);
  });

  it('rejects a repeated id', () => {
    const issues = validateTrialData(trial(['ch_a', 'ch_a']));
    expect(issues.some((m) => m.includes("repeats the id 'ch_a'"))).toBe(true);
  });

  it('accepts repeated nulls, which are just empty benches', () => {
    const issues = validateTrialData(trial([null, null, 'ch_a']));
    expect(issues).toEqual([]);
  });
});
