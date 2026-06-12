// Mass Panic Debate minigame editor
// Handles line groups with 3 simultaneous speakers

// Audio players state
import { state } from '../../core/state.js';
import { autoSaveTrial } from '../../core/storage.js';
import { generateId, escapeHtml, formatAudioTime } from '../../utils.js';
import { renderMinigameDetails } from '../minigameView.js';
const panicAudioPlayers = {};

// ==================== Main Rendering ====================

export function renderMassPanicDebateEditor(mg) {
  // Initialize typeSpecific
  if (!mg.typeSpecific) {
    mg.typeSpecific = {};
  }
  if (!mg.typeSpecific.lineGroups) {
    mg.typeSpecific.lineGroups = [];
  }
  if (!mg.typeSpecific.speaker1CharacterId) mg.typeSpecific.speaker1CharacterId = "";
  if (!mg.typeSpecific.speaker2CharacterId) mg.typeSpecific.speaker2CharacterId = "";
  if (!mg.typeSpecific.speaker3CharacterId) mg.typeSpecific.speaker3CharacterId = "";

  const lineGroups = mg.typeSpecific.lineGroups;

  return `
    <div class="minigame-editor-section mass-panic-section">
      <h3>💥 Mass Panic Debate - Simultaneous Speakers</h3>
      <p class="section-description">
        Configure 3 characters who speak simultaneously. Each line group has all 3 speakers talking at once.
        Only one speaker can have a loud assertion per line group.
      </p>

      <div class="mass-panic-character-setup">
        <div class="form-row">
          <div class="form-group">
            <label>Speaker 1 Character</label>
            <select class="form-input" onchange="updateMassPanicField('${mg.gameId}', 'speaker1CharacterId', this.value)">
              <option value="">None</option>
              ${state.cast.filter(c => c).map(c => {
                const isDisabled = mg.typeSpecific.speaker2CharacterId === c.id ||
                                  mg.typeSpecific.speaker3CharacterId === c.id;
                return `
                  <option value="${c.id}"
                          ${mg.typeSpecific.speaker1CharacterId === c.id ? 'selected' : ''}
                          ${isDisabled ? 'disabled' : ''}>
                    ${escapeHtml(`${c.name} ${c.surname}`)}${isDisabled ? ' (already selected)' : ''}
                  </option>
                `;
              }).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Speaker 2 Character</label>
            <select class="form-input" onchange="updateMassPanicField('${mg.gameId}', 'speaker2CharacterId', this.value)">
              <option value="">None</option>
              ${state.cast.filter(c => c).map(c => {
                const isDisabled = mg.typeSpecific.speaker1CharacterId === c.id ||
                                  mg.typeSpecific.speaker3CharacterId === c.id;
                return `
                  <option value="${c.id}"
                          ${mg.typeSpecific.speaker2CharacterId === c.id ? 'selected' : ''}
                          ${isDisabled ? 'disabled' : ''}>
                    ${escapeHtml(`${c.name} ${c.surname}`)}${isDisabled ? ' (already selected)' : ''}
                  </option>
                `;
              }).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Speaker 3 Character</label>
            <select class="form-input" onchange="updateMassPanicField('${mg.gameId}', 'speaker3CharacterId', this.value)">
              <option value="">None</option>
              ${state.cast.filter(c => c).map(c => {
                const isDisabled = mg.typeSpecific.speaker1CharacterId === c.id ||
                                  mg.typeSpecific.speaker2CharacterId === c.id;
                return `
                  <option value="${c.id}"
                          ${mg.typeSpecific.speaker3CharacterId === c.id ? 'selected' : ''}
                          ${isDisabled ? 'disabled' : ''}>
                    ${escapeHtml(`${c.name} ${c.surname}`)}${isDisabled ? ' (already selected)' : ''}
                  </option>
                `;
              }).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="mass-panic-line-groups">
        ${lineGroups.length === 0 ? `
          <div class="empty-state">
            <p>No line groups yet. Add a line group to create simultaneous dialogue for all 3 speakers.</p>
          </div>
        ` : lineGroups.map((group, index) =>
          renderMassPanicLineGroup(mg.gameId, group, index)
        ).join('')}
      </div>

      <!-- Floating button for line groups -->
      <button class="minigame-floating-btn"
              onclick="addMassPanicLineGroup('${mg.gameId}')"
              title="Add Line Group (All 3 Speakers)">
        ➕ <span class="minigame-floating-btn-text">Add Line Group</span>
      </button>
    </div>
  `;
}

