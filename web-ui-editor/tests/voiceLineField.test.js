// @vitest-environment jsdom
//
// Nonstop debate and mass panic held the same 45 lines of voice-line markup,
// and each spelled the four element ids a second time in its
// toggleAudioPreview() options. The scheme lived in four places: a change that
// missed one left the play button, the seek bar and the two clocks pointing at
// elements that no longer existed, and the preview then played with a frozen
// UI rather than failing loudly.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderVoiceLineField,
  voiceLineElementIds,
} from '../js/views/minigames/voiceLineField.js';

const here = dirname(fileURLToPath(import.meta.url));
const readSource = (file) => readFileSync(resolve(here, '..', file), 'utf8');

function render(opts) {
  const host = document.createElement('div');
  host.innerHTML = renderVoiceLineField({
    fileName: 'voice.wav',
    idBase: 'l1',
    onPlay: 'play()',
    onSeek: 'seek(this.value)',
    onClear: 'clear()',
    onUpload: 'upload(event)',
    ...opts,
  });
  return host;
}

describe('the voice line field', () => {
  it('gives every control the id the preview looks it up by', () => {
    const host = render();
    const ids = voiceLineElementIds('l1');
    for (const id of Object.values(ids)) {
      expect(host.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it('derives distinct ids per item, so two fields on one page do not collide', () => {
    const a = voiceLineElementIds('l1');
    const b = voiceLineElementIds('g1-speaker2');
    expect(Object.values(a).some((id) => Object.values(b).includes(id))).toBe(false);
  });

  it('offers an upload input and no preview when there is no file', () => {
    const host = render({ fileName: null });
    expect(host.querySelector('input[type="file"]')).not.toBeNull();
    expect(host.querySelector('.audio-preview')).toBeNull();
    expect(host.querySelector('.audio-empty p').textContent).toBe('No audio file uploaded');
  });

  it('offers a preview and no upload input once a file is set', () => {
    const host = render();
    expect(host.querySelector('.audio-preview')).not.toBeNull();
    expect(host.querySelector('input[type="file"]')).toBeNull();
  });

  it('wires each control to the call the caller passed', () => {
    const host = render();
    const ids = voiceLineElementIds('l1');
    expect(host.querySelector(`#${ids.buttonId}`).getAttribute('onclick')).toBe('play()');
    expect(host.querySelector(`#${ids.seekBarId}`).getAttribute('oninput')).toBe(
      'seek(this.value)'
    );
    const buttons = [...host.querySelectorAll('button')];
    expect(buttons.at(-1).getAttribute('onclick')).toBe('clear()');
    expect(render({ fileName: null }).querySelector('input').getAttribute('onchange')).toBe(
      'upload(event)'
    );
  });

  it('escapes the file name', () => {
    // The name comes off disk, and an imported trial can carry anything.
    const host = render({ fileName: '<img src=x onerror=boom>' });
    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector('.audio-filename').textContent).toBe('<img src=x onerror=boom>');
  });
});

describe('the two editors that use it', () => {
  const EDITORS = [
    'js/views/minigames/nonstopDebateEditor.js',
    'js/views/minigames/massPanicDebateEditor.js',
  ];

  it('spells the element ids nowhere but the helper', () => {
    // This is the drift the issue names: an id scheme change had to land in
    // four places at once.
    for (const file of EDITORS) {
      const source = readSource(file);
      expect(source).toContain('voiceLineElementIds(');
      for (const stale of [
        'dialogue-play-btn-',
        'dialogue-audio-seek-bar-',
        'panic-play-btn-',
        'panic-audio-seek-bar-',
        'audio-time-current',
        'audio-time-total',
      ]) {
        expect(source).not.toContain(stale);
      }
    }
  });

  it('keeps debate scrum on its own compact widget', () => {
    // Deliberate: the mini widget has no seek bar, and one helper serving
    // both would serve neither.
    const scrum = readSource('js/views/minigames/debateScrumEditor.js');
    expect(scrum).toContain('audio-preview-mini');
    expect(scrum).not.toContain('renderVoiceLineField');
  });
});
