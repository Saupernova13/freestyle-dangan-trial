// Mass Panic Debate editor: line groups of 3 simultaneous speakers.

// Audio players state
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
import { generateId, escapeHtml } from '../../utils.js';
import { findMinigame, renderMinigameDetails } from '../minigameView.js';
import { renderVoiceLineField, voiceLineElementIds } from './voiceLineField.js';
import { renderOptions } from '../../ui/options.js';

// --- Main Rendering ---

export function renderMassPanicDebateEditor(mg) {
  // Read-only: seeding lives in ensureTypeSpecific, called at load and on a
  // gameType change. Doing it here mutated trial data as a side effect of
  // expanding a card, and the next autosave persisted a change undo never saw.
  const lineGroups = (mg.typeSpecific && mg.typeSpecific.lineGroups) || [];

  return `
    <div class="minigame-editor-section mass-panic-section">
      <h3>${window.icon('burst', { size: 20 })} Mass Panic Debate - Simultaneous Speakers</h3>
      <p class="section-description">
        Configure 3 characters who speak simultaneously. Each line group has all 3 speakers talking at once.
        Only one speaker can have a loud assertion per line group.
      </p>

      <div class="mass-panic-character-setup">
        <div class="form-row">
          ${[1, 2, 3]
            .map((n) => {
              const field = `speaker${n}CharacterId`;
              const otherIds = [1, 2, 3]
                .filter((m) => m !== n)
                .map((m) => mg.typeSpecific[`speaker${m}CharacterId`])
                .filter(Boolean);
              return `
          <div class="form-group">
            <label>Speaker ${n} Character</label>
            <select class="form-input" onchange="updateMassPanicField('${mg.gameId}', '${field}', this.value)">
              ${renderCharacterOptions(mg.typeSpecific[field], otherIds)}
            </select>
          </div>`;
            })
            .join('')}
        </div>
      </div>

      <div class="mass-panic-line-groups">
        ${
          lineGroups.length === 0
            ? `
          <div class="empty-state">
            <p>No line groups yet. Add a line group to create simultaneous dialogue for all 3 speakers.</p>
          </div>
        `
            : lineGroups
                .map((group, index) => renderMassPanicLineGroup(mg.gameId, group, index))
                .join('')
        }
      </div>

      <!-- Floating button for line groups -->
      <button class="minigame-floating-btn"
              onclick="addMassPanicLineGroup('${mg.gameId}')"
              title="Add Line Group (All 3 Speakers)">
        ${window.icon('plus', { size: 20 })} <span class="minigame-floating-btn-text">Add Line Group</span>
      </button>
    </div>
  `;
}

export function renderMassPanicLineGroup(gameId, group, groupIndex) {
  const speakerLabels = ['Speaker 1', 'Speaker 2', 'Speaker 3'];
  const speakerColors = [
    'rgba(239, 68, 68, 0.3)',
    'rgba(59, 130, 246, 0.3)',
    'rgba(16, 185, 129, 0.3)',
  ];

  return `
    <div class="mass-panic-group-card">
      <div class="mass-panic-group-header">
        <span class="group-number">Line Group #${groupIndex + 1}</span>
        <button class="btn-icon" onclick="deleteMassPanicLineGroup('${gameId}', '${group.groupId}')" title="Delete line group">${window.icon('trash', { size: 16 })}</button>
      </div>

      <div class="mass-panic-group-body">
        ${['speaker1', 'speaker2', 'speaker3']
          .map((speakerKey, speakerIndex) =>
            renderMassPanicLine(
              gameId,
              group,
              group[speakerKey],
              speakerKey,
              speakerIndex,
              speakerColors[speakerIndex],
              speakerLabels[speakerIndex]
            )
          )
          .join('')}
      </div>
    </div>
  `;
}

