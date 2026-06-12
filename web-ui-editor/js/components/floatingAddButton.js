// Floating Add Button Manager
import { addScriptLine } from '../app.js';
import { state } from '../core/state.js';
import { addMinigame } from '../views/minigameView.js';
import { addTruthBullet } from '../views/truthBulletsView.js';
let floatingButton = null;

export function initFloatingAddButton() {
  // Create button if doesn't exist
  if (!floatingButton) {
    floatingButton = document.createElement('button');
    floatingButton.id = 'floatingAddButton';
    floatingButton.className = 'floating-add-btn';
    floatingButton.innerHTML = '➕';
    floatingButton.style.display = 'none';
    document.body.appendChild(floatingButton);
  }
}

export function updateFloatingAddButton() {
  if (!floatingButton) initFloatingAddButton();

  // Hide button immediately to prevent flash/overlay during view switch
  floatingButton.style.display = 'none';

  // Determine which button to show based on state.activeView
  let buttonConfig = null;

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

    // Update button text if extended mode
    if (buttonConfig.text) {
      floatingButton.classList.add('extended');
      floatingButton.innerHTML = `➕ <span class="floating-add-btn-text">${buttonConfig.text}</span>`;
    } else {
      floatingButton.classList.remove('extended');
      floatingButton.innerHTML = '➕';
    }
  } else {
    floatingButton.style.display = 'none';
  }
}

// Call this after every view render
