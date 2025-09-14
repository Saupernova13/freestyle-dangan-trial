// Settings management
let appSettings = {
  maxSprites: 25
};

function loadSettings() {
  const saved = localStorage.getItem('drCastSettings');
  if (saved) {
    appSettings = { ...appSettings, ...JSON.parse(saved) };
  }
}

function saveSettings() {
  localStorage.setItem('drCastSettings', JSON.stringify(appSettings));
}

function openSettings() {
  const root = document.getElementById("modalroot");
  root.innerHTML = `
    <div class="dr-modal-bg">
      <div class="dr-modal">
        <button class="dr-close" onclick="closeModal()">&times;</button>
        <div class="dr-tabs">
          <div class="dr-tab active">⚙️ Settings</div>
        </div>
        <div class="dr-modal-content">
          <div class="dr-form">
            <div class="settings-section">
              <h3>Application Settings</h3>
              <div class="settings-field">
                <label for="maxSpritesInput">Maximum sprites per character:</label>
                <input type="number" id="maxSpritesInput" min="1" max="100" value="${appSettings.maxSprites}">
              </div>
              <p style="font-size: 0.875rem; color: var(--text-tertiary); margin: 0.5rem 0;">
                Changes will apply to newly created characters. Existing characters will keep their current sprite count.
              </p>
            </div>
          </div>
        </div>
        <div class="dr-btn-row">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveAppSettings()">Save Settings</button>
        </div>
      </div>
    </div>
  `;
}

function saveAppSettings() {
  const maxSpritesInput = document.getElementById('maxSpritesInput');
  const newMaxSprites = parseInt(maxSpritesInput.value);
  
  if (isNaN(newMaxSprites) || newMaxSprites < 1 || newMaxSprites > 100) {
    alert('Please enter a valid number between 1 and 100');
    return;
  }
  
  appSettings.maxSprites = newMaxSprites;
  saveSettings();
  closeModal();
  
  // Show success message briefly
  const successDiv = document.createElement('div');
  successDiv.className = 'dr-success';
  successDiv.textContent = 'Settings saved successfully!';
  successDiv.style.position = 'fixed';
  successDiv.style.top = '2rem';
  successDiv.style.right = '2rem';
  successDiv.style.zIndex = '1000';
  document.body.appendChild(successDiv);
  
  setTimeout(() => {
    document.body.removeChild(successDiv);
  }, 3000);
}

// Initialize settings on page load
loadSettings();