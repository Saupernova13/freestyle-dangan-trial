// Shared keyboard/pointer behaviour for the editor modals.
//
// Every modal renders into #modalroot as `.dr-modal-bg > .dr-modal`, so one
// delegated set of listeners covers them all.
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

    // Textareas keep Enter for newlines, and the searchable dropdown uses it
    // to pick a result.
    if (e.key === 'Enter') {
      const el = e.target;
      const isTextInput =
        el &&
        el.tagName === 'INPUT' &&
        !['file', 'checkbox', 'radio', 'range', 'button'].includes(el.type) &&
        !el.classList.contains('searchable-dropdown-input');
      if (!isTextInput) return;
      const primary = document.querySelector('#modalroot .dr-btn-row .btn-primary:not([disabled])');
      if (primary) {
        e.preventDefault();
        primary.click();
      }
    }
  });

  const modalRoot = document.getElementById('modalroot');
  if (modalRoot) {
    // The backdrop closes; the panel itself does not.
    modalRoot.addEventListener('mousedown', (e) => {
      if (e.target.classList && e.target.classList.contains('dr-modal-bg')) {
        closeModal();
      }
    });
  }
}

// Call on open only, never on re-render: it would steal focus mid-typing.
export function focusFirstField() {
  const root = document.getElementById('modalroot');
  if (!root) return;
  const field = root.querySelector(
    'input:not([type=file]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
  );
  if (field) field.focus();
}
