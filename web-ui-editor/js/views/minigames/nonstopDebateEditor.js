// Nonstop Debate minigame editor
// Handles Truth Bullet selection and dialogue line configuration

// Audio players state
const dialogueAudioPlayers = {};

// Drag state for dialogue lines
let draggedDialogueLineId = null;

// Collapsible sections state
// Track which dialogue lines have expanded sections
const expandedSections = {
  // lineId: { textStyling: false, characterDisplay: false, feedback: false }
};

function toggleSection(lineId, sectionName) {
  if (!expandedSections[lineId]) {
    expandedSections[lineId] = {};
  }
  expandedSections[lineId][sectionName] = !expandedSections[lineId][sectionName];
  renderMinigameDetails();
}

function isSectionExpanded(lineId, sectionName) {
  return expandedSections[lineId]?.[sectionName] || false;
}

// ==================== Main Rendering ====================

function renderNonstopDebateEditor(mg) {
  // Ensure typeSpecific exists
  if (!mg.typeSpecific) {
    mg.typeSpecific = { selectedBullets: [], dialogueLines: [] };
  }

  const selectedBullets = mg.typeSpecific.selectedBullets || [];
  const dialogueLines = mg.typeSpecific.dialogueLines || [];

  let html = `
    <div class="minigame-editor-section">
      <h3>Truth Bullets Selection</h3>
      <p class="help-text">Select up to 6 truth bullets for this debate (${selectedBullets.length}/6)</p>
  `;

  if (truthBullets.length === 0) {
    html += `
      <div class="empty-state-small">
        <p>No truth bullets available. Create some in the Truth Bullets section first.</p>
      </div>
    `;
  } else {
    html += `<div class="bullet-selection-grid">`;
    truthBullets.forEach(bullet => {
      const isSelected = selectedBullets.includes(bullet.bulletId);
      html += `
        <div class="bullet-select-card ${isSelected ? 'selected' : ''}"
             onclick="toggleBulletForMinigame('${mg.gameId}', '${bullet.bulletId}')">
          <div class="bullet-select-checkbox">${isSelected ? '✓' : ''}</div>
          <div class="bullet-select-image">
            ${bullet.imageDataURL ? `<img src="${bullet.imageDataURL}" alt="${escapeHtml(bullet.name)}">` : '📷'}
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

  // Dialogue lines section
  html += `
    <div class="minigame-editor-section">
      <h3>Debate Dialogue Lines (${dialogueLines.length}/30)</h3>
  `;

  if (dialogueLines.length === 0) {
    html += `
      <div class="empty-state-small">
        <p>No dialogue lines yet. Click "Add Dialogue Line" to create your first line.</p>
      </div>
    `;
  } else {
    // Add drop zone before first line
    html += `<div class="dialogue-drop-zone"
                  data-insert-position="0"
                  ondragover="handleDialogueGapDragOver(event)"
                  ondrop="handleDialogueDropInGap(event, '${mg.gameId}', 0)"
                  ondragleave="handleDialogueGapDragLeave(event)"></div>`;

    dialogueLines.sort((a, b) => a.order - b.order).forEach((line, index) => {
      html += `
        <div class="dialogue-line-wrapper"
             draggable="true"
             ondragstart="handleDialogueDragStart(event, '${mg.gameId}', '${line.lineId}')"
             ondragend="handleDialogueDragEnd(event)">
          ${renderDialogueLineEditor(mg.gameId, line, index)}
        </div>
        <div class="dialogue-drop-zone"
             data-insert-position="${index + 1}"
             ondragover="handleDialogueGapDragOver(event)"
             ondrop="handleDialogueDropInGap(event, '${mg.gameId}', ${index + 1})"
             ondragleave="handleDialogueGapDragLeave(event)"></div>
      `;
    });
  }

  html += `</div>`;

  // Add floating button for dialogue lines (only if under max limit)
  if (dialogueLines.length < 30) {
    html += `
      <button class="minigame-floating-btn"
              onclick="addDialogueLine('${mg.gameId}')"
              title="Add Dialogue Line">
        ➕ <span class="minigame-floating-btn-text">Add Dialogue Line</span>
      </button>
    `;
  }

  return html;
}

function renderDialogueLineEditor(gameId, line, index) {
  const fullSentence = `${line.sentenceBeginning || ''}${line.target || ''}${line.sentenceEnd || ''}`;
  const character = cast.find(c => c && c.id === line.characterId);
  const characterName = character ? `${character.name} ${character.surname}` : 'No character';

  return `
    <div class="dialogue-line-card ${line.isShootable ? 'shootable-target' : ''}" data-line-id="${line.lineId}">
      <div class="dialogue-line-header">
        <div class="dialogue-drag-handle">
          <div class="arrow-btn arrow-up"
               onclick="event.stopPropagation(); moveDialogueLineUp('${gameId}', '${line.lineId}')"
               title="Move up">▲</div>
          <div class="arrow-btn arrow-down"
               onclick="event.stopPropagation(); moveDialogueLineDown('${gameId}', '${line.lineId}')"
               title="Move down">▼</div>
        </div>
        <div class="dialogue-line-number">#${index + 1}</div>
        <div class="dialogue-line-preview">${fullSentence ? escapeHtml(fullSentence) : '&lt;empty line&gt;'}</div>
        <button class="btn-icon" onclick="event.stopPropagation(); deleteDialogueLine('${gameId}', '${line.lineId}')" title="Delete line">🗑️</button>
      </div>

      <div class="dialogue-line-body">
        <!-- 1. CHARACTER (moved to top) -->
        <div class="form-group">
          <label>Character</label>
          <select class="form-input" onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'characterId', this.value)">
            <option value="">None</option>
            ${cast.filter(c => c).map(c => `
              <option value="${c.id}" ${line.characterId === c.id ? 'selected' : ''}>${escapeHtml(`${c.name} ${c.surname}`)}</option>
            `).join('')}
          </select>
        </div>

        <!-- 2. SENTENCE STRUCTURE -->
        <div class="form-group">
          <label>Sentence Structure</label>
          <div class="sentence-structure">
            <input type="text"
                   class="form-input sentence-part"
                   value="${escapeHtml(line.sentenceBeginning || '')}"
                   onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'sentenceBeginning', this.value)"
                   placeholder="Beginning...">
            <input type="text"
                   class="form-input sentence-part target-part"
                   value="${escapeHtml(line.target || '')}"
                   onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'target', this.value)"
                   placeholder="Target (shootable)">
            <input type="text"
                   class="form-input sentence-part"
                   value="${escapeHtml(line.sentenceEnd || '')}"
                   onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'sentenceEnd', this.value)"
                   placeholder="...end">
          </div>
        </div>

        <!-- 3. CORRECT ANSWER BULLET -->
        <div class="form-row">
          <div class="form-group">
            <label>Correct Answer Bullet</label>
            <select class="form-input"
                    onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'answerBulletId', this.value)">
              <option value="">No answer (false target)</option>
              ${truthBullets.map(bullet => `
                <option value="${bullet.bulletId}" ${line.answerBulletId === bullet.bulletId ? 'selected' : ''}>
                  ${escapeHtml(bullet.name || 'Unnamed Bullet')}
                </option>
              `).join('')}
            </select>
          </div>

          ${line.answerBulletId ? `
            <div class="form-group">
              <label>
                <input type="checkbox"
                       ${line.useNegativeBullet ? 'checked' : ''}
                       onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'useNegativeBullet', this.checked)">
                Use Lie/Negative Version
              </label>
            </div>
          ` : ''}
        </div>

        <!-- 4. VOICE LINE AUDIO (moved up) -->
        <div class="form-group">
          <label>Voice Line Audio</label>
          ${line.voiceLineFile ? `
            <div class="audio-preview">
              <div class="audio-info">
                <span class="audio-icon">🎵</span>
                <span class="audio-filename">${line.voiceLineFile}</span>
              </div>

              <div class="audio-seek-container">
                <span class="audio-time-current" id="dialogue-audio-time-current-${line.lineId}">0:00</span>
                <input type="range"
                       class="audio-seek-bar"
                       id="dialogue-audio-seek-bar-${line.lineId}"
                       min="0"
                       max="100"
                       value="0"
                       oninput="seekDialogueAudio('${gameId}', '${line.lineId}', this.value)">
                <span class="audio-time-total" id="dialogue-audio-time-total-${line.lineId}">0:00</span>
              </div>

              <div class="audio-controls">
                <button class="btn btn-secondary"
                        id="dialogue-play-btn-${line.lineId}"
                        onclick="playDialogueAudioPreview('${gameId}', '${line.lineId}')">
                  ▶️ Play
                </button>
                <button class="btn btn-secondary"
                        onclick="clearDialogueVoiceLine('${gameId}', '${line.lineId}')">
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
                   onchange="handleDialogueVoiceUpload('${gameId}', '${line.lineId}', event)">
          `}
        </div>

        <!-- 5. COLLAPSIBLE: Advanced Text Styling -->
        <div class="collapsible-section">
          <button type="button"
                  class="collapsible-header ${isSectionExpanded(line.lineId, 'textStyling') ? 'expanded' : ''}"
                  onclick="toggleSection('${line.lineId}', 'textStyling')">
            <span class="collapsible-icon">${isSectionExpanded(line.lineId, 'textStyling') ? '▼' : '▶'}</span>
            <span class="collapsible-title">Advanced Text Styling</span>
            <span class="collapsible-badge">Optional</span>
          </button>
          ${isSectionExpanded(line.lineId, 'textStyling') ? `
            <div class="collapsible-content">
              <div class="form-row">
                <div class="form-group">
                  <label>Text Effect</label>
                  <select class="form-input" onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'textEffect', this.value)">
                    <option value="normal" ${line.textEffect === 'normal' ? 'selected' : ''}>Normal</option>
                    <option value="shake" ${line.textEffect === 'shake' ? 'selected' : ''}>Shake</option>
                    <option value="fade" ${line.textEffect === 'fade' ? 'selected' : ''}>Fade</option>
                    <option value="glow" ${line.textEffect === 'glow' ? 'selected' : ''}>Glow</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Text Font</label>
                  <select class="form-input" onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'textFont', this.value)">
                    <option value="default" ${line.textFont === 'default' ? 'selected' : ''}>Default</option>
                    <option value="bold" ${line.textFont === 'bold' ? 'selected' : ''}>Bold</option>
                    <option value="italic" ${line.textFont === 'italic' ? 'selected' : ''}>Italic</option>
                    <option value="handwritten" ${line.textFont === 'handwritten' ? 'selected' : ''}>Handwritten</option>
                    <option value="glitch" ${line.textFont === 'glitch' ? 'selected' : ''}>Glitch</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Movement Direction</label>
                  <select class="form-input" onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'textMovementDirection', this.value)">
                    <option value="left_to_right" ${line.textMovementDirection === 'left_to_right' ? 'selected' : ''}>Left to Right</option>
                    <option value="right_to_left" ${line.textMovementDirection === 'right_to_left' ? 'selected' : ''}>Right to Left</option>
                  </select>
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- 6. COLLAPSIBLE: Character Display -->
        <div class="collapsible-section">
          <button type="button"
                  class="collapsible-header ${isSectionExpanded(line.lineId, 'characterDisplay') ? 'expanded' : ''}"
                  onclick="toggleSection('${line.lineId}', 'characterDisplay')">
            <span class="collapsible-icon">${isSectionExpanded(line.lineId, 'characterDisplay') ? '▼' : '▶'}</span>
            <span class="collapsible-title">Character Display</span>
            <span class="collapsible-badge">Optional</span>
          </button>
          ${isSectionExpanded(line.lineId, 'characterDisplay') ? `
            <div class="collapsible-content">
              <div class="form-group">
                <label>
                  <input type="checkbox"
                         ${line.characterSpotlight ? 'checked' : ''}
                         onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'characterSpotlight', this.checked)">
                  Enable Character Spotlight
                </label>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- 7. COLLAPSIBLE: User Feedback Messages -->
        <div class="collapsible-section">
          <button type="button"
                  class="collapsible-header ${isSectionExpanded(line.lineId, 'feedback') ? 'expanded' : ''}"
                  onclick="toggleSection('${line.lineId}', 'feedback')">
            <span class="collapsible-icon">${isSectionExpanded(line.lineId, 'feedback') ? '▼' : '▶'}</span>
            <span class="collapsible-title">User Feedback Messages</span>
            <span class="collapsible-badge">Optional</span>
          </button>
          ${isSectionExpanded(line.lineId, 'feedback') ? `
            <div class="collapsible-content">
              <div class="form-row">
                <div class="form-group">
                  <label>User Failed Comment</label>
                  <input type="text"
                         class="form-input"
                         value="${escapeHtml(line.userFailedComment || '')}"
                         onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'userFailedComment', this.value)"
                         placeholder="Message when user fails">
                </div>

                <div class="form-group">
                  <label>Wrong Answer Comment</label>
                  <input type="text"
                         class="form-input"
                         value="${escapeHtml(line.userWrongAnswerComment || '')}"
                         onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'userWrongAnswerComment', this.value)"
                         placeholder="Message when user shoots wrong target">
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// ==================== Truth Bullet Selection ====================

function toggleBulletForMinigame(gameId, bulletId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg || !mg.typeSpecific) return;

  const selectedBullets = mg.typeSpecific.selectedBullets;
  const index = selectedBullets.indexOf(bulletId);

  if (index !== -1) {
    // Deselect
    selectedBullets.splice(index, 1);
  } else {
    // Select (max 6)
    if (selectedBullets.length >= 6) {
      alert("Maximum 6 truth bullets can be selected.");
      return;
    }
    selectedBullets.push(bulletId);
  }

  renderMinigameDetails();
  autoSaveTrial();
}

// ==================== Dialogue Line Management ====================

function addDialogueLine(gameId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg || !mg.typeSpecific) return;

  if (!mg.typeSpecific.dialogueLines) {
    mg.typeSpecific.dialogueLines = [];
  }

  const newLine = {
    lineId: `dl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    order: mg.typeSpecific.dialogueLines.length,
    sentenceBeginning: "",
    target: "",
    sentenceEnd: "",
    isShootable: false,
    answerBulletId: null,
    useNegativeBullet: false,
    textEffect: "normal",
    textMovementDirection: "left_to_right",
    userFailedComment: "",
    userWrongAnswerComment: "",
    textFont: "default",
    characterSpotlight: false,
    characterId: "",
    voiceLineFile: null
  };

  mg.typeSpecific.dialogueLines.push(newLine);
  renderMinigameDetails();
  autoSaveTrial();
}

