// Hangman's Gambit editor: just the answer key.
import { findMinigame } from '../minigameView.js';
import { autoSaveTrial } from '../../core/storage.js';
import { escapeHtml } from '../../utils.js';
import { registerActions } from '../../ui/actions.js';

registerActions('change', {
  updateHangmansGambitField: (el) =>
    updateHangmansGambitField(el.dataset.gameId, el.dataset.field, el.value),
});

export function renderHangmansGambitEditor(mg) {
  // Read-only: seeding lives in ensureTypeSpecific, called at load and on a
  // gameType change. Doing it here mutated trial data as a side effect of
  // expanding a card, and the next autosave persisted a change undo never saw.
  const answerKey = (mg.typeSpecific && mg.typeSpecific.answerKey) || '';

  return `
    <div class="minigame-editor-section">
      <h3>Answer Key</h3>
      <p class="help-text">Enter the answer key for this Hangman's Gambit puzzle.</p>

      <div class="form-group">
        <label>Answer Key</label>
        <input type="text"
               class="form-input"
               value="${escapeHtml(answerKey)}"
               data-game-id="${escapeHtml(mg.gameId)}" data-field="answerKey"
               data-on-change="updateHangmansGambitField"
               placeholder="Enter answer key">
      </div>
    </div>
  `;
}

export function updateHangmansGambitField(gameId, field, value) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  if (!mg.typeSpecific) {
    mg.typeSpecific = {};
  }

  mg.typeSpecific[field] = value;
  autoSaveTrial();
}