export function renderMassPanicLineGroup(gameId, group, groupIndex) {
  const speakerLabels = ['Speaker 1', 'Speaker 2', 'Speaker 3'];
  const speakerColors = ['rgba(239, 68, 68, 0.3)', 'rgba(59, 130, 246, 0.3)', 'rgba(16, 185, 129, 0.3)'];

  return `
    <div class="mass-panic-group-card">
      <div class="mass-panic-group-header">
        <span class="group-number">Line Group #${groupIndex + 1}</span>
        <button class="btn-icon" onclick="deleteMassPanicLineGroup('${gameId}', '${group.groupId}')" title="Delete line group">🗑️</button>
      </div>

      <div class="mass-panic-group-body">
        ${['speaker1', 'speaker2', 'speaker3'].map((speakerKey, speakerIndex) =>
          renderMassPanicLine(gameId, group, group[speakerKey], speakerKey, speakerIndex, speakerColors[speakerIndex], speakerLabels[speakerIndex])
        ).join('')}
      </div>
    </div>
  `;
}

export function renderMassPanicLine(gameId, group, line, speakerKey, speakerIndex, color, label) {
  // Get character ID for this speaker
  const mg = state.minigames.find(m => m.gameId === gameId);
  const speakerCharIdField = `speaker${speakerIndex + 1}CharacterId`;
  const speakerCharId = mg?.typeSpecific?.[speakerCharIdField];

  // Build enhanced label with character name
  let enhancedLabel = label;
  if (speakerCharId) {
    const character = state.cast.find(c => c && c.id === speakerCharId);
    if (character) {
      enhancedLabel = `${label} [${character.name} ${character.surname}]`;
    }
  }

  return `
    <div class="mass-panic-speaker-line" style="border-left: 4px solid ${color};">
      <div class="speaker-line-header">
        <h5>${escapeHtml(enhancedLabel)}</h5>
        ${line.isLoudAssertion ? '<span class="badge badge-loud">📢 LOUD</span>' : ''}
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
            <option value="">None</option>
            ${state.truthBullets.map(b => `
              <option value="${b.bulletId}" ${line.answerBulletId === b.bulletId ? 'selected' : ''}>
                ${escapeHtml(b.name)}
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Text Effect</label>
          <select class="form-input"
                  onchange="updateMassPanicLineField('${gameId}', '${group.groupId}', '${speakerKey}', 'textEffect', this.value)">
            <option value="normal" ${line.textEffect === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="shake" ${line.textEffect === 'shake' ? 'selected' : ''}>Shake</option>
            <option value="wave" ${line.textEffect === 'wave' ? 'selected' : ''}>Wave</option>
          </select>
        </div>
        <div class="form-group">
          <label>Text Font</label>
          <select class="form-input"
                  onchange="updateMassPanicLineField('${gameId}', '${group.groupId}', '${speakerKey}', 'textFont', this.value)">
            <option value="default" ${line.textFont === 'default' ? 'selected' : ''}>Default</option>
            <option value="handwritten" ${line.textFont === 'handwritten' ? 'selected' : ''}>Handwritten</option>
            <option value="monospace" ${line.textFont === 'monospace' ? 'selected' : ''}>Monospace</option>
          </select>
        </div>
        <div class="form-group">
          <label>Movement Direction</label>
          <select class="form-input"
                  onchange="updateMassPanicLineField('${gameId}', '${group.groupId}', '${speakerKey}', 'textMovementDirection', this.value)">
            <option value="left_to_right" ${line.textMovementDirection === 'left_to_right' ? 'selected' : ''}>Left to Right</option>
            <option value="right_to_left" ${line.textMovementDirection === 'right_to_left' ? 'selected' : ''}>Right to Left</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Voice Line Audio</label>
        ${line.voiceLineFile ? `
          <div class="audio-preview">
            <div class="audio-info">
              <span class="audio-icon">🎵</span>
              <span class="audio-filename">${line.voiceLineFile}</span>
            </div>
            <div class="audio-seek-container">
              <span class="audio-time-current" id="panic-audio-time-current-${group.groupId}-${speakerKey}">0:00</span>
              <input type="range"
                     class="audio-seek-bar"
                     id="panic-audio-seek-bar-${group.groupId}-${speakerKey}"
                     min="0"
                     max="100"
                     value="0"
                     oninput="seekPanicAudio('${gameId}', '${group.groupId}', '${speakerKey}', this.value)">
              <span class="audio-time-total" id="panic-audio-time-total-${group.groupId}-${speakerKey}">0:00</span>
            </div>
            <div class="audio-controls">
              <button class="btn btn-secondary"
                      id="panic-play-btn-${group.groupId}-${speakerKey}"
                      onclick="playPanicAudioPreview('${gameId}', '${group.groupId}', '${speakerKey}')">
                ▶️ Play
              </button>
              <button class="btn btn-secondary"
                      onclick="clearPanicVoiceLine('${gameId}', '${group.groupId}', '${speakerKey}')">
                🗑️ Remove
              </button>
            </div>
          </div>
        ` : `
          <div class="audio-empty">
            <p>No audio file uploaded</p>
          </div>
          <input type="file"
                 accept="audio/*"
                 onchange="handlePanicVoiceUpload('${gameId}', '${group.groupId}', '${speakerKey}', event)">
        `}
      </div>
    </div>
  `;
}

// ==================== Line Group Management ====================

export function validateSpeakerSelection(gameId, speakerField, selectedCharacterId) {
  const mg = state.minigames.find(m => m.gameId === gameId);
  if (!mg || !mg.typeSpecific) return true;

  // Check if this character is already selected in another speaker slot
  const otherSpeakers = ['speaker1CharacterId', 'speaker2CharacterId', 'speaker3CharacterId']
    .filter(field => field !== speakerField);

  const isDuplicate = otherSpeakers.some(field =>
    mg.typeSpecific[field] === selectedCharacterId && selectedCharacterId !== ""
  );

  if (isDuplicate) {
    const character = state.cast.find(c => c && c.id === selectedCharacterId);
    const characterName = character ? `${character.name} ${character.surname}` : 'This character';
    alert(`${characterName} is already selected for another speaker. Please choose a different character.`);
    return false;
  }

  return true;
}

export function updateMassPanicField(gameId, field, value) {
  const mg = state.minigames.find(m => m.gameId === gameId);
  if (!mg || !mg.typeSpecific) return;

  // Validate speaker selection if it's a character field
  if (field.includes('CharacterId')) {
    if (!validateSpeakerSelection(gameId, field, value)) {
      renderMinigameDetails(); // Reset to previous value
      return;
    }
  }

  mg.typeSpecific[field] = value;
  renderMinigameDetails(); // Re-render to update labels
  autoSaveTrial();
}

export function addMassPanicLineGroup(gameId) {
  const mg = state.minigames.find(m => m.gameId === gameId);
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
    speaker3: createEmptyPanicLine()
  };

  mg.typeSpecific.lineGroups.push(newLineGroup);
  renderMinigameDetails();
  autoSaveTrial();
}

export function createEmptyPanicLine() {
  return {
    sentenceBeginning: "",
    target: "",
    sentenceEnd: "",
    isLoudAssertion: false,
    answerBulletId: null,
    textEffect: "normal",
    textMovementDirection: "left_to_right",
    textFont: "default",
    voiceLineFile: null,
    voiceLineBlob: null
  };
}

export async function deleteMassPanicLineGroup(gameId, groupId) {
  if (!confirm('Delete this entire line group (all 3 speakers)?')) return;

  const mg = state.minigames.find(m => m.gameId === gameId);
  if (!mg || !mg.typeSpecific || !mg.typeSpecific.lineGroups) return;

  // Delete audio files first (awaited; the previous forEach(async) version
  // fired the deletions without waiting or reporting failures)
  const group = mg.typeSpecific.lineGroups.find(g => g.groupId === groupId);
  if (group) {
    for (const speakerKey of ['speaker1', 'speaker2', 'speaker3']) {
      const line = group[speakerKey];
      if (line && line.voiceLineFile) {
        try {
          const audioDir = await state.dirHandle.getDirectoryHandle("Audio", { create: false });
          const minigamesDir = await audioDir.getDirectoryHandle("Minigames", { create: false });
          const gameAudioDir = await minigamesDir.getDirectoryHandle(gameId, { create: false });
          await gameAudioDir.removeEntry(line.voiceLineFile);
        } catch (e) {
          console.warn("Could not remove audio file:", e);
        }
      }
    }
  }

  mg.typeSpecific.lineGroups = mg.typeSpecific.lineGroups.filter(g => g.groupId !== groupId);

  // Re-index orders
  mg.typeSpecific.lineGroups.forEach((group, index) => {
    group.order = index;
  });

  renderMinigameDetails();
  autoSaveTrial();
}

export function updateMassPanicLineField(gameId, groupId, speakerKey, field, value) {
  const mg = state.minigames.find(m => m.gameId === gameId);
  if (!mg || !mg.typeSpecific || !mg.typeSpecific.lineGroups) return;

  const group = mg.typeSpecific.lineGroups.find(g => g.groupId === groupId);
  if (!group || !group[speakerKey]) return;

  group[speakerKey][field] = value;
  autoSaveTrial();
}

export function handleLoudAssertionToggle(gameId, groupId, speakerKey, checked) {
  const mg = state.minigames.find(m => m.gameId === gameId);
  if (!mg || !mg.typeSpecific || !mg.typeSpecific.lineGroups) return;

  const group = mg.typeSpecific.lineGroups.find(g => g.groupId === groupId);
  if (!group) return;

  // If checking this speaker as loud, uncheck all others in the group
  if (checked) {
    ['speaker1', 'speaker2', 'speaker3'].forEach(key => {
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
  const mg = state.minigames.find(m => m.gameId === gameId);
  if (!mg || !mg.typeSpecific || !mg.typeSpecific.lineGroups) return;

  const currentGroup = mg.typeSpecific.lineGroups.find(g => g.groupId === groupId);
  if (!currentGroup || !currentGroup[speakerKey]) return;

  // If setting a new answer (not clearing), clear all other answers in the entire minigame
  if (bulletId) {
    mg.typeSpecific.lineGroups.forEach(group => {
      ['speaker1', 'speaker2', 'speaker3'].forEach(key => {
        if (group[key]) {
          // Clear all answers except the one we're setting
          if (group.groupId !== groupId || key !== speakerKey) {
            group[key].answerBulletId = null;
          }
        }
      });
    });
  }

  // Set the answer for the current line
  currentGroup[speakerKey].answerBulletId = bulletId || null;
  renderMinigameDetails();
  autoSaveTrial();
}

// ==================== Audio Handling ====================

export async function handlePanicVoiceUpload(gameId, groupId, speakerKey, event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('audio/')) {
    alert('Please select an audio file');
    event.target.value = '';
    return;
  }

  const mg = state.minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const group = mg.typeSpecific.lineGroups.find(g => g.groupId === groupId);
  if (!group || !group[speakerKey]) return;

  try {
    const audioDir = await state.dirHandle.getDirectoryHandle("Audio", { create: true });
    const minigamesDir = await audioDir.getDirectoryHandle("Minigames", { create: true });
    const gameAudioDir = await minigamesDir.getDirectoryHandle(gameId, { create: true });

    const ext = file.name.split('.').pop();
    const audioFileName = `panic_${groupId}_${speakerKey}.${ext}`;

    const audioFileHandle = await gameAudioDir.getFileHandle(audioFileName, { create: true });
    const writable = await audioFileHandle.createWritable();
    await writable.write(file);
    await writable.close();

    group[speakerKey].voiceLineFile = audioFileName;
    group[speakerKey].voiceLineBlob = file;

    renderMinigameDetails();
    autoSaveTrial();
  } catch (error) {
    console.error("Error saving audio:", error);
    alert(`Failed to save audio: ${error.message}`);
  }
}

export async function clearPanicVoiceLine(gameId, groupId, speakerKey) {
  const mg = state.minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const group = mg.typeSpecific.lineGroups.find(g => g.groupId === groupId);
  if (!group || !group[speakerKey]) return;

  if (group[speakerKey].voiceLineFile) {
    try {
      const audioDir = await state.dirHandle.getDirectoryHandle("Audio", { create: false });
      const minigamesDir = await audioDir.getDirectoryHandle("Minigames", { create: false });
      const gameAudioDir = await minigamesDir.getDirectoryHandle(gameId, { create: false });
      await gameAudioDir.removeEntry(group[speakerKey].voiceLineFile);
    } catch (e) {
      console.warn("Could not remove audio file:", e);
    }
  }

  group[speakerKey].voiceLineFile = null;
  group[speakerKey].voiceLineBlob = null;

  renderMinigameDetails();
  autoSaveTrial();
}

// ==================== Audio Playback ====================

export async function playPanicAudioPreview(gameId, groupId, speakerKey) {
  const playerKey = `${gameId}_${groupId}_${speakerKey}`;
  const player = panicAudioPlayers[playerKey];

  if (player && !player.paused) {
    player.pause();
    player.currentTime = 0;
    updatePanicPlayButton(groupId, speakerKey, false);
    return;
  }

  const mg = state.minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const group = mg.typeSpecific.lineGroups.find(g => g.groupId === groupId);
  if (!group || !group[speakerKey]) return;

  const line = group[speakerKey];
  if (!line.voiceLineFile) return;

  let audioBlob = line.voiceLineBlob;
  if (!audioBlob) {
    try {
      const audioDir = await state.dirHandle.getDirectoryHandle("Audio", { create: false });
      const minigamesDir = await audioDir.getDirectoryHandle("Minigames", { create: false });
      const gameAudioDir = await minigamesDir.getDirectoryHandle(gameId, { create: false});
      const fileHandle = await gameAudioDir.getFileHandle(line.voiceLineFile);
      const file = await fileHandle.getFile();
      audioBlob = file;
      line.voiceLineBlob = file;
    } catch (error) {
      console.error("Error loading audio:", error);
      alert("Failed to load audio file");
      return;
    }
  }

  try {
    const blobUrl = URL.createObjectURL(audioBlob);

    if (!panicAudioPlayers[playerKey]) {
      const audio = new Audio();
      panicAudioPlayers[playerKey] = audio;

      audio.onended = () => {
        updatePanicPlayButton(groupId, speakerKey, false);
        URL.revokeObjectURL(audio.src);
      };

      audio.onerror = () => {
        alert("Audio playback error");
        updatePanicPlayButton(groupId, speakerKey, false);
      };

      audio.ontimeupdate = () => {
        updatePanicSeekBar(groupId, speakerKey, audio);
      };

      audio.onloadedmetadata = () => {
        updatePanicSeekBar(groupId, speakerKey, audio);
      };
    }

    const audio = panicAudioPlayers[playerKey];
    audio.src = blobUrl;
    await audio.play();
    updatePanicPlayButton(groupId, speakerKey, true);
  } catch (error) {
    console.error("Error playing audio:", error);
    alert(`Failed to play audio: ${error.message}`);
  }
}

export function updatePanicPlayButton(groupId, speakerKey, isPlaying) {
  const btn = document.getElementById(`panic-play-btn-${groupId}-${speakerKey}`);
  if (btn) {
    btn.innerHTML = isPlaying ? '⏸️ Pause' : '▶️ Play';
  }
}

export function seekPanicAudio(gameId, groupId, speakerKey, value) {
  const playerKey = `${gameId}_${groupId}_${speakerKey}`;
  const audio = panicAudioPlayers[playerKey];
  if (audio && audio.duration) {
    audio.currentTime = (value / 100) * audio.duration;
  }
}

export function updatePanicSeekBar(groupId, speakerKey, audio) {
  const seekBar = document.getElementById(`panic-audio-seek-bar-${groupId}-${speakerKey}`);
  const currentTimeEl = document.getElementById(`panic-audio-time-current-${groupId}-${speakerKey}`);
  const totalTimeEl = document.getElementById(`panic-audio-time-total-${groupId}-${speakerKey}`);

  if (seekBar && currentTimeEl && totalTimeEl) {
    const current = audio.currentTime;
    const duration = audio.duration || 0;
    const percent = duration > 0 ? (current / duration) * 100 : 0;

    seekBar.value = percent;
    currentTimeEl.textContent = formatAudioTime(current);
    totalTimeEl.textContent = formatAudioTime(duration);
  }
}

// formatAudioTime lives in js/utils.js
