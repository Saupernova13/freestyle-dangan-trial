// Truth bullets, as a split pane: list on the left, detail on the right.
import { updateFloatingAddButton } from '../components/floatingAddButton.js';
import { icon } from '../ui/icons.js';
import { removeEntry, reportFailedRemoval } from '../core/fileOps.js';
import { markFileDeleted } from '../core/history.js';
import { detachTruthBullet } from '../core/references.js';
import { state } from '../core/state.js';
import { autoSaveTrial } from '../core/storage.js';
import { openTruthBulletModal } from '../modals/truthBulletModal.js';
import { confirmDialog } from '../ui/dialogs.js';
import { generateId, escapeHtml } from '../utils.js';

import { setHtml } from '../ui/dom.js';
import { registerActions } from '../ui/actions.js';

// The edit and delete buttons sit inside the list row, so the innermost-wins
// rule is what keeps a click on one of them from also selecting the row -
// which is what the two `event.stopPropagation()` calls used to do by hand.
registerActions('click', {
  addTruthBullet: () => addTruthBullet(),
  selectTruthBullet: (el) => selectTruthBullet(el.dataset.bulletId),
  openTruthBulletModal: (el) => openTruthBulletModal(el.dataset.bulletId),
  deleteTruthBullet: (el) => deleteTruthBullet(el.dataset.bulletId),
});

export function renderTruthBulletsView() {
  const grid = document.getElementById('mainGrid');

  if (state.truthBullets.length === 0) {
    setHtml(
      grid,
      `
      <div id="truthBulletsContainer">
        <div class="script-empty-state">
          <div class="script-empty-icon">${icon('target', { size: 56 })}</div>
          <h2>No Truth Bullets</h2>
          <p>Create truth bullets that can be used as evidence in debates</p>
          <button class="btn btn-primary script-add-btn" data-on-click="addTruthBullet">
            ${icon('plus')} Add Truth Bullet
          </button>
        </div>
      </div>
    `
    );
    updateFloatingAddButton();
    return;
  }

  if (!state.selectedTruthBulletId && state.truthBullets.length > 0) {
    state.selectedTruthBulletId = state.truthBullets[0].bulletId;
  }

  // The selection can be stale after a delete or an undo.
  const selectedStillExists = state.truthBullets.some(
    (b) => b.bulletId === state.selectedTruthBulletId
  );
  if (!selectedStillExists && state.truthBullets.length > 0) {
    state.selectedTruthBulletId = state.truthBullets[0].bulletId;
  }

  const selectedBullet = state.truthBullets.find((b) => b.bulletId === state.selectedTruthBulletId);

  const listHtml = state.truthBullets.map((bullet) => renderTruthBulletListItem(bullet)).join('');

  const detailHtml = selectedBullet
    ? renderTruthBulletDetail(selectedBullet)
    : '<div class="no-selection">Select a truth bullet to view details</div>';

  setHtml(
    grid,
    `
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
  `
  );

  updateFloatingAddButton();
}

export function renderTruthBulletListItem(bullet) {
  const isSelected = bullet.bulletId === state.selectedTruthBulletId;
  const displayName = escapeHtml(bullet.name || 'Unnamed Bullet');

  return `
    <div class="truth-bullet-list-item ${isSelected ? 'selected' : ''}"
         data-bullet-id="${escapeHtml(bullet.bulletId)}"
         data-on-click="selectTruthBullet">
      <span class="bullet-list-name">${displayName}</span>
      <div class="bullet-list-actions">
        <button data-bullet-id="${escapeHtml(bullet.bulletId)}"
                data-on-click="openTruthBulletModal" title="Edit bullet">${icon('edit', { size: 16 })}</button>
        <button data-bullet-id="${escapeHtml(bullet.bulletId)}"
                data-on-click="deleteTruthBullet" title="Delete bullet">${icon('trash', { size: 16 })}</button>
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
          : `<div class="truth-bullet-no-image-large">${icon('image', { size: 48 })}</div>`
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
        <button class="btn btn-primary" data-bullet-id="${escapeHtml(bullet.bulletId)}"
                data-on-click="openTruthBulletModal">${icon('edit')} Edit Bullet</button>
        <button class="btn btn-danger" data-bullet-id="${escapeHtml(bullet.bulletId)}"
                data-on-click="deleteTruthBullet">${icon('trash')} Delete Bullet</button>
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

  state.selectedTruthBulletId = newBullet.bulletId;

  renderTruthBulletsView();
  // Flagged so cancelling out of the modal takes the placeholder with it.
  openTruthBulletModal(newBullet.bulletId, { isNew: true });
}

export async function deleteTruthBullet(bulletId) {
  const confirmed = await confirmDialog({
    title: 'Delete truth bullet',
    message: 'Delete this truth bullet? It will be removed from any debates that reference it.',
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return;

  // Captured before the removal, to pick the replacement selection below.
  const bulletIndex = state.truthBullets.findIndex((b) => b.bulletId === bulletId);
  const bullet = state.truthBullets[bulletIndex];

  // The image was never deleted at all - not swallowed, simply never
  // attempted - so every deleted bullet left its picture in TruthBullets/ and
  // in every export from then on.
  if (bullet && bullet.imageFile && state.dirHandle) {
    const bulletsDir = await state.dirHandle
      .getDirectoryHandle('TruthBullets', { create: false })
      .catch(() => null);
    reportFailedRemoval(bullet.imageFile, await removeEntry(bulletsDir, bullet.imageFile));
    // Undo cannot bring the bytes back, so it must not step past this.
    markFileDeleted();
  }

  state.truthBullets = state.truthBullets.filter((b) => b.bulletId !== bulletId);

  // Every reference, not just selectedBullets. answerBulletId IS the correct
  // answer, and leaving it dangling left a weak point that stayed visible and
  // could never be shot - so the minigame could not be completed, which is
  // precisely what the confirm dialog above promises will not happen.
  detachTruthBullet(state.minigames, bulletId);

  // Land on the next bullet, or the previous one if the last was deleted.
  if (state.selectedTruthBulletId === bulletId) {
    if (state.truthBullets.length > 0) {
      const newIndex = Math.min(bulletIndex, state.truthBullets.length - 1);
      state.selectedTruthBulletId = state.truthBullets[newIndex].bulletId;
    } else {
      state.selectedTruthBulletId = null;
    }
  }

  renderTruthBulletsView();
  autoSaveTrial();
}
