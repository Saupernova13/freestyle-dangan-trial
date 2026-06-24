// Shared keyboard/pointer behaviour for the editor modals.
//
// Every editor modal (character, script line, truth bullet, settings) renders
// into #modalroot as `.dr-modal-bg > .dr-modal`, so one delegated set of
// listeners covers them all: Escape and backdrop-click close, and Enter in a
// single-line field triggers the modal's primary action.
import { closeModal } from '../modals/modalCoordinator.js';

let initialized = false;

function modalIsOpen() {
  const root = document.getElementById('modalroot');
  return !!(root && root.childElementCount);
}

function dialogIsOpen() {
  const root = document.getElementById('dialogroot');
  return !!(root && root.childElementCount);
}

export function initModalBehaviors() {
  if (initialized) return;
  initialized = true;

  document.addEventListener('keydown', (e) => {
    // A themed confirm/alert dialog owns the keyboard while it is up.
    if (dialogIsOpen() || !modalIsOpen()) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      return;
    }

    // Enter in a single-line field submits, mirroring native form behaviour.
    // Textareas keep Enter for newlines; the searchable dropdown handles its
    // own Enter for picking a result.
    if (e.key === 'Enter') {
      const el = e.target;
      const isTextInput =
        el &&
        el.tagName === 'INPUT' &&
        !['file', 'checkbox', 'radio', 'range', 'button'].includes(el.type) &&
        !el.classList.contains('searchable-dropdown-input');
      if (!isTextInput) return;
      const primary = document.querySelector(
        '#modalroot .dr-btn-row .btn-primary:not([disabled])'
      );
      if (primary) {
        e.preventDefault();
        primary.click();
      }
    }
  });

  const modalRoot = document.getElementById('modalroot');
  if (modalRoot) {
    // Click on the dimmed backdrop (not the panel) closes the modal.
    modalRoot.addEventListener('mousedown', (e) => {
      if (e.target.classList && e.target.classList.contains('dr-modal-bg')) {
        closeModal();
      }
    });
  }
}

// Focus the first editable field of the open modal. Call once on open (not on
// re-render) so it doesn't steal focus while the user is typing or tabbing.
export function focusFirstField() {
  const root = document.getElementById('modalroot');
  if (!root) return;
  const field = root.querySelector(
    'input:not([type=file]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
  );
  if (field) field.focus();
}
