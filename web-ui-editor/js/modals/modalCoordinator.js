// Closes whichever modal is open. Each close function is idempotent and
// touches only its own state, so calling all of them beats inspecting them.
import { closeCharModal } from './characterModal.js';
import { closeScriptLineModal } from './scriptLineModal.js';
import { closeTruthBulletModal } from './truthBulletModal.js';

import { setHtml } from '../ui/dom.js';
export function closeModal() {
  closeScriptLineModal();
  closeCharModal();
  closeTruthBulletModal();

  // Fallback for modals without their own close handler (e.g. settings).
  const modalRoot = document.getElementById('modalroot');
  if (modalRoot) setHtml(modalRoot, '');
}
