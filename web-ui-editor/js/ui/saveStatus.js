// Persistent autosave status shown in the trial bar.
//
// The editor writes trial.json silently on every edit; without feedback the
// user has no idea whether their work is on disk. storage.js drives this:
// 'saving' while a write is pending/in flight, 'saved' on success (auto-clears),
// 'error' on failure (sticks until the next successful save).
let hideTimer = null;

export function setSaveStatus(status) {
  const el = document.getElementById('saveStatus');
  if (!el) return;
  clearTimeout(hideTimer);
  el.className = `save-status save-status--${status}`;

  if (status === 'saving') {
    el.innerHTML = `${window.icon('upload', { size: 14 })}<span>Saving…</span>`;
  } else if (status === 'saved') {
    el.innerHTML = `${window.icon('check', { size: 14 })}<span>All changes saved</span>`;
    // Fade the confirmation after a moment; the error state is left to stick.
    hideTimer = setTimeout(() => {
      el.className = 'save-status save-status--idle';
      el.innerHTML = '';
    }, 2500);
  } else if (status === 'error') {
    el.innerHTML = `${window.icon('alert', { size: 14 })}<span>Save failed — retry</span>`;
  } else {
    el.innerHTML = '';
  }
}
