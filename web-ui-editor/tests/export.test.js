import { describe, it, expect } from 'vitest';
import { sanitizeTrialJson } from '../js/export.js';

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
