// Create/edit modal for a single truth bullet.
import { removeEntry, reportFailedRemoval } from '../core/fileOps.js';
import { state } from '../core/state.js';
import { autoSaveTrial } from '../core/storage.js';
import { showToast } from '../ui/dialogs.js';
import { focusFirstField } from '../ui/modalBehaviors.js';
import { escapeHtml, fileToDataUrl, showLoader } from '../utils.js';
import { renderTruthBulletsView } from '../views/truthBulletsView.js';

import { setHtml } from '../ui/dom.js';
let activeBulletId = null;
// True while editing a bullet that addTruthBullet created for this modal.
// Cancelling one of those has to take the bullet with it: it was pushed into
// state before the modal opened, so it survived Cancel, got persisted by the
// next autosave, appeared in every minigame's bullet picker, and tripped
// validateTrialForExport with "Truth bullet N has no name" - with no obvious
// cause, since the author believes they cancelled.
let activeBulletIsNew = false;
let bulletModalErr = '';
let bulletModalMsg = '';
// The edit buffer. imageDataURL is in it for the same reason the rest are:
// the preview used to be written straight onto the live state.truthBullets
// entry, so Remove Image followed by Cancel left the bullet with a null
// dataURL and its imageFile intact - and renderTruthBulletDetail computes
// `hasImage = imageFile && imageDataURL`, so the detail pane and the
// nonstop-debate bullet picker both showed a placeholder for a bullet whose
// image was still on disk and still exported. It stayed wrong until the trial
// was reopened.
let bulletFields = {
  name: '',
  description: '',
  imageFile: null,
  imageBlob: null,
  imageDataURL: null,
  inversedLieBulletName: '',
};

export function openTruthBulletModal(bulletId, opts = {}) {
  if (!state.dirHandle) {
    showToast('Choose a trial folder first.', { type: 'warning' });
    return;
  }

  activeBulletId = bulletId;
  activeBulletIsNew = opts.isNew === true;
  bulletModalErr = '';
  bulletModalMsg = '';

  const bullet = state.truthBullets.find((b) => b.bulletId === bulletId);
  if (!bullet) {
    showToast('Truth bullet not found.', { type: 'error' });
    return;
  }

  bulletFields = {
    name: bullet.name || '',
    description: bullet.description || '',
    imageFile: bullet.imageFile || null,
    imageBlob: null,
    imageDataURL: bullet.imageDataURL || null,
    inversedLieBulletName: bullet.inversedLieBulletName || '',
  };

  renderTruthBulletModal();
  focusFirstField();
}

export function renderTruthBulletModal() {
  const root = document.getElementById('modalroot');
  // Renders from bulletFields alone; nothing here reads the live entry.
  const hasImage = bulletFields.imageFile !== null;

  setHtml(
    root,
    `
    <div class="dr-modal-bg">
      <div class="dr-modal">
        <button class="dr-close" onclick="closeTruthBulletModal()">&times;</button>

        <div class="dr-modal-content">
          <div class="dr-form">
            <h3>Truth Bullet Configuration</h3>

            <div class="dr-fg-row single">
              <div class="dr-fg-field">
                <label>Bullet Name:</label>
                <input type="text"
                       value="${escapeHtml(bulletFields.name)}"
                       oninput="updateBulletField('name', this.value)"
                       placeholder="E.g., Bloody Knife">
              </div>
            </div>

            <div class="dr-fg-row single">
              <div class="dr-fg-field">
                <label>Description:</label>
                <textarea rows="3"
                          oninput="updateBulletField('description', this.value)"
                          placeholder="Describe this evidence...">${escapeHtml(bulletFields.description)}</textarea>
              </div>
            </div>

            <div class="dr-fg-row single">
              <div class="dr-fg-field">
                <label>Inversed Lie Bullet Name:</label>
                <input type="text"
                       value="${escapeHtml(bulletFields.inversedLieBulletName)}"
                       oninput="updateBulletField('inversedLieBulletName', this.value)"
                       placeholder="E.g., Clean Knife">
                <small style="color: var(--text-tertiary);">Name when converted to a lie</small>
              </div>
            </div>

            <div class="dr-fg-row">
              <div class="dr-fg-field">
                <label>Bullet Image:</label>
                ${
                  hasImage
                    ? `
                  <div class="bullet-image-preview">
                    <div class="bullet-image-preview-container">
                      <img src="${bulletFields.imageDataURL || ''}" alt="Bullet image">
                    </div>
                    <button class="btn btn-secondary" onclick="clearBulletImage()">${window.icon('trash')} Remove Image</button>
                  </div>
                `
                    : `
                  <div class="bullet-image-empty">
                    <p>No image uploaded</p>
                  </div>
                `
                }
                <input type="file" accept="image/*" id="bulletImageInput"
                       onchange="handleBulletImageUpload(event)" style="display: none;">
                <button class="btn btn-primary" onclick="triggerBulletImageInput()">
                  ${window.icon('upload')} ${hasImage ? 'Replace' : 'Upload'} Image
                </button>
              </div>
            </div>
          </div>
        </div>

        ${bulletModalErr ? `<div class="dr-err">${bulletModalErr}</div>` : ''}
        ${bulletModalMsg ? `<div class="dr-success">${bulletModalMsg}</div>` : ''}

        <div class="dr-btn-row">
          <button class="btn btn-secondary" onclick="closeTruthBulletModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveTruthBullet()">Save Bullet</button>
        </div>
      </div>
    </div>
  `
  );
}