export function renderMassPanicLine(gameId, group, line, speakerKey, speakerIndex, color, label) {
  const mg = findMinigame(gameId);
  const speakerCharIdField = `speaker${speakerIndex + 1}CharacterId`;
  const speakerCharId = mg?.typeSpecific?.[speakerCharIdField];

  // Append the character's name to the slot label once one is assigned.
  let enhancedLabel = label;
  if (speakerCharId) {
    const character = state.cast.find((c) => c && c.id === speakerCharId);
    if (character) {
      enhancedLabel = `${label} [${character.name} ${character.surname}]`;
    }
  }

  return `
    <div class="mass-panic-speaker-line" style="border-left: 4px solid ${color};">
      <div class="speaker-line-header">
        <h5>${escapeHtml(enhancedLabel)}</h5>
        ${line.isLoudAssertion ? `<span class="badge badge-loud">${window.icon('megaphone', { size: 13 })} LOUD</span>` : ''}
      </div>

      <div class="sentence-structure">
        <input type="text"
               class="form-input sentence-part"
               value="${escapeHtml(line.sentenceBeginning || '')}"
               placeholder="Beginning..."
               onchange="updateMassPanicLineField('${gameId}', '${group.groupId}', '${speakerKey}', 'sentenceBeginning', this.value)">
        <input type="text"
               class="form-input sentence-part target-part"
               value="${escapeHtml(line.target || '')}"
               placeholder="Target (shootable)"
               onchange="updateMassPanicLineField('${gameId}', '${group.groupId}', '${speakerKey}', 'target', this.value)">
        <input type="text"
               class="form-input sentence-part"
               value="${escapeHtml(line.sentenceEnd || '')}"
               placeholder="...end"
               onchange="updateMassPanicLineField('${gameId}', '${group.groupId}', '${speakerKey}', 'sentenceEnd', this.value)">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox"
                   ${line.isLoudAssertion ? 'checked' : ''}
                   onchange="handleLoudAssertionToggle('${gameId}', '${group.groupId}', '${speakerKey}', this.checked)">
            <span>Loud Assertion (Only 1 per group)</span>
          </label>
        </div>
        <div class="form-group">
          <label>Correct Answer Bullet (Only 1 per minigame)</label>
          <select class="form-input"
                  onchange="handleMassPanicAnswerSelection('${gameId}', '${group.groupId}', '${speakerKey}', this.value)">
            ${renderOptions(
              [
                { value: '', label: 'None' },
                ...state.truthBullets.map((b) => ({ value: b.bulletId, label: b.name })),
              ],
              line.answerBulletId
            )}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Text Effect</label>
          <select class="form-input"
                  onchange="updateMassPanicLineField('${gameId}', '${group.groupId}', '${speakerKey}', 'textEffect', this.value)">
            ${renderTextStyleOptions(TEXT_EFFECTS, line.textEffect)}
          </select>
        </div>
        <div class="form-group">
          <label>Text Font</label>
          <select class="form-input"
                  onchange="updateMassPanicLineField('${gameId}', '${group.groupId}', '${speakerKey}', 'textFont', this.value)">
            ${renderTextStyleOptions(TEXT_FONTS, line.textFont)}
          </select>
        </div>
        <div class="form-group">
          <label>Movement Direction</label>
          <select class="form-input"
                  onchange="updateMassPanicLineField('${gameId}', '${group.groupId}', '${speakerKey}', 'textMovementDirection', this.value)">
            ${renderTextStyleOptions(TEXT_DIRECTIONS, line.textMovementDirection)}
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Voice Line Audio</label>
        ${renderVoiceLineField({
          fileName: line.voiceLineFile,
          idBase: `${group.groupId}-${speakerKey}`,
          onPlay: `playPanicAudioPreview('${gameId}', '${group.groupId}', '${speakerKey}')`,
          onSeek: `seekPanicAudio('${gameId}', '${group.groupId}', '${speakerKey}', this.value)`,
          onClear: `clearPanicVoiceLine('${gameId}', '${group.groupId}', '${speakerKey}')`,
          onUpload: `handlePanicVoiceUpload('${gameId}', '${group.groupId}', '${speakerKey}', event)`,
        })}
      </div>
    </div>
  `;
}

