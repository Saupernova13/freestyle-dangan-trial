import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { sanitizeTrialJson } from '../js/export.js';
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
