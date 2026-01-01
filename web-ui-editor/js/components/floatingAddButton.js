// Floating Add Button Manager
let floatingButton = null;

function initFloatingAddButton() {
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

function updateFloatingAddButton() {
  if (!floatingButton) initFloatingAddButton();

  // Determine which button to show based on activeView
  let buttonConfig = null;

  switch(activeView) {
    case 'script':
      buttonConfig = {
        text: 'Add Line',
        onclick: () => addScriptLine(),
        show: scriptLines.length > 0  // Show when not empty
      };
      break;

    case 'truthBullets':
      buttonConfig = {
        text: 'Add Bullet',
        onclick: () => addTruthBullet(),
        show: truthBullets.length > 0  // Show when not empty
      };
      break;

    case 'minigames':
      buttonConfig = {
        text: 'Create Minigame',
        onclick: () => addMinigame(),
        show: minigames.length > 0  // Show when not empty
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
