// Hangman's Gambit minigame editor
// Simple answer key configuration
import { findMinigame } from '../minigameView.js';
import { autoSaveTrial } from '../../core/storage.js';
import { escapeHtml } from '../../utils.js';

export function renderHangmansGambitEditor(mg) {
  // Initialize typeSpecific if needed
  if (!mg.typeSpecific) {
    mg.typeSpecific = {};
  }
  if (mg.typeSpecific.answerKey === undefined) {
    mg.typeSpecific.answerKey = '';
  }

  return `
    <div class="minigame-editor-section">
      <h3>Answer Key</h3>
      <p class="help-text">Enter the answer key for this Hangman's Gambit puzzle.</p>

      <div class="form-group">
        <label>Answer Key</label>
        <input type="text"
               class="form-input"
               value="${escapeHtml(mg.typeSpecific.answerKey || '')}"
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