function updateDialogueLine(gameId, lineId, field, value) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg || !mg.typeSpecific || !mg.typeSpecific.dialogueLines) return;

  const line = mg.typeSpecific.dialogueLines.find(l => l.lineId === lineId);
  if (line) {
    line[field] = value;

    // Auto-update isShootable based on answerBulletId
    if (field === 'answerBulletId') {
      line.isShootable = (value !== '' && value !== null);
    }

    renderMinigameDetails();
    autoSaveTrial();
  }
}

function deleteDialogueLine(gameId, lineId) {
  if (!confirm('Delete this dialogue line?')) return;

  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg || !mg.typeSpecific || !mg.typeSpecific.dialogueLines) return;

  mg.typeSpecific.dialogueLines = mg.typeSpecific.dialogueLines.filter(l => l.lineId !== lineId);

  // Re-index orders
  mg.typeSpecific.dialogueLines.forEach((line, index) => {
    line.order = index;
  });

  renderMinigameDetails();
  autoSaveTrial();
}

// ==================== Dialogue Line Reordering ====================

function moveDialogueLineUp(gameId, lineId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const lines = mg.typeSpecific.dialogueLines;
  const currentIndex = lines.findIndex(l => l.lineId === lineId);

  if (currentIndex <= 0) return; // Already at top

  // Swap with previous line
  [lines[currentIndex], lines[currentIndex - 1]] = [lines[currentIndex - 1], lines[currentIndex]];

  // Update order fields
  lines.forEach((line, index) => {
    line.order = index;
  });

  renderMinigameDetails();
  autoSaveTrial();
}

