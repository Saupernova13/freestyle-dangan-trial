import { describe, it, expect } from 'vitest';
import { escapeHtml, formatAudioTime, normalizeHighlights } from '../js/utils.js';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<b>"a" & b</b>')).toBe('&lt;b&gt;&quot;a&quot; &amp; b&lt;/b&gt;');
  });

  it('escapes single quotes so single-quoted attributes cannot break out', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('stringifies non-string input', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(null)).toBe('null');
  });

  it('leaves plain text untouched', () => {
    expect(escapeHtml('Hello there!')).toBe('Hello there!');
  });
});

describe('formatAudioTime', () => {
  it('formats whole minutes and seconds', () => {
    expect(formatAudioTime(0)).toBe('0:00');
    expect(formatAudioTime(5)).toBe('0:05');
    expect(formatAudioTime(65)).toBe('1:05');
    expect(formatAudioTime(600)).toBe('10:00');
  });

  it('handles NaN and Infinity (unloaded audio metadata)', () => {
    expect(formatAudioTime(NaN)).toBe('0:00');
    expect(formatAudioTime(Infinity)).toBe('0:00');
  });

  it('truncates fractional seconds', () => {
    expect(formatAudioTime(61.9)).toBe('1:01');
  });
});

describe('normalizeHighlights', () => {
  it('returns [] for non-array input or empty text', () => {
    expect(normalizeHighlights(null, 10)).toEqual([]);
    expect(normalizeHighlights(undefined, 10)).toEqual([]);
    expect(normalizeHighlights([{ startChar: 0, endChar: 3, color: '#FF0000' }], 0)).toEqual([]);
  });

  it('passes through a valid in-bounds range', () => {
    expect(normalizeHighlights([{ startChar: 2, endChar: 5, color: '#FF0000' }], 10)).toEqual([
      { startChar: 2, endChar: 5, color: '#FF0000' },
    ]);
  });

  it('clamps out-of-bounds ranges to the text length', () => {
    expect(normalizeHighlights([{ startChar: -3, endChar: 99, color: '#00FF00' }], 5)).toEqual([
      { startChar: 0, endChar: 5, color: '#00FF00' },
    ]);
  });

  it('drops stale ranges entirely outside the text', () => {
    expect(normalizeHighlights([{ startChar: 20, endChar: 30, color: '#00FF00' }], 5)).toEqual([]);
  });

  it('later ranges repaint earlier ones (highlighter semantics)', () => {
    const result = normalizeHighlights(
      [
        { startChar: 0, endChar: 6, color: '#FF0000' },
        { startChar: 3, endChar: 9, color: '#0000FF' },
      ],
      10
    );
    expect(result).toEqual([
      { startChar: 0, endChar: 3, color: '#FF0000' },
      { startChar: 3, endChar: 9, color: '#0000FF' },
    ]);
  });

  it('merges adjacent same-color runs', () => {
    const result = normalizeHighlights(
      [
        { startChar: 0, endChar: 3, color: '#FF0000' },
        { startChar: 3, endChar: 6, color: '#FF0000' },
      ],
      10
    );
    expect(result).toEqual([{ startChar: 0, endChar: 6, color: '#FF0000' }]);
  });

  it('emits sorted, disjoint runs regardless of input order', () => {
    const result = normalizeHighlights(
      [
        { startChar: 6, endChar: 8, color: '#00FF00' },
        { startChar: 1, endChar: 3, color: '#FF0000' },
      ],
      10
    );
    expect(result).toEqual([
      { startChar: 1, endChar: 3, color: '#FF0000' },
      { startChar: 6, endChar: 8, color: '#00FF00' },
    ]);
  });

  it('replaces malformed colors with the default yellow', () => {
    expect(normalizeHighlights([{ startChar: 0, endChar: 2, color: 'red' }], 5)).toEqual([
      { startChar: 0, endChar: 2, color: '#FFFF00' },
    ]);
    expect(normalizeHighlights([{ startChar: 0, endChar: 2 }], 5)).toEqual([
      { startChar: 0, endChar: 2, color: '#FFFF00' },
    ]);
  });

  it('uppercases color hex values', () => {
    expect(normalizeHighlights([{ startChar: 0, endChar: 2, color: '#ff00aa' }], 5)).toEqual([
      { startChar: 0, endChar: 2, color: '#FF00AA' },
    ]);
  });

  it('accepts legacy startIndex/endIndex field names', () => {
    expect(normalizeHighlights([{ startIndex: 1, endIndex: 4, color: '#FF0000' }], 10)).toEqual([
      { startChar: 1, endChar: 4, color: '#FF0000' },
    ]);
  });

  it('skips malformed entries without dropping valid ones', () => {
    const result = normalizeHighlights(
      [
        null,
        'junk',
        { startChar: 'x', endChar: 'y' },
        { startChar: 0, endChar: 2, color: '#FF0000' },
      ],
      5
    );
    expect(result).toEqual([{ startChar: 0, endChar: 2, color: '#FF0000' }]);
  });
});
