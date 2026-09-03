import { closeModal } from './modals/modalCoordinator.js';
import { alertDialog, showToast } from './ui/dialogs.js';
import { focusFirstField } from './ui/modalBehaviors.js';
import { setHtml } from './ui/dom.js';
import { registerActions } from './ui/actions.js';

registerActions('click', {
  closeModal: () => closeModal(),
  saveAppSettings: () => saveAppSettings(),
});
export const DEFAULT_SETTINGS = Object.freeze({
  maxSprites: 25,
});

// Stated once, and enforced on both sides: saveAppSettings clamps what the
// dialog writes, and loadSettings clamps what comes back. maxSprites is a loop
// bound in storage.js with a file read per iteration, so a stored 1e9 hangs the
// browser and a stored "abc" makes the loop never run - every sprite silently
// disappears.
export const SETTINGS_BOUNDS = Object.freeze({
  maxSprites: { min: 1, max: 100 },
});

export const appSettings = { ...DEFAULT_SETTINGS };

export const SETTINGS_KEY = 'drCastSettings';

// Returns whether the stored value survived intact, so the caller can tell the
// user their settings were reset rather than leaving them to wonder.
//
// This is the second call in DOMContentLoaded, and there is no window.onerror
// anywhere: an unguarded throw here used to abort every initialiser after it -
// the magnifier, the search dropdown, modal behaviour, keyboard activation,
// the first render, the trial-name listener, history and the undo keybindings
// - leaving a permanently blank, dead editor with no message and no hint that
// clearing one localStorage key fixes it.
export function loadSettings() {
  Object.assign(appSettings, DEFAULT_SETTINGS);

  let saved;
  try {
    saved = localStorage.getItem(SETTINGS_KEY);
  } catch {
    // Private-mode and blocked-storage browsers throw on the getter itself.
    return true;
  }
  if (!saved) return true;

  let parsed;
  try {
    parsed = JSON.parse(saved);
  } catch {
    return false;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return false;
  }

  // Field by field, so one bad value costs one setting. Object.assign took any
  // shape at all and bypassed the bounds the dialog enforces.
  let ok = true;
  for (const [key, bounds] of Object.entries(SETTINGS_BOUNDS)) {
    if (!(key in parsed)) continue;
    const value = parsed[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      ok = false;
      continue;
    }
    const rounded = Math.round(value);
    if (rounded < bounds.min || rounded > bounds.max) {
      ok = false;
      continue;
    }
    appSettings[key] = rounded;
  }
  return ok;
}

export function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
  } catch (err) {
    // A full or blocked localStorage must not take the editor down with it.
    console.warn('Could not persist settings:', err);
  }
}

// For the recovery path: an unreadable value is worse than no value.
export function clearStoredSettings() {
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch (err) {
    console.warn('Could not clear stored settings:', err);
  }
}

export function openSettings() {
  const root = document.getElementById('modalroot');
  setHtml(
    root,
    `
    <div class="dr-modal-bg">
      <div class="dr-modal">
        <button class="dr-close" data-on-click="closeModal">&times;</button>
        <div class="dr-tabs">
          <div class="dr-tab active">${window.icon('settings')} Settings</div>
        </div>
        <div class="dr-modal-content">
          <div class="dr-form">
            <div class="settings-section">
              <h3>Application Settings</h3>
              <div class="settings-field">
                <label for="maxSpritesInput">Maximum sprites per character:</label>
                <input type="number" id="maxSpritesInput" min="${SETTINGS_BOUNDS.maxSprites.min}" max="${SETTINGS_BOUNDS.maxSprites.max}" value="${appSettings.maxSprites}">
              </div>
              <p style="font-size: 0.875rem; color: var(--text-tertiary); margin: 0.5rem 0;">
                Changes will apply to newly created characters. Existing characters will keep their current sprite count.
              </p>
            </div>
          </div>
        </div>
        <div class="dr-btn-row">
          <button class="btn btn-secondary" data-on-click="closeModal">Cancel</button>
          <button class="btn btn-primary" data-on-click="saveAppSettings">Save Settings</button>
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
  const { min, max } = SETTINGS_BOUNDS.maxSprites;

  if (isNaN(newMaxSprites) || newMaxSprites < min || newMaxSprites > max) {
    alertDialog({
      type: 'warning',
      message: `Please enter a valid number between ${min} and ${max}.`,
    });
    return;
  }

  appSettings.maxSprites = newMaxSprites;
  saveSettings();
  closeModal();
  showToast('Settings saved', { type: 'success' });
}
