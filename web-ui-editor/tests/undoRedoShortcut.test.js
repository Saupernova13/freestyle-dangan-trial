// @vitest-environment jsdom
//
// 24 lines of guard logic sat inline in the bootstrap, uncovered: no trial
// open, a modal or dialog holding the keyboard, a text field that owns its
// own native undo. Each guard prevents a specific kind of data loss - undoing
// under an open character modal yanks the data out from under it - and none
// of them was tested.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../js/core/history.js', () => ({
  undo: vi.fn(),
  redo: vi.fn(),
}));

const { state } = await import('../js/core/state.js');
const { undo, redo } = await import('../js/core/history.js');
const { initUndoRedoShortcut } = await import('../js/ui/a11y.js');

// The listener is global and registered once, as it is in the real boot.
beforeAll(() => initUndoRedoShortcut());

function press(key, opts = {}) {
  const event = new window.KeyboardEvent('keydown', {
    key,
    ctrlKey: opts.ctrl ?? true,
    shiftKey: opts.shift ?? false,
    metaKey: opts.meta ?? false,
    bubbles: true,
    cancelable: true,
  });
  (opts.target || document.body).dispatchEvent(event);
  return event;
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '<div id="modalroot"></div><div id="dialogroot"></div>';
  state.dirHandle = { name: 'trial' };
});

describe('the undo/redo shortcut', () => {
  it('undoes on Ctrl+Z', () => {
    const event = press('z');
    expect(undo).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('undoes on Cmd+Z', () => {
    press('z', { ctrl: false, meta: true });
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('redoes on Ctrl+Y and on Ctrl+Shift+Z', () => {
    press('y');
    press('z', { shift: true });
    expect(redo).toHaveBeenCalledTimes(2);
    expect(undo).not.toHaveBeenCalled();
  });

  it('reads the key whatever case it arrives in', () => {
    press('Z');
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('ignores the key without a modifier', () => {
    press('z', { ctrl: false });
    expect(undo).not.toHaveBeenCalled();
  });

  it('ignores any other combination', () => {
    press('s');
    expect(undo).not.toHaveBeenCalled();
    expect(redo).not.toHaveBeenCalled();
  });

  it('does nothing with no trial open', () => {
    state.dirHandle = null;
    const event = press('z');
    expect(undo).not.toHaveBeenCalled();
    // And the browser's own handling is left alone.
    expect(event.defaultPrevented).toBe(false);
  });

  it('does nothing while a modal is open', () => {
    // Undoing under an open modal yanks the data out from under it.
    document.getElementById('modalroot').innerHTML = '<div class="modal"></div>';
    press('z');
    expect(undo).not.toHaveBeenCalled();
  });

  it('does nothing while a dialog is open', () => {
    document.getElementById('dialogroot').innerHTML = '<div class="dialog"></div>';
    press('z');
    expect(undo).not.toHaveBeenCalled();
  });

  it('leaves a text field its own native undo', () => {
    for (const tag of ['input', 'textarea']) {
      const el = document.createElement(tag);
      document.body.appendChild(el);
      const event = press('z', { target: el });
      expect(undo).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it('leaves a contenteditable its own native undo', () => {
    const el = document.createElement('div');
    // jsdom does not implement isContentEditable, which is the property a
    // browser sets - including on the children of a contenteditable.
    Object.defineProperty(el, 'isContentEditable', { value: true });
    document.body.appendChild(el);
    press('z', { target: el });
    expect(undo).not.toHaveBeenCalled();
  });
});