export function updateBulletField(field, value) {
  bulletFields[field] = value;
}

export function triggerBulletImageInput() {
  document.getElementById('bulletImageInput').click();
}

export async function handleBulletImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    bulletModalErr = 'Please select a valid image file.';
    renderTruthBulletModal();
    return;
  }

  bulletFields.imageFile = file.name;
  bulletFields.imageBlob = file;
  bulletModalErr = '';
  renderTruthBulletModal();

  // fileToDataUrl rather than a bare FileReader: this path had no onerror and
  // was never awaited, so a failed read left the preview blank and said
  // nothing. Into the buffer, so Cancel discards it.
  try {
    bulletFields.imageDataURL = await fileToDataUrl(file);
  } catch (err) {
    console.error('Could not read the selected image:', err);
    bulletModalErr = 'Could not read that image file. Try another.';
    bulletFields.imageFile = null;
    bulletFields.imageBlob = null;
    bulletFields.imageDataURL = null;
  }
  renderTruthBulletModal();
}

export function clearBulletImage() {
  bulletFields.imageFile = null;
  bulletFields.imageBlob = null;
  bulletFields.imageDataURL = null;
  renderTruthBulletModal();
}

export function closeTruthBulletModal() {
  setHtml(document.getElementById('modalroot'), '');

  // Only a bullet this modal created, and only while it is still blank: an
  // author who cancelled out of Add Bullet never had one, and one they had
  // already named and saved is theirs to keep.
  if (activeBulletIsNew) {
    const bullet = state.truthBullets.find((b) => b.bulletId === activeBulletId);
    if (bullet && !(bullet.name || '').trim()) {
      state.truthBullets = state.truthBullets.filter((b) => b.bulletId !== activeBulletId);
      if (state.selectedTruthBulletId === activeBulletId) {
        state.selectedTruthBulletId = state.truthBullets.length
          ? state.truthBullets[state.truthBullets.length - 1].bulletId
          : null;
      }
      renderTruthBulletsView();
    }
  }

  activeBulletId = null;
  activeBulletIsNew = false;
}

export async function saveTruthBullet() {
  const bullet = state.truthBullets.find((b) => b.bulletId === activeBulletId);
  if (!bullet) {
    showToast('Truth bullet not found.', { type: 'error' });
    closeTruthBulletModal();
    return;
  }

  if (!bulletFields.name.trim()) {
    bulletModalErr = 'Please enter a bullet name.';
    renderTruthBulletModal();
    return;
  }

  try {
    showLoader(true, 'Saving truth bullet…');

    if (bulletFields.imageBlob) {
      const bulletsDir = await state.dirHandle.getDirectoryHandle('TruthBullets', { create: true });
      const imageFileName = `${bullet.bulletId}.${bulletFields.imageBlob.name.split('.').pop()}`;
      const imageFileHandle = await bulletsDir.getFileHandle(imageFileName, { create: true });
      const writable = await imageFileHandle.createWritable();
      await writable.write(bulletFields.imageBlob);
      await writable.close();

      bullet.imageFile = imageFileName;
      // Already read for the preview; fall back only if that read failed.
      bullet.imageDataURL =
        bulletFields.imageDataURL || (await fileToDataUrl(bulletFields.imageBlob));
    } else if (bulletFields.imageFile === null && bullet.imageFile) {
      // Cleared: delete the file, but don't fail the save if it is already
      // gone. A delete that genuinely failed is reported - the file stays in
      // the folder and ships in every export.
      const bulletsDir = await state.dirHandle
        .getDirectoryHandle('TruthBullets', { create: false })
        .catch(() => null);
      reportFailedRemoval(bullet.imageFile, await removeEntry(bulletsDir, bullet.imageFile));
      bullet.imageFile = null;
      bullet.imageDataURL = null;
    }

    activeBulletIsNew = false;
    bullet.name = bulletFields.name;
    bullet.description = bulletFields.description;
    bullet.inversedLieBulletName = bulletFields.inversedLieBulletName;

    await autoSaveTrial();

    showLoader(false);
    closeTruthBulletModal();
    renderTruthBulletsView();
  } catch (error) {
    console.error('Error saving truth bullet:', error);
    showLoader(false);
    bulletModalErr = 'Failed to save: ' + error.message;
    renderTruthBulletModal();
  }
}
