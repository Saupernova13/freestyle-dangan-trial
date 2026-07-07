// Modal coordinator - closes whichever modal is currently open.
//
// Each modal's close function is idempotent and resets only its own state,
// so closing all of them is safe and avoids the coordinator having to peek
// at other modules' internals.
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
