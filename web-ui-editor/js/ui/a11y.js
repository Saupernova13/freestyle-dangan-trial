// Global keyboard wiring: the shortcuts and activations that belong to no
// single view.
import { state } from '../core/state.js';
import { redo, undo } from '../core/history.js';

// Nav items and cast slots are focusable <div>s with onclick handlers, which
// a keyboard alone cannot fire. This lets Enter/Space reach them.
export function initKeyboardActivation() {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    const el = document.activeElement;
    if (!el || !el.classList) return;
    if (el.classList.contains('nav-item') || el.classList.contains('cast-block')) {
      e.preventDefault();
      el.click();
    }
  });
}

// Ctrl/Cmd+Z and Ctrl/Cmd+Y (or Shift+Z). This sat inline in the bootstrap,
// 24 lines of guard logic in the middle of "start the app"; it belongs with
// the history it drives. Not in core/history.js itself - that module is
// deliberately DOM-free so its tests can run under node.
export function initUndoRedoShortcut() {
  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    const isUndo = key === 'z' && !event.shiftKey;
    const isRedo = key === 'y' || (key === 'z' && event.shiftKey);
    if (!isUndo && !isRedo) return;

    // No trial open: nothing to undo.
    if (!state.dirHandle) return;
    // A modal owns the keyboard; undoing under it would yank out its data.
    if (
      document.getElementById('modalroot')?.childElementCount ||
      document.getElementById('dialogroot')?.childElementCount
    ) {
      return;
    }
    // Text fields keep native undo; their edits still reach scheduleAutoSave.
    const t = event.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    event.preventDefault();
    if (isUndo) undo();
    else redo();
  });
}
