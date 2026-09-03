// Nonstop Debate editor: truth bullet selection and dialogue lines.

// Audio players state
import { moveItem, reindexOrder } from '../../core/listOps.js';
import { icon } from '../../ui/icons.js';
import {
  deleteMinigameAudioFile,
  loadMinigameAudioFile,
  saveMinigameAudioFile,
  validateAudioUpload,
} from '../../core/minigameAudio.js';
import { seekAudioPreview, toggleAudioPreview } from '../../components/audioPreview.js';
import { confirmDialog, showToast } from '../../ui/dialogs.js';
import { renderCharacterOptions } from '../../models/characterModel.js';
import { state } from '../../core/state.js';
import { autoSaveTrial } from '../../core/storage.js';
import {
  TEXT_DIRECTIONS,
  TEXT_EFFECTS,
  TEXT_FONTS,
  renderTextStyleOptions,
} from '../../core/debateTextOptions.js';
import { orderedCopy } from '../../core/minigameDefaults.js';
import { generateId, escapeHtml } from '../../utils.js';
import { findMinigame, renderMinigameDetails } from '../minigameView.js';
import { renderVoiceLineField, voiceLineElementIds } from './voiceLineField.js';
import { registerActions } from '../../ui/actions.js';

// The move and delete buttons sit inside the line header, which toggles it,
// so innermost-wins replaces their `event.stopPropagation()`.
registerActions('click', {
  toggleBulletForMinigame: (el) =>
    toggleBulletForMinigame(el.dataset.gameId, el.dataset.bulletId),
  addDialogueLine: (el) => addDialogueLine(el.dataset.gameId),
  moveDialogueLineUp: (el) => moveDialogueLineUp(el.dataset.gameId, el.dataset.lineId),
  moveDialogueLineDown: (el) => moveDialogueLineDown(el.dataset.gameId, el.dataset.lineId),
  deleteDialogueLine: (el) => deleteDialogueLine(el.dataset.gameId, el.dataset.lineId),
  toggleSection: (el) => toggleSection(el.dataset.lineId, el.dataset.section),
  playDialogueAudioPreview: (el) =>
    playDialogueAudioPreview(el.dataset.gameId, el.dataset.lineId),
  clearDialogueVoiceLine: (el) => clearDialogueVoiceLine(el.dataset.gameId, el.dataset.lineId),
});

registerActions('input', {
  seekDialogueAudio: (el) => seekDialogueAudio(el.dataset.gameId, el.dataset.lineId, el.value),
});

registerActions('change', {
  // A checkbox reports .checked, everything else .value.
  updateDialogueLine: (el) =>
    updateDialogueLine(
      el.dataset.gameId,
      el.dataset.lineId,
      el.dataset.field,
      'checkbox' in el.dataset ? el.checked : el.value
    ),
  handleDialogueVoiceUpload: (el, event) =>
    handleDialogueVoiceUpload(el.dataset.gameId, el.dataset.lineId, event),
});
import { renderOptions } from '../../ui/options.js';

// The header, the Add button and addDialogueLine all read this, so the
// number the author is shown and the number enforced cannot drift apart.
const MAX_DIALOGUE_LINES = 30;

// Drag state for dialogue lines

// lineId -> { textStyling, characterDisplay, feedback }
// Per-line collapse state, keyed by lineId. Pruned in deleteDialogueLine:
// it lives for the life of the page, so without that it grows by one entry
// per deleted line and never shrinks.
const expandedSections = {};

// The shape a nonstop debate line actually has. Exported so the shared test
// fixture can be checked against it: the fixture used to certify field names
// (text, isWeakPoint, correctBulletId) that no code ever wrote or read, and
// neither validator constrains typeSpecific enough to notice.
export function createDialogueLine(lineId, order) {
  return {
    lineId,
    order,
    sentenceBeginning: '',
    target: '',
    sentenceEnd: '',
    isShootable: false,
    answerBulletId: null,
    useNegativeBullet: false,
    textEffect: 'normal',
    textMovementDirection: 'left_to_right',
    userFailedComment: '',
    userWrongAnswerComment: '',
    textFont: 'default',
    characterSpotlight: false,
    characterId: '',
    voiceLineFile: null,
  };
}