function moveDialogueLineDown(gameId, lineId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const lines = mg.typeSpecific.dialogueLines;
  const currentIndex = lines.findIndex(l => l.lineId === lineId);

  if (currentIndex === -1 || currentIndex >= lines.length - 1) return;

  // Swap with next line
  [lines[currentIndex], lines[currentIndex + 1]] = [lines[currentIndex + 1], lines[currentIndex]];

  // Update order fields
  lines.forEach((line, index) => {
    line.order = index;
  });

  renderMinigameDetails();
  autoSaveTrial();
}

// ==================== Drag-and-Drop for Dialogue Lines ====================

function handleDialogueDragStart(event, gameId, lineId) {
  draggedDialogueLineId = lineId;
  event.target.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
}

function handleDialogueDragEnd(event) {
  event.target.classList.remove('dragging');
  draggedDialogueLineId = null;
  // Remove all drag-over classes
  document.querySelectorAll('.drag-over-gap').forEach(el => {
    el.classList.remove('drag-over-gap');
  });
}

function handleDialogueDropInGap(event, gameId, insertPosition) {
  event.preventDefault();
  event.stopPropagation();

  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg || !draggedDialogueLineId) return;

  const lines = mg.typeSpecific.dialogueLines;
  const draggedIndex = lines.findIndex(l => l.lineId === draggedDialogueLineId);

  if (draggedIndex === -1) return;
  if (insertPosition === draggedIndex || insertPosition === draggedIndex + 1) {
    // Dropping in same position - no-op
    draggedDialogueLineId = null;
    renderMinigameDetails();
    return;
  }

  // Remove from old position
  const [draggedLine] = lines.splice(draggedIndex, 1);

  // Adjust insert position
  let adjustedPosition = insertPosition;
  if (draggedIndex < insertPosition) {
    adjustedPosition--;
  }

  // Insert at new position
  lines.splice(adjustedPosition, 0, draggedLine);

  // Update order field for all lines
  lines.forEach((line, index) => {
    line.order = index;
  });

  draggedDialogueLineId = null;
  renderMinigameDetails();
  autoSaveTrial();
}

function handleDialogueGapDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('drag-over-gap');
}

function handleDialogueGapDragLeave(event) {
  event.currentTarget.classList.remove('drag-over-gap');
}

// ==================== Voice Line Handling ====================

async function handleDialogueVoiceUpload(gameId, lineId, event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type (audio only)
  if (!file.type.startsWith('audio/')) {
    alert('Please select an audio file');
    event.target.value = ''; // Reset file input
    return;
  }

  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const line = mg.typeSpecific.dialogueLines.find(l => l.lineId === lineId);
  if (!line) return;

  try {
    // Create nested directory: Audio/Minigames/{gameId}/
    const audioDir = await dirHandle.getDirectoryHandle("Audio", { create: true });
    const minigamesDir = await audioDir.getDirectoryHandle("Minigames", { create: true });
    const gameAudioDir = await minigamesDir.getDirectoryHandle(gameId, { create: true });

    // Generate filename: dialogue_{lineId}.{ext}
    const ext = file.name.split('.').pop();
    const audioFileName = `dialogue_${lineId}.${ext}`;

    // Write audio file to disk
    const audioFileHandle = await gameAudioDir.getFileHandle(audioFileName, { create: true });
    const writable = await audioFileHandle.createWritable();
    await writable.write(file);
    await writable.close();

    // Store file information
    line.voiceLineFile = audioFileName;
    line.voiceLineBlob = file; // Keep blob for preview

    renderMinigameDetails();
    autoSaveTrial();
  } catch (error) {
    console.error("Error saving audio file:", error);
    alert(`Failed to save audio: ${error.message}`);
  }
}