// --- Line Group Management ---

export function validateSpeakerSelection(gameId, speakerField, selectedCharacterId) {
  const mg = findMinigame(gameId);
  if (!mg || !mg.typeSpecific) return true;

  // The same character cannot fill two speaker slots.
  const otherSpeakers = [
    'speaker1CharacterId',
    'speaker2CharacterId',
    'speaker3CharacterId',
  ].filter((field) => field !== speakerField);

  const isDuplicate = otherSpeakers.some(
    (field) => mg.typeSpecific[field] === selectedCharacterId && selectedCharacterId !== ''
  );

  if (isDuplicate) {
    const character = state.cast.find((c) => c && c.id === selectedCharacterId);
    const characterName = character ? `${character.name} ${character.surname}` : 'This character';
    showToast(
      `${characterName} is already selected for another speaker. Choose a different character.`,
      { type: 'warning' }
    );
    return false;
  }

  return true;
}

export function updateMassPanicField(gameId, field, value) {
  const mg = findMinigame(gameId);
  if (!mg || !mg.typeSpecific) return;

  if (field.includes('CharacterId')) {
    if (!validateSpeakerSelection(gameId, field, value)) {
      renderMinigameDetails(); // snaps the select back to the old value
      return;
    }
  }

  mg.typeSpecific[field] = value;
  renderMinigameDetails();
  autoSaveTrial();
}

export function addMassPanicLineGroup(gameId) {
  const mg = findMinigame(gameId);
  if (!mg || !mg.typeSpecific) return;

  if (!mg.typeSpecific.lineGroups) {
    mg.typeSpecific.lineGroups = [];
  }

  const groupId = generateId('panic_group');

  const newLineGroup = {
    groupId: groupId,
    order: mg.typeSpecific.lineGroups.length,
    speaker1: createEmptyPanicLine(),
    speaker2: createEmptyPanicLine(),
    speaker3: createEmptyPanicLine(),
  };

  mg.typeSpecific.lineGroups.push(newLineGroup);
  renderMinigameDetails();
  autoSaveTrial();
}

export function createEmptyPanicLine() {
  return {
    sentenceBeginning: '',
    target: '',
    sentenceEnd: '',
    isLoudAssertion: false,
    answerBulletId: null,
    textEffect: 'normal',
    textMovementDirection: 'left_to_right',
    textFont: 'default',
    voiceLineFile: null,
    voiceLineBlob: null,
  };
}

