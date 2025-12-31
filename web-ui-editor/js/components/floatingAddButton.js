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
        show: scriptLines.length > 5  // Only show if list is long
      };
      break;

    case 'truthBullets':
      buttonConfig = {
        text: 'Add Bullet',
        onclick: () => addTruthBullet(),
        show: truthBullets.length > 3
      };
      break;

    case 'minigames':
      // For minigames, always show but hide in implementation
      // Will be enhanced later for specific minigame types
      buttonConfig = {
        show: false  // Disabled for now, can be enhanced later
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
