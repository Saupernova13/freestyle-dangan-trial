// Hangman's Gambit editor: just the answer key.
import { findMinigame } from '../minigameView.js';
import { autoSaveTrial } from '../../core/storage.js';
import { escapeHtml } from '../../utils.js';

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
               onchange="updateHangmansGambitField('${mg.gameId}', 'answerKey', this.value)"
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
