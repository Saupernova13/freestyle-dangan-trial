// @vitest-environment jsdom
//
// Both debate minigames are rendered by the same engine panel, but each editor
// had grown its own arbitrary subset of the styling options by copy-paste. An
// author could not pick wave for a nonstop debate or glow for a mass panic
// one, though the engine renders both.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  TEXT_DIRECTIONS,
  TEXT_EFFECTS,
  TEXT_FONTS,
  renderTextStyleOptions,
} from '../js/core/debateTextOptions.js';
import {
  renderNonstopDebateEditor,
  toggleSection,
} from '../js/views/minigames/nonstopDebateEditor.js';
import { renderMassPanicLine } from '../js/views/minigames/massPanicDebateEditor.js';

function optionsOf(html, selected) {
  const select = document.createElement('select');
  select.innerHTML = renderTextStyleOptions(html, selected);
  return [...select.options];
}

beforeEach(() => {
  window.icon = () => '';
});

describe('renderTextStyleOptions', () => {
  it('offers every value in the table', () => {
    expect(optionsOf(TEXT_EFFECTS, 'normal').map((o) => o.value)).toEqual(
      TEXT_EFFECTS.map((e) => e.value)
    );
  });

  it('selects the current value', () => {
    const selected = optionsOf(TEXT_FONTS, 'monospace').filter((o) => o.selected);
    expect(selected.map((o) => o.value)).toEqual(['monospace']);
  });

  it('disables a value the engine parses but does not render', () => {
    // _apply_effect_wrap has no branch for fade, so it renders as plain text.
    const fade = optionsOf(TEXT_EFFECTS, 'normal').find((o) => o.value === 'fade');
    expect(fade.disabled).toBe(true);
    expect(fade.textContent).toContain('not rendered yet');
  });

  it('leaves an unsupported value selectable when a line already holds it', () => {
    // Otherwise the control could not display what the line actually is - the
    // same failure as a dropdown offering five of eight game types.
    const fade = optionsOf(TEXT_EFFECTS, 'fade').find((o) => o.value === 'fade');
    expect(fade.disabled).toBe(false);
    expect(fade.selected).toBe(true);
  });
});

describe('the two debate editors', () => {
  function selectValues(html, label) {
    const root = document.createElement('div');
    root.innerHTML = html;
    const group = [...root.querySelectorAll('.form-group')].find(
      (g) => g.querySelector('label') && g.querySelector('label').textContent.trim() === label
    );
    return [...group.querySelector('select').options].map((o) => o.value);
  }

  // The styling controls sit in a collapsed section, so expand it first.
  function nonstopHtml() {
    toggleSection('l1', 'textStyling');
    const html = renderNonstopDebateEditor({
      gameId: 'mg_1',
      gameType: 'nonstop_debate',
      typeSpecific: {
        selectedBullets: [],
        dialogueLines: [{ lineId: 'l1', order: 0, textEffect: 'normal' }],
      },
    });
    toggleSection('l1', 'textStyling');
    return html;
  }

  function massPanicHtml() {
    const group = { groupId: 'g1' };
    return renderMassPanicLine(
      'mg_2',
      group,
      { textEffect: 'normal' },
      'speaker1',
      0,
      '#fff',
      'Speaker 1'
    );
  }

  it('offer the same effects, fonts and directions as each other', () => {
    for (const [label, table] of [
      ['Text Effect', TEXT_EFFECTS],
      ['Text Font', TEXT_FONTS],
      ['Movement Direction', TEXT_DIRECTIONS],
    ]) {
      const expected = table.map((o) => o.value);
      expect(selectValues(nonstopHtml(), label), `nonstop ${label}`).toEqual(expected);
      expect(selectValues(massPanicHtml(), label), `mass panic ${label}`).toEqual(expected);
    }
  });

  it('close the gaps the drift left', () => {
    // wave was nonstop's missing effect; glow was mass panic's. bold, italic
    // and glitch were missing from mass panic; monospace from nonstop.
    expect(selectValues(nonstopHtml(), 'Text Effect')).toContain('wave');
    expect(selectValues(massPanicHtml(), 'Text Effect')).toContain('glow');
    expect(selectValues(nonstopHtml(), 'Text Font')).toContain('monospace');
    for (const font of ['bold', 'italic', 'glitch']) {
      expect(selectValues(massPanicHtml(), 'Text Font'), font).toContain(font);
    }
  });
});