async function clearDialogueVoiceLine(gameId, lineId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const line = mg.typeSpecific.dialogueLines.find(l => l.lineId === lineId);
  if (!line) return;

  // Delete file from disk
  if (line.voiceLineFile) {
    try {
      const audioDir = await dirHandle.getDirectoryHandle("Audio", { create: false });
      const minigamesDir = await audioDir.getDirectoryHandle("Minigames", { create: false });
      const gameAudioDir = await minigamesDir.getDirectoryHandle(gameId, { create: false });
      await gameAudioDir.removeEntry(line.voiceLineFile);
    } catch (e) {
      console.warn("Could not remove audio file:", e);
    }
  }

  // Clear voice line metadata
  line.voiceLineFile = null;
  line.voiceLineBlob = null;

  renderMinigameDetails();
  autoSaveTrial();
}

// ==================== Audio Playback ====================

async function loadDialogueAudioFromDisk(gameId, lineId, filename) {
  try {
    const audioDir = await dirHandle.getDirectoryHandle("Audio", { create: false });
    const minigamesDir = await audioDir.getDirectoryHandle("Minigames", { create: false });
    const gameAudioDir = await minigamesDir.getDirectoryHandle(gameId, { create: false });
    const fileHandle = await gameAudioDir.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return file;
  } catch (error) {
    console.error("Error loading dialogue audio:", error);
    return null;
  }
}

