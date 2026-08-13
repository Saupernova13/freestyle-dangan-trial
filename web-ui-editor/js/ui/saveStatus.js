// Autosave indicator in the trial bar, driven by storage.js: 'saving' while a
// write is in flight, 'saved' on success (auto-clears), 'error' on failure
// (sticks until the next successful save).
import { setHtml } from './dom.js';
let hideTimer = null;

export function setSaveStatus(status) {
  const el = document.getElementById('saveStatus');
  if (!el) return;
  clearTimeout(hideTimer);
  el.className = `save-status save-status--${status}`;

  if (status === 'saving') {
    setHtml(el, `${window.icon('upload', { size: 14 })}<span>Saving…</span>`);
  } else if (status === 'saved') {
    setHtml(el, `${window.icon('check', { size: 14 })}<span>All changes saved</span>`);
    // Fade the confirmation after a moment; the error state is left to stick.
    hideTimer = setTimeout(() => {
      el.className = 'save-status save-status--idle';
      setHtml(el, '');
    }, 2500);
  } else if (status === 'error') {
    setHtml(el, `${window.icon('alert', { size: 14 })}<span>Save failed — retry</span>`);
  } else {
    setHtml(el, '');
  }
}
