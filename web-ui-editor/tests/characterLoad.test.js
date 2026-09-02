// @vitest-environment jsdom
//
// A cast slot left null for a character whose folder could not be read was
// erased from trial.json by the next keystroke: buildTrialJson writes
// `cast.map(c => c ? c.id : null)`, so autosave dropped the id while the
// folder was still on disk, and the speaking lines referencing it kept
// rendering with a blank speaker.
import { beforeEach, describe, expect, it } from 'vitest';
import { BLOCK_COUNT } from '../js/core/constants.js';
import { state } from '../js/core/state.js';
import { loadCharactersFromIds } from '../js/core/storage.js';
import { buildTrialJson } from '../js/core/trialSerialize.js';

const GOOD = { id: 'FC_1', name: 'Fixture', surname: 'Chan' };

// Minimal stand-ins for the File System Access handles storage.js walks.
function fileHandle(text) {
  return { getFile: async () => ({ text: async () => text, name: 'character.json' }) };
}

function characterFolder(name, charJsonText, { missing = false } = {}) {
  return [
    name,
    {
      kind: 'directory',
      getFileHandle: async (fileName) => {
        if (fileName === 'character.json') {
          if (missing) throw new Error('NotFoundError');
          return fileHandle(charJsonText);
        }
        throw new Error('NotFoundError'); // no sprite_01.png
      },
    },
  ];
}

function dirHandleWith(folders) {
  return {
    getDirectoryHandle: async (name) => {
      if (name !== 'Characters') throw new Error('NotFoundError');
      return { entries: () => folders[Symbol.iterator]() };
    },
  };
}

beforeEach(() => {
  state.cast = Array(BLOCK_COUNT).fill(null);
  state.trialName = 'T';
  state.scriptLines = [];
  state.minigames = [];
  state.truthBullets = [];
});

describe('loadCharactersFromIds', () => {
  it('loads a readable character and reports nothing unresolved', async () => {
    state.dirHandle = dirHandleWith([characterFolder('Fixture_Chan', JSON.stringify(GOOD))]);
    const { unresolved } = await loadCharactersFromIds(['FC_1']);

    expect(unresolved).toEqual([]);
    expect(state.cast[0].name).toBe('Fixture');
  });

  it('keeps the id in the slot when character.json will not parse', async () => {
    state.dirHandle = dirHandleWith([characterFolder('Broken', '{"id": "FC_1"')]);
    const { unresolved } = await loadCharactersFromIds(['FC_1']);

    expect(unresolved).toEqual(['FC_1']);
    expect(state.cast[0]).toMatchObject({ id: 'FC_1', _loadFailed: true });
  });

  it('so autosave cannot erase the character from trial.json', async () => {
    state.dirHandle = dirHandleWith([characterFolder('Broken', 'not json at all')]);
    await loadCharactersFromIds(['FC_1']);

    // The exact chain from the report: one keystroke, autosave, id gone.
    expect(buildTrialJson(state).characters[0]).toBe('FC_1');
  });

  it('treats a folder with no character.json as an ordinary folder, not a failure', async () => {
    state.dirHandle = dirHandleWith([
      characterFolder('Notes', null, { missing: true }),
      characterFolder('Fixture_Chan', JSON.stringify(GOOD)),
    ]);
    const { unresolved } = await loadCharactersFromIds(['FC_1']);

    expect(unresolved).toEqual([]);
    expect(state.cast[0].name).toBe('Fixture');
  });

  it('reports an id that no folder provides at all', async () => {
    state.dirHandle = dirHandleWith([characterFolder('Fixture_Chan', JSON.stringify(GOOD))]);
    const { unresolved } = await loadCharactersFromIds(['FC_1', 'FC_MISSING']);

    expect(unresolved).toEqual(['FC_MISSING']);
    expect(buildTrialJson(state).characters.slice(0, 2)).toEqual(['FC_1', 'FC_MISSING']);
  });

  it('leaves genuinely empty slots empty', async () => {
    state.dirHandle = dirHandleWith([characterFolder('Fixture_Chan', JSON.stringify(GOOD))]);
    const { unresolved } = await loadCharactersFromIds([null, 'FC_1']);

    expect(unresolved).toEqual([]);
    expect(state.cast[0]).toBeNull();
    expect(buildTrialJson(state).characters[0]).toBeNull();
  });

  it('holds every listed id when Characters/ itself cannot be opened', async () => {
    state.dirHandle = {
      getDirectoryHandle: async () => {
        throw new Error('NotAllowedError');
      },
    };
    expect((await loadCharactersFromIds(['FC_1', null, 'FC_2'])).unresolved).toEqual([
      'FC_1',
      'FC_2',
    ]);
    // A per-folder permission error must not cost the whole cast either.
    expect(buildTrialJson(state).characters.slice(0, 3)).toEqual(['FC_1', null, 'FC_2']);
  });
});
