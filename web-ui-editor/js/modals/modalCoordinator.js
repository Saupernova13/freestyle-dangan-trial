// Modal coordinator - shared state and utilities for all modals

// Shared error/message state for truth bullet modal
let bulletModalErr = "";
let bulletModalMsg = "";

// closeModal function that checks which modal is open and closes it
function closeModal() {
  // Determine which modal is open and close it
  const modalRoot = document.getElementById("modalroot");
  if (!modalRoot || !modalRoot.innerHTML) return;

  // Check if character modal is open
  if (typeof activeIdx !== 'undefined' && activeIdx !== null) {
    closeCharModal();
  }
  // Check if script line modal is open
  else if (typeof activeLineId !== 'undefined' && activeLineId !== null) {
    closeScriptLineModal();
  }
  // Check if truth bullet modal is open
  else if (typeof activeBulletId !== 'undefined' && activeBulletId !== null) {
    closeTruthBulletModal();
  }
  // Fallback: just clear the modal root
  else {
    modalRoot.innerHTML = "";
  }
}
