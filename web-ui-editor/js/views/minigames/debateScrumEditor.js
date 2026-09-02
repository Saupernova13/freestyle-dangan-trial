// Debate Scrum editor: paired opposition/defense arguments, with audio and
// keywords on each side.

// Drag state for arguments
import { dropAtGap, moveItem, reindexOrder } from '../../core/listOps.js';
import { orderedCopy } from '../../core/minigameDefaults.js';
import {
  deleteMinigameAudioFile,
  loadMinigameAudioFile,
  saveMinigameAudioFile,
  validateAudioUpload,
} from '../../core/minigameAudio.js';
import { toggleAudioPreview } from '../../components/audioPreview.js';
import { confirmDialog, showToast } from '../../ui/dialogs.js';
import { renderCharacterOptions } from '../../models/characterModel.js';
import { autoSaveTrial } from '../../core/storage.js';
import { generateId, escapeHtml } from '../../utils.js';
import { findMinigame, renderMinigameDetails } from '../minigameView.js';
let draggedArgumentId = null;

// ==================== Main Rendering ====================

export function renderDebateScrumEditor(mg) {
  // Read-only: seeding lives in ensureTypeSpecific, called at load and on a
  // gameType change. Doing it here mutated trial data as a side effect of
  // expanding a card, and the next autosave persisted a change undo never saw.
  const args = (mg.typeSpecific && mg.typeSpecific.arguments) || [];

  let html = `
    <div class="minigame-editor-section">
      <h3>Debate Arguments (${args.length}/8)</h3>
      <p class="help-text">Create paired opposition and defense statements.</p>
  `;

  if (args.length === 0) {
    html += `
      <div class="empty-state-small">
        <p>No arguments yet. Click "Add Argument" to create your first paired statement.</p>
      </div>
    `;
  } else {
    html += renderDebateScrumArguments(mg.gameId, args);
  }

  html += `</div>`;

  // 8 arguments is the cap.
  if (args.length < 8) {
    html += `
      <button class="minigame-floating-btn"
              onclick="addDebateScrumArgument('${mg.gameId}')"
              title="Add Argument">
        ${window.icon('plus', { size: 20 })} <span class="minigame-floating-btn-text">Add Argument</span>
      </button>
    `;
  }

  return html;
}

export function renderDebateScrumArguments(gameId, args) {
  let html = '';

  html += `<div class="argument-drop-zone"
                data-insert-position="0"
                ondragover="handleArgumentGapDragOver(event)"
                ondrop="handleArgumentDropInGap(event, '${gameId}', 0)"
                ondragleave="handleArgumentGapDragLeave(event)"></div>`;

  orderedCopy(args).forEach((arg, index) => {
    html += `
      <div class="argument-wrapper"
           draggable="true"
           ondragstart="handleArgumentDragStart(event, '${gameId}', '${arg.argumentId}')"
           ondragend="handleArgumentDragEnd(event)">
        ${renderDebateScrumArgumentEditor(gameId, arg, index)}
      </div>
      <div class="argument-drop-zone"
           data-insert-position="${index + 1}"
           ondragover="handleArgumentGapDragOver(event)"
           ondrop="handleArgumentDropInGap(event, '${gameId}', ${index + 1})"
           ondragleave="handleArgumentGapDragLeave(event)"></div>
    `;
  });

  return html;
}

