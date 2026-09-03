// @vitest-environment jsdom
//
// Both modals interpolated an error message into markup unescaped. Both
// messages are built from error.message, which carries filenames - and
// filenames come from user-supplied files and imported trials. js/ui/dom.js
// states the project's threat model on exactly this point.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../js/ui/dialogs.js', () => ({
  alertDialog: vi.fn(async () => undefined),
  confirmDialog: vi.fn(async () => true),
  promptDialog: vi.fn(async () => ''),
  showToast: vi.fn(),
}));
vi.mock('../js/core/storage.js', () => ({
  autoSaveTrial: vi.fn(async () => {}),
}));
vi.mock('../js/core/trialAssets.js', () => ({
  loadRemainingSprites: vi.fn(async () => {}),
}));
vi.mock('../js/app.js', () => ({ renderScriptEditor: vi.fn() }));

const { state } = await import('../js/core/state.js');
const { sl } = await import('../js/modals/scriptLine/state.js');
const modal = await import('../js/modals/scriptLineModal.js');

// A filename is enough: it reaches error.message and is author-controlled.
const HOSTILE = '<img src=x onerror="window.__pwned = 1">';

beforeEach(() => {
  document.body.innerHTML = '<div id="modalroot"></div>';
  window.icon = () => '';
  delete window.__pwned;
  state.scriptLines = [{ id: 'l1', type: 'narrator', text: 'It began.', order: 0 }];
  state.cast = [];
  state.minigames = [];
  state.truthBullets = [];
  sl.activeLineId = 'l1';
  sl.tab = 'basic';
  sl.err = '';
});

describe('the script line modal error', () => {
  it('escapes markup rather than rendering it', () => {
    modal.failField(`Failed to save: ${HOSTILE}`);
    const box = document.querySelector('.dr-err');
    // No element was created: the tag is text. Asserting on the absence of
    // the substring "onerror=" would not show this - escaping the angle
    // brackets leaves the attribute name visible in innerHTML as inert text.
    expect(box.querySelector('img')).toBeNull();
    expect(box.children).toHaveLength(0);
    expect(box.innerHTML).toContain('&lt;img');
    expect(box.textContent).toContain('<img');
    expect(window.__pwned).toBeUndefined();
  });

  it('still shows the message text', () => {
    modal.failField('Duration must be between 0.1 and 10 seconds');
    expect(document.getElementById('modalroot').textContent).toContain(
      'Duration must be between 0.1 and 10 seconds'
    );
  });

  it('renders nothing where there is no error', () => {
    modal.failField('');
    expect(document.getElementById('modalroot').innerHTML).not.toContain('dr-err');
  });

  it('coerces a non-string rather than printing undefined', () => {
    modal.failField(undefined);
    expect(document.getElementById('modalroot').textContent).not.toContain('undefined');
  });
});