export function toggleSection(lineId, sectionName) {
  if (!expandedSections[lineId]) {
    expandedSections[lineId] = {};
  }
  expandedSections[lineId][sectionName] = !expandedSections[lineId][sectionName];
  renderMinigameDetails();
}

export function isSectionExpanded(lineId, sectionName) {
  return expandedSections[lineId]?.[sectionName] || false;
}

// --- Main Rendering ---

export function renderNonstopDebateEditor(mg) {
  // Read-only: seeding lives in ensureTypeSpecific, called at load and on a
  // gameType change. Doing it here mutated trial data as a side effect of
  // expanding a card, and the next autosave persisted a change undo never saw.
  const typeSpecific = mg.typeSpecific || {};
  const selectedBullets = typeSpecific.selectedBullets || [];
  const dialogueLines = typeSpecific.dialogueLines || [];

  let html = `
    <div class="minigame-editor-section">
      <h3>Truth Bullets Selection</h3>
      <p class="help-text">Select up to 6 truth bullets for this debate (${selectedBullets.length}/6)</p>
  `;

  if (state.truthBullets.length === 0) {
    html += `
      <div class="empty-state-small">
        <p>No truth bullets available. Create some in the Truth Bullets section first.</p>
      </div>
    `;
  } else {
    html += `<div class="bullet-selection-grid">`;
    state.truthBullets.forEach((bullet) => {
      const isSelected = selectedBullets.includes(bullet.bulletId);
      html += `
        <div class="bullet-select-card ${isSelected ? 'selected' : ''}"
             data-game-id="${escapeHtml(mg.gameId)}" data-bullet-id="${escapeHtml(bullet.bulletId)}"
             data-on-click="toggleBulletForMinigame">
          <div class="bullet-select-checkbox">${isSelected ? icon('check', { size: 14 }) : ''}</div>
          <div class="bullet-select-image">
            ${bullet.imageDataURL ? `<img src="${bullet.imageDataURL}" alt="${escapeHtml(bullet.name)}">` : icon('image', { size: 28 })}
          </div>
          <div class="bullet-select-info">
            <div class="bullet-select-name">${escapeHtml(bullet.name || 'Unnamed')}</div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `</div>`;

  html += `
    <div class="minigame-editor-section">
      <h3>Debate Dialogue Lines (${dialogueLines.length}/${MAX_DIALOGUE_LINES})</h3>
  `;

  if (dialogueLines.length === 0) {
    html += `
      <div class="empty-state-small">
        <p>No dialogue lines yet. Click "Add Dialogue Line" to create your first line.</p>
      </div>
    `;
  } else {
    html += `<div class="dialogue-drop-zone"
                  data-insert-position="0"
                  data-on-dragover="listGapDragOver"
                  data-game-id="${escapeHtml(mg.gameId)}" data-list-key="dialogueLines"
           data-on-drop="listDropInGap"
                  data-on-dragleave="listGapDragLeave"></div>`;

    orderedCopy(dialogueLines).forEach((line, index) => {
      html += `
        <div class="dialogue-line-wrapper"
             draggable="true"
             data-list-key="dialogueLines" data-id-key="lineId" data-item-id="${escapeHtml(line.lineId)}"
           data-on-dragstart="listDragStart"
             data-on-dragend="listDragEnd">
          ${renderDialogueLineEditor(mg.gameId, line, index)}
        </div>
        <div class="dialogue-drop-zone"
             data-insert-position="${index + 1}"
             data-on-dragover="listGapDragOver"
             data-game-id="${escapeHtml(mg.gameId)}" data-list-key="dialogueLines"
           data-on-drop="listDropInGap"
             data-on-dragleave="listGapDragLeave"></div>
      `;
    });
  }

  html += `</div>`;

  // The button hides at the cap; addDialogueLine enforces it.
  if (dialogueLines.length < MAX_DIALOGUE_LINES) {
    html += `
      <button class="minigame-floating-btn"
              data-game-id="${escapeHtml(mg.gameId)}" data-on-click="addDialogueLine"
              title="Add Dialogue Line">
        ${icon('plus', { size: 20 })} <span class="minigame-floating-btn-text">Add Dialogue Line</span>
      </button>
    `;
  }

  return html;
}

export function renderDialogueLineEditor(gameId, line, index) {
  const fullSentence = `${line.sentenceBeginning || ''}${line.target || ''}${line.sentenceEnd || ''}`;

  return `
    <div class="dialogue-line-card ${line.isShootable ? 'shootable-target' : ''}" data-line-id="${line.lineId}">
      <div class="dialogue-line-header">
        <div class="dialogue-drag-handle">
          <div class="arrow-btn arrow-up"
               data-game-id="${escapeHtml(gameId)}" data-line-id="${escapeHtml(line.lineId)}"
               data-on-click="moveDialogueLineUp"
               title="Move up">${icon('chevronUp', { size: 14 })}</div>
          <div class="arrow-btn arrow-down"
               data-game-id="${escapeHtml(gameId)}" data-line-id="${escapeHtml(line.lineId)}"
               data-on-click="moveDialogueLineDown"
               title="Move down">${icon('chevronDown', { size: 14 })}</div>
        </div>
        <div class="dialogue-line-number">#${index + 1}</div>
        <div class="dialogue-line-preview">${fullSentence ? escapeHtml(fullSentence) : '&lt;empty line&gt;'}</div>
        <button class="btn-icon" data-game-id="${escapeHtml(gameId)}" data-line-id="${escapeHtml(line.lineId)}"
                data-on-click="deleteDialogueLine" title="Delete line">${icon('trash', { size: 16 })}</button>
      </div>

      <div class="dialogue-line-body">
        <!-- 1. CHARACTER (moved to top) -->
        <div class="form-group">
          <label>Character</label>
          <select class="form-input" data-game-id="${escapeHtml(gameId)}" data-line-id="${escapeHtml(line.lineId)}" data-field="characterId" data-on-change="updateDialogueLine">
            ${renderCharacterOptions(line.characterId)}
          </select>
        </div>

        <!-- 2. SENTENCE STRUCTURE -->
        <div class="form-group">
          <label>Sentence Structure</label>
          <div class="sentence-structure">
            <input type="text"
                   class="form-input sentence-part"
                   value="${escapeHtml(line.sentenceBeginning || '')}"
                   data-game-id="${escapeHtml(gameId)}" data-line-id="${escapeHtml(line.lineId)}" data-field="sentenceBeginning" data-on-change="updateDialogueLine"
                   placeholder="Beginning...">
            <input type="text"
                   class="form-input sentence-part target-part"
                   value="${escapeHtml(line.target || '')}"
                   data-game-id="${escapeHtml(gameId)}" data-line-id="${escapeHtml(line.lineId)}" data-field="target" data-on-change="updateDialogueLine"
                   placeholder="Target (shootable)">
            <input type="text"
                   class="form-input sentence-part"
                   value="${escapeHtml(line.sentenceEnd || '')}"
                   data-game-id="${escapeHtml(gameId)}" data-line-id="${escapeHtml(line.lineId)}" data-field="sentenceEnd" data-on-change="updateDialogueLine"
                   placeholder="...end">
          </div>
        </div>

        <!-- 3. CORRECT ANSWER BULLET -->
        <div class="form-row">
          <div class="form-group">
            <label>Correct Answer Bullet</label>
            <select class="form-input"
                    data-game-id="${escapeHtml(gameId)}" data-line-id="${escapeHtml(line.lineId)}" data-field="answerBulletId" data-on-change="updateDialogueLine">
              ${renderOptions(
                [
                  { value: '', label: 'No answer (false target)' },
                  ...state.truthBullets.map((bullet) => ({
                    value: bullet.bulletId,
                    label: bullet.name || 'Unnamed Bullet',
                  })),
                ],
                line.answerBulletId
              )}
            </select>
          </div>

          ${
            line.answerBulletId
              ? `
            <div class="form-group">
              <label>
                <input type="checkbox"
                       ${line.useNegativeBullet ? 'checked' : ''}
                       data-game-id="${escapeHtml(gameId)}" data-line-id="${escapeHtml(line.lineId)}" data-field="useNegativeBullet" data-checkbox data-on-change="updateDialogueLine">
                Use Lie/Negative Version
              </label>
            </div>
          `
              : ''
          }
        </div>

        <!-- 4. VOICE LINE AUDIO (moved up) -->
        <div class="form-group">
          <label>Voice Line Audio</label>
          ${renderVoiceLineField({
            fileName: line.voiceLineFile,
            idBase: line.lineId,
            data: { gameId, lineId: line.lineId },
            actions: {
              play: 'playDialogueAudioPreview',
              seek: 'seekDialogueAudio',
              clear: 'clearDialogueVoiceLine',
              upload: 'handleDialogueVoiceUpload',
            },
          })}
        </div>

        <!-- 5. COLLAPSIBLE: Advanced Text Styling -->
        <div class="collapsible-section">
          <button type="button"
                  class="collapsible-header ${isSectionExpanded(line.lineId, 'textStyling') ? 'expanded' : ''}"
                  data-line-id="${escapeHtml(line.lineId)}" data-section="textStyling"
                  data-on-click="toggleSection">
            <span class="collapsible-icon">${isSectionExpanded(line.lineId, 'textStyling') ? icon('chevronDown', { size: 12 }) : icon('chevronRight', { size: 12 })}</span>
            <span class="collapsible-title">Advanced Text Styling</span>
            <span class="collapsible-badge">Optional</span>
          </button>
          ${
            isSectionExpanded(line.lineId, 'textStyling')
              ? `
            <div class="collapsible-content">
              <div class="form-row">
                <div class="form-group">
                  <label>Text Effect</label>
                  <select class="form-input" data-game-id="${escapeHtml(gameId)}" data-line-id="${escapeHtml(line.lineId)}" data-field="textEffect" data-on-change="updateDialogueLine">
                    ${renderTextStyleOptions(TEXT_EFFECTS, line.textEffect)}
                  </select>
                </div>

                <div class="form-group">
                  <label>Text Font</label>
                  <select class="form-input" data-game-id="${escapeHtml(gameId)}" data-line-id="${escapeHtml(line.lineId)}" data-field="textFont" data-on-change="updateDialogueLine">
                    ${renderTextStyleOptions(TEXT_FONTS, line.textFont)}
                  </select>
                </div>

                <div class="form-group">
                  <label>Movement Direction</label>
                  <select class="form-input" data-game-id="${escapeHtml(gameId)}" data-line-id="${escapeHtml(line.lineId)}" data-field="textMovementDirection" data-on-change="updateDialogueLine">
                    ${renderTextStyleOptions(TEXT_DIRECTIONS, line.textMovementDirection)}
                  </select>
                </div>
              </div>
            </div>
          `
              : ''
          }
        </div>

        <!-- 6. COLLAPSIBLE: Character Display -->
        <div class="collapsible-section">
          <button type="button"
                  class="collapsible-header ${isSectionExpanded(line.lineId, 'characterDisplay') ? 'expanded' : ''}"
                  data-line-id="${escapeHtml(line.lineId)}" data-section="characterDisplay"
                  data-on-click="toggleSection">
            <span class="collapsible-icon">${isSectionExpanded(line.lineId, 'characterDisplay') ? icon('chevronDown', { size: 12 }) : icon('chevronRight', { size: 12 })}</span>
            <span class="collapsible-title">Character Display</span>
            <span class="collapsible-badge">Optional</span>
          </button>
          ${
            isSectionExpanded(line.lineId, 'characterDisplay')
              ? `
            <div class="collapsible-content">
              <div class="form-group">
                <label>
                  <input type="checkbox"
                         ${line.characterSpotlight ? 'checked' : ''}
                         data-game-id="${escapeHtml(gameId)}" data-line-id="${escapeHtml(line.lineId)}" data-field="characterSpotlight" data-checkbox data-on-change="updateDialogueLine">
                  Enable Character Spotlight
                </label>
              </div>
            </div>
          `
              : ''
          }
        </div>

        <!-- 7. COLLAPSIBLE: User Feedback Messages -->
        <div class="collapsible-section">
          <button type="button"
                  class="collapsible-header ${isSectionExpanded(line.lineId, 'feedback') ? 'expanded' : ''}"
                  data-line-id="${escapeHtml(line.lineId)}" data-section="feedback"
                  data-on-click="toggleSection">
            <span class="collapsible-icon">${isSectionExpanded(line.lineId, 'feedback') ? icon('chevronDown', { size: 12 }) : icon('chevronRight', { size: 12 })}</span>
            <span class="collapsible-title">User Feedback Messages</span>
            <span class="collapsible-badge">Optional</span>
          </button>
          ${
            isSectionExpanded(line.lineId, 'feedback')
              ? `
            <div class="collapsible-content">
              <div class="form-row">
                <div class="form-group">
                  <label>User Failed Comment</label>
                  <input type="text"
                         class="form-input"
                         value="${escapeHtml(line.userFailedComment || '')}"
                         data-game-id="${escapeHtml(gameId)}" data-line-id="${escapeHtml(line.lineId)}" data-field="userFailedComment" data-on-change="updateDialogueLine"
                         placeholder="Message when user fails">
                </div>

                <div class="form-group">
                  <label>Wrong Answer Comment</label>
                  <input type="text"
                         class="form-input"
                         value="${escapeHtml(line.userWrongAnswerComment || '')}"
                         data-game-id="${escapeHtml(gameId)}" data-line-id="${escapeHtml(line.lineId)}" data-field="userWrongAnswerComment" data-on-change="updateDialogueLine"
                         placeholder="Message when user shoots wrong target">
                </div>
              </div>
            </div>
          `
              : ''
          }
        </div>
      </div>
    </div>
  `;
}

// --- Truth Bullet Selection ---

export function toggleBulletForMinigame(gameId, bulletId) {
  const mg = findMinigame(gameId);
  if (!mg || !mg.typeSpecific) return;

  const selectedBullets = mg.typeSpecific.selectedBullets;
  const index = selectedBullets.indexOf(bulletId);

  if (index !== -1) {
    selectedBullets.splice(index, 1);
  } else {
    if (selectedBullets.length >= 6) {
      showToast('Maximum 6 truth bullets can be selected.', { type: 'warning' });
      return;
    }
    selectedBullets.push(bulletId);
  }

  renderMinigameDetails();
  autoSaveTrial();
}

// --- Dialogue Line Management ---

export function addDialogueLine(gameId) {
  const mg = findMinigame(gameId);
  if (!mg || !mg.typeSpecific) return;

  if (!mg.typeSpecific.dialogueLines) {
    mg.typeSpecific.dialogueLines = [];
  }

  // Enforced, not just hidden. 30 was described as the cap while the only
  // thing it did was hide the Add button, so every other route in - a
  // keyboard shortcut, a future bulk-add - walked straight past it.
  // debateScrumEditor caps its 8 arguments this way and its comment is
  // therefore true.
  if (mg.typeSpecific.dialogueLines.length >= MAX_DIALOGUE_LINES) {
    showToast(`Maximum ${MAX_DIALOGUE_LINES} dialogue lines allowed.`, { type: 'warning' });
    return;
  }

  mg.typeSpecific.dialogueLines.push(
    createDialogueLine(generateId('dl'), mg.typeSpecific.dialogueLines.length)
  );
  renderMinigameDetails();
  autoSaveTrial();
}

export function updateDialogueLine(gameId, lineId, field, value) {
  const mg = findMinigame(gameId);
  if (!mg || !mg.typeSpecific || !mg.typeSpecific.dialogueLines) return;

  const line = mg.typeSpecific.dialogueLines.find((l) => l.lineId === lineId);
  if (line) {
    line[field] = value;

    // A line is shootable exactly when it has an answer bullet.
    if (field === 'answerBulletId') {
      line.isShootable = value !== '' && value !== null;
    }

    renderMinigameDetails();
    autoSaveTrial();
  }
}

export async function deleteDialogueLine(gameId, lineId) {
  const confirmed = await confirmDialog({
    title: 'Delete dialogue line',
    message: 'Delete this dialogue line?',
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return;

  const mg = findMinigame(gameId);
  if (!mg || !mg.typeSpecific || !mg.typeSpecific.dialogueLines) return;

  // Awaited, so a failed delete surfaces instead of being fired and forgotten
  // - and so the file goes with the line. addDirectoryToZip walks the real
  // directory, so an orphan ships in every .drtrial from here on.
  const line = mg.typeSpecific.dialogueLines.find((l) => l.lineId === lineId);
  if (line) await deleteMinigameAudioFile(gameId, line.voiceLineFile);

  mg.typeSpecific.dialogueLines = mg.typeSpecific.dialogueLines.filter((l) => l.lineId !== lineId);
  delete expandedSections[lineId];
  reindexOrder(mg.typeSpecific.dialogueLines);

  renderMinigameDetails();
  autoSaveTrial();
}

// --- Dialogue Line Reordering ---

export function moveDialogueLineUp(gameId, lineId) {
  const mg = findMinigame(gameId);
  if (!mg) return;
  if (!moveItem(mg.typeSpecific.dialogueLines, 'lineId', lineId, -1)) return;
  renderMinigameDetails();
  autoSaveTrial();
}

export function moveDialogueLineDown(gameId, lineId) {
  const mg = findMinigame(gameId);
  if (!mg) return;
  if (!moveItem(mg.typeSpecific.dialogueLines, 'lineId', lineId, 1)) return;
  renderMinigameDetails();
  autoSaveTrial();
}

// --- Voice Line Handling ---

export async function handleDialogueVoiceUpload(gameId, lineId, event) {
  const file = validateAudioUpload(event);
  if (!file) return;

  const mg = findMinigame(gameId);
  if (!mg) return;

  const line = mg.typeSpecific.dialogueLines.find((l) => l.lineId === lineId);
  if (!line) return;

  try {
    const ext = file.name.split('.').pop();
    const audioFileName = `dialogue_${lineId}.${ext}`;
    await saveMinigameAudioFile(gameId, audioFileName, file);

    line.voiceLineFile = audioFileName;
    line.voiceLineBlob = file;

    renderMinigameDetails();
    autoSaveTrial();
  } catch (error) {
    console.error('Error saving audio file:', error);
    showToast(`Failed to save audio: ${error.message}`, { type: 'error' });
  }
}

export async function clearDialogueVoiceLine(gameId, lineId) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const line = mg.typeSpecific.dialogueLines.find((l) => l.lineId === lineId);
  if (!line) return;

  await deleteMinigameAudioFile(gameId, line.voiceLineFile);
  line.voiceLineFile = null;
  line.voiceLineBlob = null;

  renderMinigameDetails();
  autoSaveTrial();
}

// --- Audio Playback ---

export async function playDialogueAudioPreview(gameId, lineId) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const line = mg.typeSpecific.dialogueLines.find((l) => l.lineId === lineId);
  if (!line || !line.voiceLineFile) return;

  await toggleAudioPreview(`${gameId}_${lineId}`, {
    ...voiceLineElementIds(lineId),
    getBlob: async () => {
      if (!line.voiceLineBlob) {
        line.voiceLineBlob = await loadMinigameAudioFile(gameId, line.voiceLineFile);
      }
      return line.voiceLineBlob;
    },
  });
}

export function seekDialogueAudio(gameId, lineId, value) {
  seekAudioPreview(`${gameId}_${lineId}`, value);
}