export function renderDebateScrumArgumentEditor(gameId, arg, index) {
  return `
    <div class="debate-argument-card" data-argument-id="${arg.argumentId}">
      <div class="argument-header">
        <div class="argument-drag-handle">
          <div class="arrow-btn arrow-up"
               onclick="event.stopPropagation(); moveArgumentUp('${gameId}', '${arg.argumentId}')"
               title="Move up">${window.icon('chevronUp', { size: 14 })}</div>
          <div class="arrow-btn arrow-down"
               onclick="event.stopPropagation(); moveArgumentDown('${gameId}', '${arg.argumentId}')"
               title="Move down">${window.icon('chevronDown', { size: 14 })}</div>
        </div>
        <div class="argument-number">Argument #${index + 1}</div>
        <button class="btn-icon"
                onclick="event.stopPropagation(); deleteDebateScrumArgument('${gameId}', '${arg.argumentId}')"
                title="Delete argument">${window.icon('trash', { size: 16 })}</button>
      </div>

      <div class="argument-body">
        <div class="argument-side opposition-side">
          <h4><span style="color: var(--error)">${window.icon('dot', { size: 12 })}</span> Opposition Side</h4>

          <div class="form-group">
            <label>Character</label>
            <select class="form-input"
                    onchange="updateDebateScrumArgument('${gameId}', '${arg.argumentId}', 'oppositionCharacterId', this.value)">
              ${renderCharacterOptions(arg.oppositionCharacterId)}
            </select>
          </div>

          <div class="form-group">
            <label>Statement</label>
            <textarea class="form-input"
                      rows="3"
                      placeholder="Opposition statement..."
                      onchange="updateDebateScrumArgument('${gameId}', '${arg.argumentId}', 'oppositionStatement', this.value)">${escapeHtml(arg.oppositionStatement || '')}</textarea>
          </div>

          <div class="form-group">
            <label>Keywords (one per line)</label>
            <textarea class="form-input keywords-input"
                      rows="2"
                      placeholder="Enter keywords, one per line..."
                      onchange="updateDebateScrumArgumentKeywords('${gameId}', '${arg.argumentId}', 'opposition', this.value)">${escapeHtml((arg.oppositionKeywords || []).join('\n'))}</textarea>
            <small style="color: var(--text-tertiary);">Keywords that will be highlighted during this argument</small>
          </div>

          <div class="form-group">
            <label>Voice Line Audio</label>
            ${
              arg.oppositionAudioFile
                ? `
              <div class="audio-preview-mini">
                <span class="audio-icon">${window.icon('music', { size: 16 })}</span>
                <span class="audio-filename">${escapeHtml(arg.oppositionAudioFile)}</span>
                <button class="btn btn-secondary btn-sm"
                        id="scrum-play-btn-${arg.argumentId}-opposition"
                        onclick="playDebateScrumAudio('${gameId}', '${arg.argumentId}', 'opposition')">
                  ${window.icon('play')} Play
                </button>
                <button class="btn btn-secondary btn-sm"
                        onclick="clearDebateScrumAudio('${gameId}', '${arg.argumentId}', 'opposition')">
                  ${window.icon('trash')} Remove
                </button>
              </div>
            `
                : `
              <input type="file"
                     accept="audio/*"
                     onchange="handleDebateScrumAudioUpload('${gameId}', '${arg.argumentId}', 'opposition', event)">
            `
            }
          </div>
        </div>

        <div class="argument-side defense-side">
          <h4><span style="color: var(--secondary)">${window.icon('dot', { size: 12 })}</span> Defense Side</h4>

          <div class="form-group">
            <label>Character</label>
            <select class="form-input"
                    onchange="updateDebateScrumArgument('${gameId}', '${arg.argumentId}', 'defenseCharacterId', this.value)">
              ${renderCharacterOptions(arg.defenseCharacterId)}
            </select>
          </div>

          <div class="form-group">
            <label>Counter Statement</label>
            <textarea class="form-input"
                      rows="3"
                      placeholder="Defense counter statement..."
                      onchange="updateDebateScrumArgument('${gameId}', '${arg.argumentId}', 'defenseStatement', this.value)">${escapeHtml(arg.defenseStatement || '')}</textarea>
          </div>

          <div class="form-group">
            <label>Keywords (one per line)</label>
            <textarea class="form-input keywords-input"
                      rows="2"
                      placeholder="Enter keywords, one per line..."
                      onchange="updateDebateScrumArgumentKeywords('${gameId}', '${arg.argumentId}', 'defense', this.value)">${escapeHtml((arg.defenseKeywords || []).join('\n'))}</textarea>
            <small style="color: var(--text-tertiary);">Keywords that will be highlighted during this argument</small>
          </div>

          <div class="form-group">
            <label>Voice Line Audio</label>
            ${
              arg.defenseAudioFile
                ? `
              <div class="audio-preview-mini">
                <span class="audio-icon">${window.icon('music', { size: 16 })}</span>
                <span class="audio-filename">${escapeHtml(arg.defenseAudioFile)}</span>
                <button class="btn btn-secondary btn-sm"
                        id="scrum-play-btn-${arg.argumentId}-defense"
                        onclick="playDebateScrumAudio('${gameId}', '${arg.argumentId}', 'defense')">
                  ${window.icon('play')} Play
                </button>
                <button class="btn btn-secondary btn-sm"
                        onclick="clearDebateScrumAudio('${gameId}', '${arg.argumentId}', 'defense')">
                  ${window.icon('trash')} Remove
                </button>
              </div>
            `
                : `
              <input type="file"
                     accept="audio/*"
                     onchange="handleDebateScrumAudioUpload('${gameId}', '${arg.argumentId}', 'defense', event)">
            `
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==================== Argument Management ====================

export function addDebateScrumArgument(gameId) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  if (!mg.typeSpecific) mg.typeSpecific = {};
  if (!mg.typeSpecific.arguments) mg.typeSpecific.arguments = [];

  if (mg.typeSpecific.arguments.length >= 8) {
    showToast('Maximum 8 arguments allowed.', { type: 'warning' });
    return;
  }

  const newArg = {
    argumentId: generateId('arg'),
    order: mg.typeSpecific.arguments.length,
    oppositionStatement: '',
    oppositionCharacterId: '',
    oppositionAudioFile: null,
    oppositionAudioBlob: null,
    oppositionKeywords: [],
    defenseStatement: '',
    defenseCharacterId: '',
    defenseAudioFile: null,
    defenseAudioBlob: null,
    defenseKeywords: [],
  };

  mg.typeSpecific.arguments.push(newArg);
  renderMinigameDetails();
  autoSaveTrial();
}

export async function deleteDebateScrumArgument(gameId, argumentId) {
  // One click used to destroy the whole pair, with the button sitting right
  // beside the reorder arrows. Every comparable delete in the app confirms.
  const confirmed = await confirmDialog({
    title: 'Delete argument',
    message:
      'Delete this argument? Both the opposition and defense statements, ' +
      'their keywords and their audio go with it.',
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return;

  const mg = findMinigame(gameId);
  if (!mg) return;

  // Two files per argument, and the confirmation above promises both go.
  const argument = (mg.typeSpecific.arguments || []).find((a) => a.argumentId === argumentId);
  if (argument) {
    await deleteMinigameAudioFile(gameId, argument.oppositionAudioFile);
    await deleteMinigameAudioFile(gameId, argument.defenseAudioFile);
  }

  mg.typeSpecific.arguments = mg.typeSpecific.arguments.filter((a) => a.argumentId !== argumentId);
  reindexOrder(mg.typeSpecific.arguments);

  renderMinigameDetails();
  autoSaveTrial();
}

export function updateDebateScrumArgument(gameId, argumentId, field, value) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find((a) => a.argumentId === argumentId);
  if (!arg) return;

  arg[field] = value;
  autoSaveTrial();
}

export function updateDebateScrumArgumentKeywords(gameId, argumentId, side, value) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find((a) => a.argumentId === argumentId);
  if (!arg) return;

  // One keyword per line.
  const keywords = value
    .split('\n')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (side === 'opposition') {
    arg.oppositionKeywords = keywords;
  } else {
    arg.defenseKeywords = keywords;
  }

  autoSaveTrial();
}

// ==================== Argument Reordering ====================

export function moveArgumentUp(gameId, argumentId) {
  const mg = findMinigame(gameId);
  if (!mg) return;
  if (!moveItem(mg.typeSpecific.arguments, 'argumentId', argumentId, -1)) return;
  renderMinigameDetails();
  autoSaveTrial();
}

export function moveArgumentDown(gameId, argumentId) {
  const mg = findMinigame(gameId);
  if (!mg) return;
  if (!moveItem(mg.typeSpecific.arguments, 'argumentId', argumentId, 1)) return;
  renderMinigameDetails();
  autoSaveTrial();
}

// ==================== Drag-and-Drop for Arguments ====================

export function handleArgumentDragStart(event, gameId, argumentId) {
  draggedArgumentId = argumentId;
  event.target.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
}

export function handleArgumentDragEnd(event) {
  event.target.classList.remove('dragging');
  draggedArgumentId = null;
  document.querySelectorAll('.drag-over-gap').forEach((el) => {
    el.classList.remove('drag-over-gap');
  });
}

export function handleArgumentDropInGap(event, gameId, insertPosition) {
  event.preventDefault();
  event.stopPropagation();

  const mg = findMinigame(gameId);
  if (!mg || !draggedArgumentId) return;

  const changed = dropAtGap(
    mg.typeSpecific.arguments,
    'argumentId',
    [draggedArgumentId],
    insertPosition
  );
  draggedArgumentId = null;
  renderMinigameDetails();
  if (changed) autoSaveTrial();
}

export function handleArgumentGapDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('drag-over-gap');
}

export function handleArgumentGapDragLeave(event) {
  event.currentTarget.classList.remove('drag-over-gap');
}

// ==================== Audio Handling ====================

export async function handleDebateScrumAudioUpload(gameId, argumentId, side, event) {
  const file = validateAudioUpload(event);
  if (!file) return;

  const mg = findMinigame(gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find((a) => a.argumentId === argumentId);
  if (!arg) return;

  try {
    const ext = file.name.split('.').pop();
    const audioFileName = `scrum_${argumentId}_${side}.${ext}`;
    await saveMinigameAudioFile(gameId, audioFileName, file);

    if (side === 'opposition') {
      arg.oppositionAudioFile = audioFileName;
      arg.oppositionAudioBlob = file;
    } else {
      arg.defenseAudioFile = audioFileName;
      arg.defenseAudioBlob = file;
    }

    renderMinigameDetails();
    autoSaveTrial();
  } catch (error) {
    console.error('Error saving audio:', error);
    showToast(`Failed to save audio: ${error.message}`, { type: 'error' });
  }
}

export async function clearDebateScrumAudio(gameId, argumentId, side) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find((a) => a.argumentId === argumentId);
  if (!arg) return;

  const audioFile = side === 'opposition' ? arg.oppositionAudioFile : arg.defenseAudioFile;

  await deleteMinigameAudioFile(gameId, audioFile);

  if (side === 'opposition') {
    arg.oppositionAudioFile = null;
    arg.oppositionAudioBlob = null;
  } else {
    arg.defenseAudioFile = null;
    arg.defenseAudioBlob = null;
  }

  renderMinigameDetails();
  autoSaveTrial();
}

// ==================== Audio Playback ====================

export async function playDebateScrumAudio(gameId, argumentId, side) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find((a) => a.argumentId === argumentId);
  if (!arg) return;

  const audioFile = side === 'opposition' ? arg.oppositionAudioFile : arg.defenseAudioFile;
  if (!audioFile) return;

  await toggleAudioPreview(`${gameId}_${argumentId}_${side}`, {
    buttonId: `scrum-play-btn-${argumentId}-${side}`,
    getBlob: async () => {
      let blob = side === 'opposition' ? arg.oppositionAudioBlob : arg.defenseAudioBlob;
      if (!blob) {
        blob = await loadMinigameAudioFile(gameId, audioFile);
        if (side === 'opposition') arg.oppositionAudioBlob = blob;
        else arg.defenseAudioBlob = blob;
      }
      return blob;
    },
  });
}
