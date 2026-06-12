// Truth bullets view - displays truth bullet list in split-pane layout
import { updateFloatingAddButton } from '../components/floatingAddButton.js';
import { state } from '../core/state.js';
import { autoSaveTrial } from '../core/storage.js';
import { openTruthBulletModal } from '../modals/truthBulletModal.js';
import { generateId, escapeHtml } from '../utils.js';

export function renderTruthBulletsView() {
  const grid = document.getElementById('mainGrid');

  if (state.truthBullets.length === 0) {
    grid.innerHTML = `
      <div id="truthBulletsContainer">
        <div class="script-empty-state">
          <div class="script-empty-icon">🎯</div>
          <h2>No Truth Bullets</h2>
          <p>Create truth bullets that can be used as evidence in debates</p>
          <button class="btn btn-primary script-add-btn" onclick="addTruthBullet()">
            ➕ Add Truth Bullet
          </button>
        </div>
      </div>
    `;
    updateFloatingAddButton();
    return;
  }

  // Auto-select first bullet if none selected
  if (!state.selectedTruthBulletId && state.truthBullets.length > 0) {
    state.selectedTruthBulletId = state.truthBullets[0].bulletId;
  }

  // Check if selected bullet still exists (might have been deleted)
  const selectedStillExists = state.truthBullets.some(
    (b) => b.bulletId === state.selectedTruthBulletId
  );
  if (!selectedStillExists && state.truthBullets.length > 0) {
    state.selectedTruthBulletId = state.truthBullets[0].bulletId;
  }

  const selectedBullet = state.truthBullets.find((b) => b.bulletId === state.selectedTruthBulletId);

  // Render list on left
  const listHtml = state.truthBullets.map((bullet) => renderTruthBulletListItem(bullet)).join('');

  // Render details on right
  const detailHtml = selectedBullet
    ? renderTruthBulletDetail(selectedBullet)
    : '<div class="no-selection">Select a truth bullet to view details</div>';

  grid.innerHTML = `
    <div id="truthBulletsContainer" class="truth-bullets-split-view">
      <div class="script-header">
        <h2>Truth Bullets</h2>
      </div>
      <div class="truth-bullets-content">
        <!-- LEFT: Bullet List -->
        <div class="truth-bullets-list-pane">
          ${listHtml}
        </div>

        <!-- RIGHT: Detail Pane -->
        <div class="truth-bullets-detail-pane">
          ${detailHtml}
        </div>
      </div>
    </div>
  `;

  // Update floating add button
  updateFloatingAddButton();
}

export function renderTruthBulletListItem(bullet) {
  const isSelected = bullet.bulletId === state.selectedTruthBulletId;
  const displayName = escapeHtml(bullet.name || 'Unnamed Bullet');

  return `
    <div class="truth-bullet-list-item ${isSelected ? 'selected' : ''}"
         data-bullet-id="${bullet.bulletId}"
         onclick="selectTruthBullet('${bullet.bulletId}')">
      <span class="bullet-list-name">${displayName}</span>
      <div class="bullet-list-actions">
        <button onclick="openTruthBulletModal('${bullet.bulletId}'); event.stopPropagation()" title="Edit bullet">✏️</button>
        <button onclick="deleteTruthBullet('${bullet.bulletId}'); event.stopPropagation()" title="Delete bullet">🗑️</button>
      </div>
    </div>
  `;
}

export function renderTruthBulletDetail(bullet) {
  const hasImage = bullet.imageFile && bullet.imageDataURL;

  return `
    <!-- TOP: Image Preview -->
    <div class="truth-bullet-image-preview">
      ${
        hasImage
          ? `<img src="${bullet.imageDataURL}" alt="${escapeHtml(bullet.name || 'Bullet image')}" />`
          : '<div class="truth-bullet-no-image-large">📷</div>'
      }
    </div>

    <!-- BOTTOM: Details -->
    <div class="truth-bullet-details">
      <div class="detail-row">
        <label>Name</label>
        <span>${escapeHtml(bullet.name || 'Unnamed Bullet')}</span>
      </div>

      <div class="detail-row">
        <label>Description</label>
        <p>${escapeHtml(bullet.description || 'No description provided')}</p>
      </div>

      ${
        bullet.inversedLieBulletName
          ? `
        <div class="detail-row">
          <label>Lie Form</label>
          <span class="lie-tag">${escapeHtml(bullet.inversedLieBulletName)}</span>
        </div>
      `
          : ''
      }

      <div class="detail-actions">
        <button class="btn btn-primary" onclick="openTruthBulletModal('${bullet.bulletId}')">✏️ Edit Bullet</button>
        <button class="btn btn-danger" onclick="deleteTruthBullet('${bullet.bulletId}')">🗑️ Delete Bullet</button>
      </div>
    </div>
  `;
}

export function selectTruthBullet(bulletId) {
  state.selectedTruthBulletId = bulletId;
  renderTruthBulletsView();
}

export function addTruthBullet() {
  const newBullet = {
    bulletId: generateId('tb'),
    name: '',
    description: '',
    imageFile: null,
    inversedLieBulletName: '',
  };
  state.truthBullets.push(newBullet);

  // Auto-select the newly created bullet
  state.selectedTruthBulletId = newBullet.bulletId;

  renderTruthBulletsView();
  openTruthBulletModal(newBullet.bulletId);
}

export function deleteTruthBullet(bulletId) {
  if (
    !confirm('Delete this truth bullet? It will be removed from any debates that reference it.')
  ) {
    return;
  }

  // Find the index of the bullet being deleted
  const bulletIndex = state.truthBullets.findIndex((b) => b.bulletId === bulletId);

  // Remove the bullet
  state.truthBullets = state.truthBullets.filter((b) => b.bulletId !== bulletId);

  // Remove from all minigame selections
  state.minigames.forEach((mg) => {
    if (mg.typeSpecific && mg.typeSpecific.selectedBullets) {
      mg.typeSpecific.selectedBullets = mg.typeSpecific.selectedBullets.filter(
        (id) => id !== bulletId
      );
    }
  });

  // Smart selection: if deleting the selected bullet, select another one
  if (state.selectedTruthBulletId === bulletId) {
    if (state.truthBullets.length > 0) {
      // Try to select the next bullet, or the previous one if it was the last
      const newIndex = Math.min(bulletIndex, state.truthBullets.length - 1);
      state.selectedTruthBulletId = state.truthBullets[newIndex].bulletId;
    } else {
      state.selectedTruthBulletId = null;
    }
  }

  renderTruthBulletsView();
  autoSaveTrial();
}
