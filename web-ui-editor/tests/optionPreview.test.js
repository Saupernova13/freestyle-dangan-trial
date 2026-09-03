// @vitest-environment jsdom
//
// The camera and dialogue box tabs each found the selected entry in a
// { value, label, desc } table and rendered icon + label + description with a
// hand-written not-found fallback. The CSS agreed: .camera-preview-* and
// .dialoguebox-preview-* held byte-identical bodies. One component under two
// names, and two chances for the fallback to say something the table does not.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderOptionPreview } from '../js/modals/scriptLine/optionPreview.js';

const here = dirname(fileURLToPath(import.meta.url));
const readSource = (file) => readFileSync(resolve(here, '..', file), 'utf8');

const OPTIONS = [
  { value: 'none', label: 'None', desc: 'No camera movement' },
  { value: 'zoom_in', label: 'Zoom In', desc: 'Pushes toward the speaker' },
];

function preview(value, options = OPTIONS) {
  const host = document.createElement('div');
  host.innerHTML = renderOptionPreview('camera', options, value);
  return host;
}

describe('the selected-option preview', () => {
  it('shows the label and description of the selected entry', () => {
    const host = preview('zoom_in');
    expect(host.querySelector('strong').textContent).toBe('Zoom In');
    expect(host.querySelector('p').textContent).toBe('Pushes toward the speaker');
  });

  it('falls back to the first entry for a value the table does not name', () => {
    // Both tables lead with the do-nothing default the engine falls back to,
    // which is what the two hand-written fallbacks each spelled out.
    const host = preview('a_motion_from_a_newer_editor');
    expect(host.querySelector('strong').textContent).toBe('None');
    expect(host.querySelector('p').textContent).toBe('No camera movement');
  });

  it('falls back for a missing value too', () => {
    expect(preview(undefined).querySelector('strong').textContent).toBe('None');
  });

  it('renders nothing at all for an empty table', () => {
    expect(preview('x', []).innerHTML.trim()).toBe('');
  });

  it('escapes the label and description', () => {
    const host = preview('x', [{ value: 'x', label: '<img src=y>', desc: '<img src=z>' }]);
    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector('strong').textContent).toBe('<img src=y>');
  });

  it('uses the one shared class set', () => {
    const host = preview('none');
    expect(host.querySelector('.option-preview')).not.toBeNull();
    expect(host.querySelector('.option-preview-icon')).not.toBeNull();
    expect(host.querySelector('.option-preview-text')).not.toBeNull();
  });
});

describe('the two tabs that use it', () => {
  it('leads each table with the entry its fallback used to name', () => {
    // The fallback is now "the first entry", so the tables have to keep the
    // default first or the preview would advertise the wrong thing.
    const camera = readSource('js/modals/scriptLine/cameraTab.js');
    const box = readSource('js/modals/scriptLine/dialogueBoxTab.js');
    expect(camera).toMatch(/const CAMERA_TYPES = \[\s*\{ value: 'none'/);
    expect(box).toMatch(/const BOX_STYLES = \[\s*\{ value: 'default'/);
  });

  it('keeps no per-tab copy of the preview markup or its CSS', () => {
    const css = readSource('css/views/script-editor.css');
    for (const gone of ['camera-preview', 'dialoguebox-preview']) {
      expect(css).not.toContain(gone);
      expect(readSource('js/modals/scriptLine/cameraTab.js')).not.toContain(gone);
      expect(readSource('js/modals/scriptLine/dialogueBoxTab.js')).not.toContain(gone);
    }
    expect(css).toContain('.option-preview {');
  });
});
