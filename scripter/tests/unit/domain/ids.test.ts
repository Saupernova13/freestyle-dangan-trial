import { describe, it, expect } from 'vitest';
import { generateId, generateCharacterId } from '../../../src/domain/ids.js';

describe('generateId', () => {
  it('produces IDs with the given prefix', () => {
    const id = generateId('line');
    expect(id).toMatch(/^line_\d+_[a-z0-9]{6}$/);
  });

  it('produces unique IDs on consecutive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId('test')));
    expect(ids.size).toBe(100);
  });

  it('supports different prefixes', () => {
    expect(generateId('mg')).toMatch(/^mg_/);
    expect(generateId('tb')).toMatch(/^tb_/);
    expect(generateId('dl')).toMatch(/^dl_/);
  });
});

describe('generateCharacterId', () => {
  it('produces character IDs in the expected format', () => {
    const id = generateCharacterId('Makoto', 'Naegi', '1993-02-05');
    expect(id).toMatch(/^NM_19930205_[A-Z0-9]{6}$/);
  });

  it('handles missing characters with defaults', () => {
    const id = generateCharacterId('', '', '2000-01-01');
    expect(id).toMatch(/^YX_20000101_[A-Z0-9]{6}$/);
  });

  it('strips non-alphanumeric characters from initials', () => {
    const id = generateCharacterId('$pecial', '!Name', '2000-01-01');
    // $ and ! are stripped, falls back to X/Y
    expect(id).toMatch(/^YX_20000101_/);
  });

  it('strips dashes from date of birth', () => {
    const id = generateCharacterId('A', 'B', '1999-12-31');
    expect(id).toContain('19991231');
  });
});
