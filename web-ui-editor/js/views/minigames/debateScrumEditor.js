// Debate Scrum minigame editor
// Handles paired opposition/defense arguments with audio and keywords

// Drag state for arguments
import { dropAtGap, moveItem, reindexOrder } from '../../core/listOps.js';
import {
  deleteMinigameAudioFile,
  loadMinigameAudioFile,
  saveMinigameAudioFile,
  validateAudioUpload,
} from '../../core/minigameAudio.js';
import { toggleAudioPreview } from '../../components/audioPreview.js';
import { renderCharacterOptions } from '../../models/characterModel.js';
import { autoSaveTrial } from '../../core/storage.js';
import { generateId, escapeHtml } from '../../utils.js';
import { findMinigame, renderMinigameDetails } from '../minigameView.js';
let draggedArgumentId = null;

// ==================== Main Rendering ====================

export function renderDebateScumEditor(mg) {
  // Initialize typeSpecific
  if (!mg.typeSpecific) {
    mg.typeSpecific = {};
  }
  if (!mg.typeSpecific.arguments) {
    mg.typeSpecific.arguments = [];
  }

  const args = mg.typeSpecific.arguments;

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
    html += renderDebateScumArguments(mg.gameId, args);
  }

  html += `</div>`;

  // Add floating button for arguments (only if under max limit)
  if (args.length < 8) {
    html += `
      <button class="minigame-floating-btn"
              onclick="addDebateScumArgument('${mg.gameId}')"
              title="Add Argument">
        ➕ <span class="minigame-floating-btn-text">Add Argument</span>
      </button>
    `;
  }

  return html;
}

