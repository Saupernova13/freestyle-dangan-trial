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