export async function deleteMassPanicLineGroup(gameId, groupId) {
  const confirmed = await confirmDialog({
    title: 'Delete line group',
    message: 'Delete this entire line group (all 3 speakers)?',
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return;

  const mg = findMinigame(gameId);
  if (!mg || !mg.typeSpecific || !mg.typeSpecific.lineGroups) return;

  // Awaited, so a failed delete surfaces instead of being fired and forgotten.
  const group = mg.typeSpecific.lineGroups.find((g) => g.groupId === groupId);
  if (group) {
    for (const speakerKey of ['speaker1', 'speaker2', 'speaker3']) {
      const line = group[speakerKey];
      if (line) await deleteMinigameAudioFile(gameId, line.voiceLineFile);
    }
  }

  mg.typeSpecific.lineGroups = mg.typeSpecific.lineGroups.filter((g) => g.groupId !== groupId);

  mg.typeSpecific.lineGroups.forEach((group, index) => {
    group.order = index;
  });

  renderMinigameDetails();
  autoSaveTrial();
}

export function updateMassPanicLineField(gameId, groupId, speakerKey, field, value) {
  const mg = findMinigame(gameId);
  if (!mg || !mg.typeSpecific || !mg.typeSpecific.lineGroups) return;

  const group = mg.typeSpecific.lineGroups.find((g) => g.groupId === groupId);
  if (!group || !group[speakerKey]) return;

  group[speakerKey][field] = value;
  autoSaveTrial();
}

export function handleLoudAssertionToggle(gameId, groupId, speakerKey, checked) {
  const mg = findMinigame(gameId);
  if (!mg || !mg.typeSpecific || !mg.typeSpecific.lineGroups) return;

  const group = mg.typeSpecific.lineGroups.find((g) => g.groupId === groupId);
  if (!group) return;

  // At most one loud assertion per group.
  if (checked) {
    ['speaker1', 'speaker2', 'speaker3'].forEach((key) => {
      if (key !== speakerKey && group[key]) {
        group[key].isLoudAssertion = false;
      }
    });
  }

  group[speakerKey].isLoudAssertion = checked;
  renderMinigameDetails();
  autoSaveTrial();
}

export function handleMassPanicAnswerSelection(gameId, groupId, speakerKey, bulletId) {
  const mg = findMinigame(gameId);
  if (!mg || !mg.typeSpecific || !mg.typeSpecific.lineGroups) return;

  const currentGroup = mg.typeSpecific.lineGroups.find((g) => g.groupId === groupId);
  if (!currentGroup || !currentGroup[speakerKey]) return;

  // The whole minigame has one answer line, so setting one clears the rest.
  if (bulletId) {
    mg.typeSpecific.lineGroups.forEach((group) => {
      ['speaker1', 'speaker2', 'speaker3'].forEach((key) => {
        if (group[key]) {
          if (group.groupId !== groupId || key !== speakerKey) {
            group[key].answerBulletId = null;
          }
        }
      });
    });
  }

  currentGroup[speakerKey].answerBulletId = bulletId || null;
  renderMinigameDetails();
  autoSaveTrial();
}

// --- Audio Handling ---

export async function handlePanicVoiceUpload(gameId, groupId, speakerKey, event) {
  const file = validateAudioUpload(event);
  if (!file) return;

  const mg = findMinigame(gameId);
  if (!mg) return;

  const group = mg.typeSpecific.lineGroups.find((g) => g.groupId === groupId);
  if (!group || !group[speakerKey]) return;

  try {
    const ext = file.name.split('.').pop();
    const audioFileName = `panic_${groupId}_${speakerKey}.${ext}`;
    await saveMinigameAudioFile(gameId, audioFileName, file);

    group[speakerKey].voiceLineFile = audioFileName;
    group[speakerKey].voiceLineBlob = file;

    renderMinigameDetails();
    autoSaveTrial();
  } catch (error) {
    console.error('Error saving audio:', error);
    showToast(`Failed to save audio: ${error.message}`, { type: 'error' });
  }
}

export async function clearPanicVoiceLine(gameId, groupId, speakerKey) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const group = mg.typeSpecific.lineGroups.find((g) => g.groupId === groupId);
  if (!group || !group[speakerKey]) return;

  await deleteMinigameAudioFile(gameId, group[speakerKey].voiceLineFile);

  group[speakerKey].voiceLineFile = null;
  group[speakerKey].voiceLineBlob = null;

  renderMinigameDetails();
  autoSaveTrial();
}

// --- Audio Playback ---

export async function playPanicAudioPreview(gameId, groupId, speakerKey) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const group = mg.typeSpecific.lineGroups.find((g) => g.groupId === groupId);
  if (!group || !group[speakerKey]) return;

  const line = group[speakerKey];
  if (!line.voiceLineFile) return;

  await toggleAudioPreview(`${gameId}_${groupId}_${speakerKey}`, {
    ...voiceLineElementIds(`${groupId}-${speakerKey}`),
    getBlob: async () => {
      if (!line.voiceLineBlob) {
        line.voiceLineBlob = await loadMinigameAudioFile(gameId, line.voiceLineFile);
      }
      return line.voiceLineBlob;
    },
  });
}

export function seekPanicAudio(gameId, groupId, speakerKey, value) {
  seekAudioPreview(`${gameId}_${groupId}_${speakerKey}`, value);
}
