// One floating "add" button, relabelled per view.
import { addScriptLine } from '../app.js';
import { state } from '../core/state.js';
import { addMinigame } from '../views/minigameView.js';
import { addTruthBullet } from '../views/truthBulletsView.js';
import { setHtml } from '../ui/dom.js';
import { escapeHtml } from '../utils.js';
let floatingButton = null;

export function initFloatingAddButton() {
  if (!floatingButton) {
    floatingButton = document.createElement('button');
    floatingButton.id = 'floatingAddButton';
    floatingButton.className = 'floating-add-btn';
    setHtml(floatingButton, window.icon('plus', { size: 24 }));
    floatingButton.style.display = 'none';
    document.body.appendChild(floatingButton);
  }
}

// Call after every view render.
export function updateFloatingAddButton() {
  if (!floatingButton) initFloatingAddButton();

  // Hide first, or the old label flashes over the incoming view.
  floatingButton.style.display = 'none';

  let buttonConfig;

  switch (state.activeView) {
    case 'script':
      buttonConfig = {
        text: 'Add Line',
        onclick: () => addScriptLine(),
        show: state.scriptLines.length > 0, // Show when not empty
      };
      break;

    case 'truthBullets':
      buttonConfig = {
        text: 'Add Bullet',
        onclick: () => addTruthBullet(),
        show: state.truthBullets.length > 0, // Show when not empty
      };
      break;

    case 'minigames':
      buttonConfig = {
        text: 'Create Minigame',
        onclick: () => addMinigame(),
        show: state.minigames.length > 0, // Show when not empty
      };
      break;

    default:
      buttonConfig = { show: false };
  }

  if (buttonConfig && buttonConfig.show) {
    floatingButton.style.display = 'flex';
    floatingButton.onclick = buttonConfig.onclick;

    if (buttonConfig.text) {
      floatingButton.classList.add('extended');
      setHtml(
        floatingButton,
        `${window.icon('plus', { size: 22 })} <span class="floating-add-btn-text">${escapeHtml(buttonConfig.text)}</span>`
      );
    } else {
      floatingButton.classList.remove('extended');
      setHtml(floatingButton, window.icon('plus', { size: 24 }));
    }
  } else {
    floatingButton.style.display = 'none';
  }
}