async function playDialogueAudioPreview(gameId, lineId) {
  const playerKey = `${gameId}_${lineId}`;
  const player = dialogueAudioPlayers[playerKey];

  // Toggle pause if already playing
  if (player && !player.paused) {
    player.pause();
    player.currentTime = 0;
    updateDialoguePlayButton(lineId, false);
    return;
  }

  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const line = mg.typeSpecific.dialogueLines.find(l => l.lineId === lineId);
  if (!line || !line.voiceLineFile) return;

  // Load audio from disk if needed
  let audioBlob = line.voiceLineBlob;
  if (!audioBlob) {
    audioBlob = await loadDialogueAudioFromDisk(gameId, lineId, line.voiceLineFile);
    if (!audioBlob) {
      alert("Failed to load audio file");
      return;
    }
    line.voiceLineBlob = audioBlob;
  }

  try {
    const blobUrl = URL.createObjectURL(audioBlob);

    // Create or reuse audio element
    if (!dialogueAudioPlayers[playerKey]) {
      const audio = new Audio();
      dialogueAudioPlayers[playerKey] = audio;

      audio.onended = () => {
        updateDialoguePlayButton(lineId, false);
        URL.revokeObjectURL(audio.src);
      };

      audio.onerror = () => {
        alert("Audio playback error");
        updateDialoguePlayButton(lineId, false);
      };

      audio.ontimeupdate = () => {
        updateDialogueSeekBar(lineId, audio);
      };

      audio.onloadedmetadata = () => {
        updateDialogueSeekBar(lineId, audio);
      };
    }

    const audio = dialogueAudioPlayers[playerKey];
    audio.src = blobUrl;
    await audio.play();
    updateDialoguePlayButton(lineId, true);
  } catch (error) {
    console.error("Error playing audio:", error);
    alert(`Failed to play audio: ${error.message}`);
  }
}

function updateDialoguePlayButton(lineId, isPlaying) {
  const btn = document.getElementById(`dialogue-play-btn-${lineId}`);
  if (btn) {
    btn.innerHTML = isPlaying ? '⏸️ Pause' : '▶️ Play';
  }
}

function seekDialogueAudio(gameId, lineId, value) {
  const playerKey = `${gameId}_${lineId}`;
  const audio = dialogueAudioPlayers[playerKey];
  if (audio && audio.duration) {
    audio.currentTime = (value / 100) * audio.duration;
  }
}

function updateDialogueSeekBar(lineId, audio) {
  const seekBar = document.getElementById(`dialogue-audio-seek-bar-${lineId}`);
  const currentTimeEl = document.getElementById(`dialogue-audio-time-current-${lineId}`);
  const totalTimeEl = document.getElementById(`dialogue-audio-time-total-${lineId}`);

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