export function renderDebateScumArguments(gameId, args) {
  let html = '';

  // Add drop zone at top
  html += `<div class="argument-drop-zone"
                data-insert-position="0"
                ondragover="handleArgumentGapDragOver(event)"
                ondrop="handleArgumentDropInGap(event, '${gameId}', 0)"
                ondragleave="handleArgumentGapDragLeave(event)"></div>`;

  args
    .sort((a, b) => a.order - b.order)
    .forEach((arg, index) => {
      html += `
      <div class="argument-wrapper"
           draggable="true"
           ondragstart="handleArgumentDragStart(event, '${gameId}', '${arg.argumentId}')"
           ondragend="handleArgumentDragEnd(event)">
        ${renderDebateScumArgumentEditor(gameId, arg, index)}
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

export function renderDebateScumArgumentEditor(gameId, arg, index) {
  return `
    <div class="debate-argument-card" data-argument-id="${arg.argumentId}">
      <div class="argument-header">
        <div class="argument-drag-handle">
          <div class="arrow-btn arrow-up"
               onclick="event.stopPropagation(); moveArgumentUp('${gameId}', '${arg.argumentId}')"
               title="Move up">▲</div>
          <div class="arrow-btn arrow-down"
               onclick="event.stopPropagation(); moveArgumentDown('${gameId}', '${arg.argumentId}')"
               title="Move down">▼</div>
        </div>
        <div class="argument-number">Argument #${index + 1}</div>
        <button class="btn-icon"
                onclick="event.stopPropagation(); deleteDebateScumArgument('${gameId}', '${arg.argumentId}')"
                title="Delete argument">🗑️</button>
      </div>

      <div class="argument-body">
        <div class="argument-side opposition-side">
          <h4>🔴 Opposition Side</h4>

          <div class="form-group">
            <label>Character</label>
            <select class="form-input"
                    onchange="updateDebateScumArgument('${gameId}', '${arg.argumentId}', 'oppositionCharacterId', this.value)">
              ${renderCharacterOptions(arg.oppositionCharacterId)}
            </select>
          </div>

          <div class="form-group">
            <label>Statement</label>
            <textarea class="form-input"
                      rows="3"
                      placeholder="Opposition statement..."
                      onchange="updateDebateScumArgument('${gameId}', '${arg.argumentId}', 'oppositionStatement', this.value)">${escapeHtml(arg.oppositionStatement || '')}</textarea>
          </div>

          <div class="form-group">
            <label>Keywords (one per line)</label>
            <textarea class="form-input keywords-input"
                      rows="2"
                      placeholder="Enter keywords, one per line..."
                      onchange="updateDebateScumArgumentKeywords('${gameId}', '${arg.argumentId}', 'opposition', this.value)">${escapeHtml((arg.oppositionKeywords || []).join('\n'))}</textarea>
            <small style="color: var(--text-tertiary);">Keywords that will be highlighted during this argument</small>
          </div>

          <div class="form-group">
            <label>Voice Line Audio</label>
            ${
              arg.oppositionAudioFile
                ? `
              <div class="audio-preview-mini">
                <span class="audio-icon">🎵</span>
                <span class="audio-filename">${arg.oppositionAudioFile}</span>
                <button class="btn btn-secondary btn-sm"
                        id="scrum-play-btn-${arg.argumentId}-opposition"
                        onclick="playDebateScumAudio('${gameId}', '${arg.argumentId}', 'opposition')">
                  ▶️ Play
                </button>
                <button class="btn btn-secondary btn-sm"
                        onclick="clearDebateScumAudio('${gameId}', '${arg.argumentId}', 'opposition')">
                  🗑️ Remove
                </button>
              </div>
            `
                : `
              <input type="file"
                     accept="audio/*"
                     onchange="handleDebateScumAudioUpload('${gameId}', '${arg.argumentId}', 'opposition', event)">
            `
            }
          </div>
        </div>

        <div class="argument-side defense-side">
          <h4>🔵 Defense Side</h4>

          <div class="form-group">
            <label>Character</label>
            <select class="form-input"
                    onchange="updateDebateScumArgument('${gameId}', '${arg.argumentId}', 'defenseCharacterId', this.value)">
              ${renderCharacterOptions(arg.defenseCharacterId)}
            </select>
          </div>

          <div class="form-group">
            <label>Counter Statement</label>
            <textarea class="form-input"
                      rows="3"
                      placeholder="Defense counter statement..."
                      onchange="updateDebateScumArgument('${gameId}', '${arg.argumentId}', 'defenseStatement', this.value)">${escapeHtml(arg.defenseStatement || '')}</textarea>
          </div>

          <div class="form-group">
            <label>Keywords (one per line)</label>
            <textarea class="form-input keywords-input"
                      rows="2"
                      placeholder="Enter keywords, one per line..."
                      onchange="updateDebateScumArgumentKeywords('${gameId}', '${arg.argumentId}', 'defense', this.value)">${escapeHtml((arg.defenseKeywords || []).join('\n'))}</textarea>
            <small style="color: var(--text-tertiary);">Keywords that will be highlighted during this argument</small>
          </div>

          <div class="form-group">
            <label>Voice Line Audio</label>
            ${
              arg.defenseAudioFile
                ? `
              <div class="audio-preview-mini">
                <span class="audio-icon">🎵</span>
                <span class="audio-filename">${arg.defenseAudioFile}</span>
                <button class="btn btn-secondary btn-sm"
                        id="scrum-play-btn-${arg.argumentId}-defense"
                        onclick="playDebateScumAudio('${gameId}', '${arg.argumentId}', 'defense')">
                  ▶️ Play
                </button>
                <button class="btn btn-secondary btn-sm"
                        onclick="clearDebateScumAudio('${gameId}', '${arg.argumentId}', 'defense')">
                  🗑️ Remove
                </button>
              </div>
            `
                : `
              <input type="file"
                     accept="audio/*"
                     onchange="handleDebateScumAudioUpload('${gameId}', '${arg.argumentId}', 'defense', event)">
            `
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==================== Argument Management ====================

export function addDebateScumArgument(gameId) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  if (!mg.typeSpecific) mg.typeSpecific = {};
  if (!mg.typeSpecific.arguments) mg.typeSpecific.arguments = [];

  if (mg.typeSpecific.arguments.length >= 8) {
    alert('Maximum 8 arguments allowed');
    return;
  }

  const newArg = {
    argumentId: generateId('arg'),
    order: mg.typeSpecific.arguments.length,
    // Opposition side
    oppositionStatement: '',
    oppositionCharacterId: '',
    oppositionAudioFile: null,
    oppositionAudioBlob: null,
    oppositionKeywords: [],
    // Defense side
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

export function deleteDebateScumArgument(gameId, argumentId) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  mg.typeSpecific.arguments = mg.typeSpecific.arguments.filter((a) => a.argumentId !== argumentId);
  reindexOrder(mg.typeSpecific.arguments);

  renderMinigameDetails();
  autoSaveTrial();
}

export function updateDebateScumArgument(gameId, argumentId, field, value) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find((a) => a.argumentId === argumentId);
  if (!arg) return;

  arg[field] = value;
  autoSaveTrial();
}

export function updateDebateScumArgumentKeywords(gameId, argumentId, side, value) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find((a) => a.argumentId === argumentId);
  if (!arg) return;

  // Split by newlines and filter empty
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

export async function handleDebateScumAudioUpload(gameId, argumentId, side, event) {
  const file = validateAudioUpload(event);
  if (!file) return;

  const mg = findMinigame(gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find((a) => a.argumentId === argumentId);
  if (!arg) return;

  try {
    // Filename: scrum_{argumentId}_{side}.{ext}
    const ext = file.name.split('.').pop();
    const audioFileName = `scrum_${argumentId}_${side}.${ext}`;
    await saveMinigameAudioFile(gameId, audioFileName, file);

    // Store file information
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
    alert(`Failed to save audio: ${error.message}`);
  }
}

export async function clearDebateScumAudio(gameId, argumentId, side) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find((a) => a.argumentId === argumentId);
  if (!arg) return;

  const audioFile = side === 'opposition' ? arg.oppositionAudioFile : arg.defenseAudioFile;

  await deleteMinigameAudioFile(gameId, audioFile);

  // Clear metadata
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

export async function playDebateScumAudio(gameId, argumentId, side) {
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
