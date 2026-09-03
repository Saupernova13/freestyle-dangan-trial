// @vitest-environment jsdom
//
// The preset swatches were written out by hand with their hex inline, and
// selectHighlightColor then read each color back out of btn.style.background -
// which the browser serializes to rgb() - and converted it to hex again just
// to decide which swatch was active. The source of truth for "which colors are
// presets" was a CSS inline style on generated markup, and a whole
// rgb()-to-hex parser existed to read it back.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../js/modals/scriptLineModal.js', () => ({
  renderScriptLineModal: vi.fn(),
  failField: vi.fn(),
}));

const { sl } = await import('../js/modals/scriptLine/state.js');
const { state } = await import('../js/core/state.js');
const { renderHighlightingTab, selectHighlightColor } = await import(
  '../js/modals/scriptLine/highlightingTab.js'
);
const { failField } = await import('../js/modals/scriptLineModal.js');

const LINE = { id: 'l1', type: 'speaking', dialogue: 'Hello there' };

function mountTab(currentColor = '#FFFF00') {
  state.scriptLines = [LINE];
  sl.activeLineId = 'l1';
  sl.fields.highlights = [];
  sl.highlighting = { startChar: 0, endChar: 0, currentColor };
  document.body.innerHTML = `<div id="host"></div>`;
  document.getElementById('host').innerHTML = renderHighlightingTab(LINE);
  return document.getElementById('host');
}

const presets = () => [...document.querySelectorAll('.color-preset')];
const activeColors = () =>
  presets()
    .filter((btn) => btn.classList.contains('active'))
    .map((btn) => btn.dataset.color);

beforeEach(() => {
  vi.clearAllMocks();
  window.icon = () => '';
});

describe('the preset swatches', () => {
  it('carries its color as data, not only as a style', () => {
    // The style is for the eye; the data attribute is what the code reads.
    mountTab();
    expect(presets()).toHaveLength(3);
    for (const btn of presets()) {
      expect(btn.dataset.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(btn.style.background).toBeTruthy();
    }
  });

  it('marks the swatch that matches the current color', () => {
    mountTab('#FF0000');
    expect(activeColors()).toEqual(['#FF0000']);
  });

  it('marks it whatever case the color arrived in', () => {
    // The <input type="color"> reports lowercase hex, so an exact === here
    // left the swatch unmarked for a color that is a preset.
    mountTab('#ff0000');
    expect(activeColors()).toEqual(['#FF0000']);
  });

  it('marks nothing for a custom color', () => {
    mountTab('#123456');
    expect(activeColors()).toEqual([]);
  });
});

describe('picking a color', () => {
  it('moves the active mark to the chosen preset', () => {
    mountTab('#FFFF00');
    selectHighlightColor('#00FF00');
    expect(activeColors()).toEqual(['#00FF00']);
    expect(sl.highlighting.currentColor).toBe('#00FF00');
  });

  it('recognises a preset from the color input, in lowercase', () => {
    // This is what the rgb() round trip was for: the button's serialized
    // style never matched the picker's lowercase hex directly.
    mountTab('#FFFF00');
    selectHighlightColor('#00ff00');
    expect(activeColors()).toEqual(['#00FF00']);
  });

  it('clears every mark for a color that is not a preset', () => {
    mountTab('#FFFF00');
    selectHighlightColor('#123456');
    expect(activeColors()).toEqual([]);
  });

  it('updates the color readout', () => {
    mountTab();
    selectHighlightColor('#00FF00');
    expect(document.querySelector('.current-color-preview span').textContent).toBe('#00FF00');
  });

  it('rejects a value that is not a hex color', () => {
    mountTab('#FFFF00');
    selectHighlightColor('red');
    expect(failField).toHaveBeenCalled();
    expect(sl.highlighting.currentColor).toBe('#FFFF00');
  });
});

describe('the preview repaint', () => {
  it('shows the in-progress selection in the current color', () => {
    mountTab('#FFFF00');
    sl.highlighting.startChar = 0;
    sl.highlighting.endChar = 5;
    selectHighlightColor('#FF0000');

    const preview = document.getElementById('highlight-unified-preview');
    const span = preview.querySelector('span');
    expect(span.textContent).toBe('Hello');
    expect(span.style.color).toBe('rgb(255, 0, 0)');
  });

  it('leaves already-added highlights alone', () => {
    mountTab('#FFFF00');
    sl.fields.highlights = [{ startChar: 6, endChar: 11, color: '#00FF00' }];
    sl.highlighting.startChar = 0;
    sl.highlighting.endChar = 5;
    selectHighlightColor('#FF0000');

    const spans = [...document.querySelectorAll('#highlight-unified-preview span')];
    expect(spans.map((s) => s.textContent)).toEqual(['Hello', 'there']);
    expect(spans[1].style.color).toBe('rgb(0, 255, 0)');
  });

  it('paints nothing extra when there is no selection', () => {
    mountTab('#FFFF00');
    selectHighlightColor('#FF0000');
    expect(document.querySelectorAll('#highlight-unified-preview span')).toHaveLength(0);
    expect(document.getElementById('highlight-unified-preview').textContent.trim()).toBe(
      'Hello there'
    );
  });
});
