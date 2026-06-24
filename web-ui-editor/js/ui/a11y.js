// Keyboard activation for click-only widgets.
//
// The nav items and cast slots are <div>s with onclick handlers. They're
// focusable (tabindex), but a keyboard user couldn't activate them. One
// delegated listener lets Enter/Space trigger their existing click handler.
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
