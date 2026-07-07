// Settings management
import { closeModal } from './modals/modalCoordinator.js';
import { alertDialog, showToast } from './ui/dialogs.js';
import { focusFirstField } from './ui/modalBehaviors.js';
import { setHtml } from './ui/dom.js';
export const appSettings = {
  maxSprites: 25,
};

export function loadSettings() {
  const saved = localStorage.getItem('drCastSettings');
  if (saved) {
    Object.assign(appSettings, JSON.parse(saved));
  }
}

export function saveSettings() {
  localStorage.setItem('drCastSettings', JSON.stringify(appSettings));
}

export function openSettings() {
  const root = document.getElementById('modalroot');
  setHtml(
    root,
    `
    <div class="dr-modal-bg">
      <div class="dr-modal">
        <button class="dr-close" onclick="closeModal()">&times;</button>
        <div class="dr-tabs">
          <div class="dr-tab active">${window.icon('settings')} Settings</div>
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
  `
  );
  focusFirstField();
}

export function saveAppSettings() {
  const maxSpritesInput = document.getElementById('maxSpritesInput');
  if (!maxSpritesInput) return;

  const newMaxSprites = parseInt(maxSpritesInput.value);

  if (isNaN(newMaxSprites) || newMaxSprites < 1 || newMaxSprites > 100) {
    alertDialog({ type: 'warning', message: 'Please enter a valid number between 1 and 100.' });
    return;
  }

  appSettings.maxSprites = newMaxSprites;
  saveSettings();
  closeModal();
  showToast('Settings saved', { type: 'success' });
}
