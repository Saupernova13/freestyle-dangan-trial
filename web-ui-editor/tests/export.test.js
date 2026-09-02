import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { addDirectoryToZip, countFilesInDirectory, sanitizeTrialJson } from '../js/export.js';
import { buildTrialJson } from '../js/core/trialSerialize.js';

describe('sanitizeTrialJson', () => {
  it('returns unparseable content untouched', () => {
    expect(sanitizeTrialJson('not json {')).toBe('not json {');
  });

  it('normalizes overlapping highlights against the line text', () => {
    const trial = {
      trialName: 'Test',
      script: {
        lines: [
          {
            id: 'line_1',
            type: 'speaking',
            dialogue: 'Hello world',
            highlights: [
              { startChar: 0, endChar: 8, color: '#FF0000' },
              { startChar: 4, endChar: 11, color: '#0000FF' },
            ],
          },
        ],
      },
    };

    const result = JSON.parse(sanitizeTrialJson(JSON.stringify(trial)));
    expect(result.script.lines[0].highlights).toEqual([
      { startChar: 0, endChar: 4, color: '#FF0000' },
      { startChar: 4, endChar: 11, color: '#0000FF' },
    ]);
  });

  it('clamps highlights left stale by a dialogue edit', () => {
    const trial = {
      script: {
        lines: [
          {
            id: 'line_1',
            type: 'narrator',
            text: 'Short',
            highlights: [{ startChar: 2, endChar: 50, color: '#00FF00' }],
          },
        ],
      },
    };

    const result = JSON.parse(sanitizeTrialJson(JSON.stringify(trial)));
    expect(result.script.lines[0].highlights).toEqual([
      { startChar: 2, endChar: 5, color: '#00FF00' },
    ]);
  });

  it('leaves trials without script lines untouched', () => {
    const trial = { trialName: 'Empty', minigames: [] };
    const result = JSON.parse(sanitizeTrialJson(JSON.stringify(trial)));
    expect(result).toEqual(trial);
  });

  it('preserves unrelated line fields', () => {
    const trial = {
      script: {
        lines: [{ id: 'line_1', type: 'minigame', minigameId: 'mg_1' }],
      },
    };
    const result = JSON.parse(sanitizeTrialJson(JSON.stringify(trial)));
    expect(result.script.lines[0]).toEqual({ id: 'line_1', type: 'minigame', minigameId: 'mg_1' });
  });
});

// The pre-flight validated buildTrialJson(state) while the zip took trial.json
// from disk, so the validated object and the shipped object were different
// files. Autosave is debounced 600 ms, so typing the last line of dialogue and
// clicking Export shipped a trial without it - and someone exporting to rescue
// work after a failed save got a zip missing exactly that work, reported as a
// success.
describe('the packaged trial.json', () => {
  const exportSource = readFileSync(new URL('../js/export.js', import.meta.url), 'utf8');
  const packagingBody = exportSource.slice(
    exportSource.indexOf('export async function exportToPlayableFile')
  );

  it('is built from state, not read back from disk', () => {
    expect(packagingBody).toContain(
      "zip.file('trial.json', sanitizeTrialJson(JSON.stringify(buildTrialJson(state)"
    );
    expect(packagingBody).not.toContain("getFileHandle('trial.json')");
  });

  it('carries an edit that has not reached disk yet', () => {
    const stateShape = {
      trialName: 'Rescue Me',
      cast: [],
      scriptLines: [{ id: 'line_1', type: 'narrator', text: 'The last thing I typed.' }],
      minigames: [],
      truthBullets: [],
    };
    const shipped = JSON.parse(
      sanitizeTrialJson(JSON.stringify(buildTrialJson(stateShape), null, 2))
    );
    expect(shipped.script.lines[0].text).toBe('The last thing I typed.');
    expect(shipped.trialName).toBe('Rescue Me');
  });
});

// countFilesInDirectory computed the true total and filesAdded only counted
// successes, but the two were never compared - so a locked file, an I/O error
// or a per-folder NotAllowedError produced a green "Exported … 214 files" over
// a trial missing sprites and voice lines.
describe('addDirectoryToZip', () => {
  function fileEntry(name, { fails = false } = {}) {
    return { kind: 'file', name, fails };
  }

  function dirHandle(entries, { unopenable = [] } = {}) {
    return {
      values: () => entries[Symbol.iterator](),
      getFileHandle: async (name) => {
        const entry = entries.find((e) => e.name === name);
        if (entry.fails) throw new Error('NotReadableError');
        return { getFile: async () => ({ arrayBuffer: async () => new ArrayBuffer(4) }) };
      },
      getDirectoryHandle: async (name) => {
        if (unopenable.includes(name)) throw new Error('NotAllowedError');
        return entries.find((e) => e.name === name).handle;
      },
    };
  }

  function zipStub() {
    const added = [];
    return { added, file: (path) => added.push(path) };
  }

  it('records a file it could not read and keeps going', async () => {
    const dir = dirHandle([
      fileEntry('a.png'),
      fileEntry('locked.png', { fails: true }),
      fileEntry('b.png'),
    ]);
    const zip = zipStub();
    const progress = { count: 1, total: 4, failed: [] };
    await addDirectoryToZip(zip, dir, '', null, progress);

    expect(progress.failed).toEqual(['locked.png']);
    // The other two still ship - the export is truncated, not abandoned.
    expect(zip.added).toEqual(['a.png', 'b.png']);
  });

  it('records a folder it could not open instead of aborting the export', async () => {
    const dir = dirHandle([fileEntry('a.png'), { kind: 'directory', name: 'Characters' }], {
      unopenable: ['Characters'],
    });
    const zip = zipStub();
    const progress = { count: 1, total: 3, failed: [] };
    await expect(addDirectoryToZip(zip, dir, '', null, progress)).resolves.toBeUndefined();

    expect(progress.failed).toEqual(['Characters/']);
    expect(zip.added).toEqual(['a.png']);
  });

  it('reports nothing when every file packages', async () => {
    const dir = dirHandle([fileEntry('a.png'), fileEntry('b.png')]);
    const progress = { count: 1, total: 3, failed: [] };
    await addDirectoryToZip(zipStub(), dir, '', null, progress);

    expect(progress.failed).toEqual([]);
    expect(progress.count).toBe(3);
  });

  it('counts what it can when a folder cannot be opened', async () => {
    // countFilesInDirectory used to throw here, aborting the export before
    // packaging started - the loud-but-total failure the walk avoids.
    const dir = dirHandle([fileEntry('a.png'), { kind: 'directory', name: 'Characters' }], {
      unopenable: ['Characters'],
    });
    await expect(countFilesInDirectory(dir)).resolves.toBe(1);
  });

  it('creates its own failure list when a caller does not pass one', async () => {
    const dir = dirHandle([fileEntry('locked.png', { fails: true })]);
    const progress = { count: 1, total: 2 };
    await addDirectoryToZip(zipStub(), dir, '', null, progress);

    expect(progress.failed).toEqual(['locked.png']);
  });
});
