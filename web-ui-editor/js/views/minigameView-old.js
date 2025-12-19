// Minigame view - displays minigame instances with inline editing
let expandedMinigameId = null;

function renderMinigameDetails() {
  const grid = document.getElementById('mainGrid');

  if (minigames.length === 0) {
    grid.innerHTML = `
      <div id="minigameDetailsContainer">
        <div class="script-empty-state">
          <div class="script-empty-icon">🎮</div>
          <h2>No Minigames Configured</h2>
          <p>Click the button below to create your first minigame instance</p>
          <button class="btn btn-primary script-add-btn" onclick="addMinigame()">
            ➕ Create Minigame
          </button>
        </div>
      </div>
    `;
  } else {
    let minigamesHtml = minigames.map((mg, index) =>
      renderMinigameCard(mg, index)
    ).join('');

    grid.innerHTML = `
      <div id="minigameDetailsContainer">
        <div class="script-header">
          <h2>Minigame Instances</h2>
          <button class="btn btn-primary" onclick="addMinigame()">➕ Create Minigame</button>
        </div>
        <div class="minigame-cards-container">
          ${minigamesHtml}
        </div>
      </div>
    `;
  }
}

function renderMinigameCard(mg, index) {
  const isExpanded = expandedMinigameId === mg.gameId;

  const typeLabels = {
    'nonstop_debate': 'Nonstop Debate',
    'mass_panic_debate': 'Mass Panic Debate',
    'logic_dive': 'Logic Dive',
    'hangmans_gambit': "Hangman's Gambit",
    'debate_scrum': 'Debate Scrum',
    'rebuttal_showdown': 'Rebuttal Showdown',
    'psyche_taxi': 'Psyche Taxi',
    'closing_argument': 'Closing Argument'
  };

  const difficultyColors = {
    'easy': '#10b981',
    'medium': '#f59e0b',
    'hard': '#ef4444'
  };

  let cardContent = `
    <div class="minigame-card ${isExpanded ? 'expanded' : ''}" data-minigame-id="${mg.gameId}">
      <div class="minigame-card-header" onclick="toggleMinigameExpand('${mg.gameId}')">
        <div class="minigame-info">
          <div class="minigame-name">${mg.name || 'Unnamed Minigame'}</div>
          <div class="minigame-meta">
            <span class="minigame-type">${typeLabels[mg.gameType] || mg.gameType}</span>
            <span class="minigame-difficulty" style="color: ${difficultyColors[mg.difficulty]}">
              ${mg.difficulty}
            </span>
            <span class="minigame-time">⏱️ ${mg.timeLimit}s</span>
          </div>
        </div>

        <div class="minigame-card-actions">
          <button class="btn-icon" onclick="event.stopPropagation(); deleteMinigame('${mg.gameId}')" title="Delete minigame">🗑️</button>
          <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
        </div>
      </div>
  `;

  if (isExpanded) {
    cardContent += `
      <div class="minigame-card-body">
        ${renderMinigameEditor(mg)}
      </div>
    `;
  }

  cardContent += `</div>`;
  return cardContent;
}

function toggleMinigameExpand(gameId) {
  if (expandedMinigameId === gameId) {
    expandedMinigameId = null;
  } else {
    expandedMinigameId = gameId;
  }
  renderMinigameDetails();
}

function renderMinigameEditor(mg) {
  // Common settings
  let editorHtml = `
    <div class="minigame-editor-section">
      <h3>Common Settings</h3>

      <div class="form-group">
        <label>Minigame Question</label>
        <input type="text"
               class="form-input"
               value="${mg.name || ''}"
               onchange="updateMinigameField('${mg.gameId}', 'name', this.value)"
               placeholder="Enter minigame question">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Game Type</label>
          <select class="form-input" onchange="updateMinigameField('${mg.gameId}', 'gameType', this.value)">
            <option value="nonstop_debate" ${mg.gameType === 'nonstop_debate' ? 'selected' : ''}>Nonstop Debate</option>
            <option value="mass_panic_debate" ${mg.gameType === 'mass_panic_debate' ? 'selected' : ''}>Mass Panic Debate</option>
            <option value="logic_dive" ${mg.gameType === 'logic_dive' ? 'selected' : ''}>Logic Dive</option>
            <option value="hangmans_gambit" ${mg.gameType === 'hangmans_gambit' ? 'selected' : ''}>Hangman's Gambit</option>
            <option value="debate_scrum" ${mg.gameType === 'debate_scrum' ? 'selected' : ''}>Debate Scrum</option>
          </select>
        </div>

        <div class="form-group">
          <label>Difficulty</label>
          <select class="form-input" onchange="updateMinigameField('${mg.gameId}', 'difficulty', this.value)">
            <option value="easy" ${mg.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
            <option value="medium" ${mg.difficulty === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="hard" ${mg.difficulty === 'hard' ? 'selected' : ''}>Hard</option>
          </select>
        </div>

        <div class="form-group">
          <label>Time Limit (seconds)</label>
          <input type="number"
                 class="form-input"
                 value="${mg.timeLimit || 60}"
                 onchange="updateMinigameField('${mg.gameId}', 'timeLimit', parseInt(this.value))"
                 min="10" max="300">
        </div>
      </div>
    </div>
  `;

  // Type-specific settings
  if (mg.gameType === 'nonstop_debate') {
    editorHtml += renderNonstopDebateEditor(mg);
  } else if (mg.gameType === 'mass_panic_debate') {
    editorHtml += renderMassPanicDebateEditor(mg);
  } else if (mg.gameType === 'logic_dive') {
    editorHtml += renderLogicDiveEditor(mg);
  } else if (mg.gameType === 'hangmans_gambit') {
    editorHtml += renderHangmansGambitEditor(mg);
  } else if (mg.gameType === 'debate_scrum') {
    editorHtml += renderDebateScumEditor(mg);
  } else {
    // Placeholder for other types
    editorHtml += `
      <div class="minigame-editor-section">
        <p style="color: var(--text-tertiary); padding: 2rem; text-align: center; font-style: italic;">
          This game type doesn't have a custom editor yet. Only common settings are available.
        </p>
      </div>
    `;
  }

  return editorHtml;
}

function updateMinigameField(gameId, field, value) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (mg) {
    mg[field] = value;

    // When game type changes, initialize appropriate typeSpecific structure
    if (field === 'gameType') {
      if (value === 'nonstop_debate' && !mg.typeSpecific) {
        mg.typeSpecific = { selectedBullets: [], dialogueLines: [] };
      } else if (value === 'logic_dive' && (!mg.typeSpecific || !mg.typeSpecific.questions)) {
        mg.typeSpecific = { questions: [] };
      } else if (value === 'hangmans_gambit' && (!mg.typeSpecific || mg.typeSpecific.answerKey === undefined)) {
        mg.typeSpecific = { answerKey: '' };
      } else if (value === 'debate_scrum' && (!mg.typeSpecific || !mg.typeSpecific.arguments)) {
        mg.typeSpecific = { arguments: [] };
      }
    }

    // Re-render immediately so UI updates
    renderMinigameDetails();
    // Save in background (fire and forget)
    autoSaveTrial();
  }
}

function generateMinigameId() {
  return `mg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function addMinigame() {
  const newMinigame = {
    gameId: generateMinigameId(),
    name: "",
    gameType: "nonstop_debate",
    difficulty: "medium",
    timeLimit: 60,
    typeSpecific: {
      selectedBullets: [],
      dialogueLines: []
    }
  };
  minigames.push(newMinigame);
  expandedMinigameId = newMinigame.gameId; // Auto-expand new minigame
  renderMinigameDetails();
  autoSaveTrial();
}

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
            ${bullet.imageDataURL ? `<img src="${bullet.imageDataURL}" alt="${bullet.name}">` : '📷'}
          </div>
          <div class="bullet-select-info">
            <div class="bullet-select-name">${bullet.name || 'Unnamed'}</div>
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
      <button class="btn btn-primary debate-dialogue-add-btn" onclick="addDialogueLine('${mg.gameId}')"
              ${dialogueLines.length >= 30 ? 'disabled' : ''}>
        ➕ Add Dialogue Line
      </button>
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

  return html;
}

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

// Dialogue line reordering functions
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

// Drag-and-drop for dialogue lines
let draggedDialogueLineId = null;

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
        <div class="dialogue-line-preview">${fullSentence || '<empty line>'}</div>
        <button class="btn-icon" onclick="event.stopPropagation(); deleteDialogueLine('${gameId}', '${line.lineId}')" title="Delete line">🗑️</button>
      </div>

      <div class="dialogue-line-body">
        <div class="form-group">
          <label>Sentence Structure</label>
          <div class="sentence-structure">
            <input type="text"
                   class="form-input sentence-part"
                   value="${line.sentenceBeginning || ''}"
                   onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'sentenceBeginning', this.value)"
                   placeholder="Beginning...">
            <input type="text"
                   class="form-input sentence-part target-part"
                   value="${line.target || ''}"
                   onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'target', this.value)"
                   placeholder="Target (shootable)">
            <input type="text"
                   class="form-input sentence-part"
                   value="${line.sentenceEnd || ''}"
                   onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'sentenceEnd', this.value)"
                   placeholder="...end">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Correct Answer Bullet</label>
            <select class="form-input"
                    onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'answerBulletId', this.value)">
              <option value="">No answer (false target)</option>
              ${truthBullets.map(bullet => `
                <option value="${bullet.bulletId}" ${line.answerBulletId === bullet.bulletId ? 'selected' : ''}>
                  ${bullet.name || 'Unnamed Bullet'}
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

        <div class="form-row">
          <div class="form-group">
            <label>Character</label>
            <select class="form-input" onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'characterId', this.value)">
              <option value="">None</option>
              ${cast.filter(c => c).map(c => `
                <option value="${c.id}" ${line.characterId === c.id ? 'selected' : ''}>${c.name} ${c.surname}</option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox"
                     ${line.characterSpotlight ? 'checked' : ''}
                     onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'characterSpotlight', this.checked)">
              Enable Character Spotlight
            </label>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>User Failed Comment</label>
            <input type="text"
                   class="form-input"
                   value="${line.userFailedComment || ''}"
                   onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'userFailedComment', this.value)"
                   placeholder="Message when user fails">
          </div>

          <div class="form-group">
            <label>Wrong Answer Comment</label>
            <input type="text"
                   class="form-input"
                   value="${line.userWrongAnswerComment || ''}"
                   onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'userWrongAnswerComment', this.value)"
                   placeholder="Message when user shoots wrong target">
          </div>
        </div>

        <div class="form-row">
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
        </div>
      </div>
    </div>
  `;
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

function deleteMinigame(gameId) {
  if (!confirm('Delete this minigame? This will also remove it from any script lines that reference it.')) {
    return;
  }

  minigames = minigames.filter(mg => mg.gameId !== gameId);

  scriptLines.forEach(line => {
    if (line.type === 'minigame' && line.minigameId === gameId) {
      line.minigameId = "";
    }
  });

  renderMinigameDetails();
  autoSaveTrial();
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

// ==================== Mass Panic Debate Editor ====================

function renderMassPanicDebateEditor(mg) {
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
              ${cast.filter(c => c).map(c => `
                <option value="${c.id}" ${mg.typeSpecific.speaker1CharacterId === c.id ? 'selected' : ''}>
                  ${c.name} ${c.surname}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Speaker 2 Character</label>
            <select class="form-input" onchange="updateMassPanicField('${mg.gameId}', 'speaker2CharacterId', this.value)">
              <option value="">None</option>
              ${cast.filter(c => c).map(c => `
                <option value="${c.id}" ${mg.typeSpecific.speaker2CharacterId === c.id ? 'selected' : ''}>
                  ${c.name} ${c.surname}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Speaker 3 Character</label>
            <select class="form-input" onchange="updateMassPanicField('${mg.gameId}', 'speaker3CharacterId', this.value)">
              <option value="">None</option>
              ${cast.filter(c => c).map(c => `
                <option value="${c.id}" ${mg.typeSpecific.speaker3CharacterId === c.id ? 'selected' : ''}>
                  ${c.name} ${c.surname}
                </option>
              `).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="mass-panic-controls">
        <button class="btn btn-primary" onclick="addMassPanicLineGroup('${mg.gameId}')">
          ➕ Add Line Group (All 3 Speakers)
        </button>
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
    </div>
  `;
}

function renderMassPanicLineGroup(gameId, group, groupIndex) {
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

function renderMassPanicLine(gameId, group, line, speakerKey, speakerIndex, color, label) {
  return `
    <div class="mass-panic-speaker-line" style="border-left: 4px solid ${color};">
      <div class="speaker-line-header">
        <h5>${label}</h5>
        ${line.isLoudAssertion ? '<span class="badge badge-loud">📢 LOUD</span>' : ''}
      </div>

      <div class="sentence-structure">
        <input type="text"
               class="form-input sentence-part"
               value="${line.sentenceBeginning || ''}"
               placeholder="Beginning..."
               onchange="updateMassPanicLineField('${gameId}', '${group.groupId}', '${speakerKey}', 'sentenceBeginning', this.value)">
        <input type="text"
               class="form-input sentence-part target-part"
               value="${line.target || ''}"
               placeholder="Target (shootable)"
               onchange="updateMassPanicLineField('${gameId}', '${group.groupId}', '${speakerKey}', 'target', this.value)">
        <input type="text"
               class="form-input sentence-part"
               value="${line.sentenceEnd || ''}"
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
            ${truthBullets.map(b => `
              <option value="${b.bulletId}" ${line.answerBulletId === b.bulletId ? 'selected' : ''}>
                ${b.name}
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

// ==================== Logic Dive Editor ====================

function renderLogicDiveEditor(mg) {
  // Initialize typeSpecific.questions if needed
  if (!mg.typeSpecific) {
    mg.typeSpecific = {};
  }
  if (!mg.typeSpecific.questions) {
    mg.typeSpecific.questions = [];
  }

  const questions = mg.typeSpecific.questions;

  let html = `
    <div class="minigame-editor-section logic-dive-section">
      <h3>Logic Dive Questions</h3>
      <p class="section-description">Create questions with 3-5 multiple choice answers.</p>

      <button class="btn btn-primary logic-dive-add-btn"
              onclick="addLogicDiveQuestion('${mg.gameId}')">
        ➕ Add Question
      </button>

      <div class="logic-dive-questions-container">
        ${questions.length === 0 ? `
          <div class="empty-state">
            <p>No questions yet. Click "Add Question" to create your first question.</p>
          </div>
        ` : renderLogicDiveQuestions(mg.gameId, questions)}
      </div>
    </div>
  `;

  return html;
}

function renderLogicDiveQuestions(gameId, questions) {
  let html = '';

  // Add drop zone at top
  html += `<div class="question-drop-zone"
                data-insert-position="0"
                ondragover="handleQuestionGapDragOver(event)"
                ondrop="handleQuestionDropInGap(event, '${gameId}', 0)"
                ondragleave="handleQuestionGapDragLeave(event)"></div>`;

  questions
    .sort((a, b) => a.order - b.order)
    .forEach((question, index) => {
      html += `
        <div class="logic-dive-question-wrapper"
             draggable="true"
             ondragstart="handleQuestionDragStart(event, '${gameId}', '${question.questionId}')"
             ondragend="handleQuestionDragEnd(event)">
          ${renderLogicDiveQuestionEditor(gameId, question, index)}
        </div>

        <div class="question-drop-zone"
             data-insert-position="${index + 1}"
             ondragover="handleQuestionGapDragOver(event)"
             ondrop="handleQuestionDropInGap(event, '${gameId}', ${index + 1})"
             ondragleave="handleQuestionGapDragLeave(event)"></div>
      `;
    });

  return html;
}

function renderLogicDiveQuestionEditor(gameId, question, index) {
  return `
    <div class="logic-dive-question-card">
      <div class="question-header">
        <div class="question-drag-handle">
          <div class="arrow-btn arrow-up"
               onclick="event.stopPropagation(); moveQuestionUp('${gameId}', '${question.questionId}')"
               title="Move up">▲</div>
          <div class="arrow-btn arrow-down"
               onclick="event.stopPropagation(); moveQuestionDown('${gameId}', '${question.questionId}')"
               title="Move down">▼</div>
        </div>
        <div class="question-number">Question #${index + 1}</div>
        <button class="btn-icon" onclick="deleteLogicDiveQuestion('${gameId}', '${question.questionId}')"
                title="Delete question">🗑️</button>
      </div>

      <div class="question-body">
        <div class="form-group">
          <label>Question Text</label>
          <textarea class="form-input"
                    rows="2"
                    placeholder="Enter the question..."
                    onchange="updateLogicDiveQuestion('${gameId}', '${question.questionId}', 'questionText', this.value)">${question.questionText || ''}</textarea>
        </div>

        <div class="answers-section">
          <div class="answers-header">
            <h4>Answers (${question.answers.length}/5)</h4>
            ${question.answers.length < 5 ? `
              <button class="btn btn-secondary btn-sm"
                      onclick="addLogicDiveAnswer('${gameId}', '${question.questionId}')">
                ➕ Add Answer
              </button>
            ` : ''}
          </div>

          <div class="answers-list">
            ${question.answers.map((answer, ansIndex) => `
              <div class="answer-item ${answer.isCorrect ? 'correct-answer' : ''}">
                <div class="answer-radio">
                  <input type="radio"
                         name="correct_${question.questionId}"
                         ${answer.isCorrect ? 'checked' : ''}
                         onchange="setCorrectAnswer('${gameId}', '${question.questionId}', '${answer.answerId}')"
                         title="Mark as correct answer">
                </div>
                <input type="text"
                       class="form-input answer-text-input"
                       placeholder="Answer ${ansIndex + 1}"
                       value="${answer.answerText || ''}"
                       onchange="updateLogicDiveAnswer('${gameId}', '${question.questionId}', '${answer.answerId}', 'answerText', this.value)">
                ${question.answers.length > 2 ? `
                  <button class="btn-icon btn-icon-danger"
                          onclick="deleteLogicDiveAnswer('${gameId}', '${question.questionId}', '${answer.answerId}')"
                          title="Delete answer">🗑️</button>
                ` : ''}
              </div>
            `).join('')}
          </div>

          ${question.answers.length < 2 ? `
            <p class="validation-warning">⚠️ Add at least 2 answers</p>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// Logic Dive CRUD functions
function addLogicDiveQuestion(gameId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  if (!mg.typeSpecific) {
    mg.typeSpecific = {};
  }
  if (!mg.typeSpecific.questions) {
    mg.typeSpecific.questions = [];
  }

  const newQuestion = {
    questionId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    order: mg.typeSpecific.questions.length,
    questionText: "",
    answers: [
      { answerId: `a_${Date.now()}_1`, answerText: "", isCorrect: true },
      { answerId: `a_${Date.now()}_2`, answerText: "", isCorrect: false },
      { answerId: `a_${Date.now()}_3`, answerText: "", isCorrect: false },
      { answerId: `a_${Date.now()}_4`, answerText: "", isCorrect: false },
      { answerId: `a_${Date.now()}_5`, answerText: "", isCorrect: false }
    ]
  };

  mg.typeSpecific.questions.push(newQuestion);
  renderMinigameDetails();
  autoSaveTrial();
}

function deleteLogicDiveQuestion(gameId, questionId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  mg.typeSpecific.questions = mg.typeSpecific.questions.filter(q => q.questionId !== questionId);

  // Re-index order
  mg.typeSpecific.questions.forEach((q, index) => {
    q.order = index;
  });

  renderMinigameDetails();
  autoSaveTrial();
}

function updateLogicDiveQuestion(gameId, questionId, field, value) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const question = mg.typeSpecific.questions.find(q => q.questionId === questionId);
  if (!question) return;

  question[field] = value;
  autoSaveTrial();
}

function addLogicDiveAnswer(gameId, questionId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const question = mg.typeSpecific.questions.find(q => q.questionId === questionId);
  if (!question || question.answers.length >= 5) return;

  const newAnswer = {
    answerId: `a_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    answerText: "",
    isCorrect: false
  };

  question.answers.push(newAnswer);
  renderMinigameDetails();
  autoSaveTrial();
}

function deleteLogicDiveAnswer(gameId, questionId, answerId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const question = mg.typeSpecific.questions.find(q => q.questionId === questionId);
  if (!question || question.answers.length <= 2) return; // Minimum 2 answers

  question.answers = question.answers.filter(a => a.answerId !== answerId);

  // If deleted answer was correct, make first answer correct
  if (!question.answers.some(a => a.isCorrect)) {
    question.answers[0].isCorrect = true;
  }

  renderMinigameDetails();
  autoSaveTrial();
}

function updateLogicDiveAnswer(gameId, questionId, answerId, field, value) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const question = mg.typeSpecific.questions.find(q => q.questionId === questionId);
  if (!question) return;

  const answer = question.answers.find(a => a.answerId === answerId);
  if (!answer) return;

  answer[field] = value;
  autoSaveTrial();
}

function setCorrectAnswer(gameId, questionId, answerId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const question = mg.typeSpecific.questions.find(q => q.questionId === questionId);
  if (!question) return;

  // Set all answers to false, then set selected to true
  question.answers.forEach(a => {
    a.isCorrect = (a.answerId === answerId);
  });

  renderMinigameDetails();
  autoSaveTrial();
}

// Drag-and-drop for questions
let draggedQuestionId = null;

function handleQuestionDragStart(event, gameId, questionId) {
  draggedQuestionId = questionId;
  event.target.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
}

function handleQuestionDragEnd(event) {
  event.target.classList.remove('dragging');
  draggedQuestionId = null;
  document.querySelectorAll('.drag-over-gap').forEach(el => {
    el.classList.remove('drag-over-gap');
  });
}

function handleQuestionDropInGap(event, gameId, insertPosition) {
  event.preventDefault();
  event.stopPropagation();

  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg || !draggedQuestionId) return;

  const questions = mg.typeSpecific.questions;
  const draggedIndex = questions.findIndex(q => q.questionId === draggedQuestionId);

  if (draggedIndex === -1) return;
  if (insertPosition === draggedIndex || insertPosition === draggedIndex + 1) {
    draggedQuestionId = null;
    renderMinigameDetails();
    return;
  }

  const [draggedQuestion] = questions.splice(draggedIndex, 1);

  let adjustedPosition = insertPosition;
  if (draggedIndex < insertPosition) {
    adjustedPosition--;
  }

  questions.splice(adjustedPosition, 0, draggedQuestion);

  questions.forEach((q, index) => {
    q.order = index;
  });

  draggedQuestionId = null;
  renderMinigameDetails();
  autoSaveTrial();
}

function handleQuestionGapDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('drag-over-gap');
}

function handleQuestionGapDragLeave(event) {
  event.currentTarget.classList.remove('drag-over-gap');
}

function moveQuestionUp(gameId, questionId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const questions = mg.typeSpecific.questions;
  const currentIndex = questions.findIndex(q => q.questionId === questionId);

  if (currentIndex <= 0) return;

  [questions[currentIndex], questions[currentIndex - 1]] = [questions[currentIndex - 1], questions[currentIndex]];

  questions.forEach((q, index) => {
    q.order = index;
  });

  renderMinigameDetails();
  autoSaveTrial();
}

function moveQuestionDown(gameId, questionId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const questions = mg.typeSpecific.questions;
  const currentIndex = questions.findIndex(q => q.questionId === questionId);

  if (currentIndex === -1 || currentIndex >= questions.length - 1) return;

  [questions[currentIndex], questions[currentIndex + 1]] = [questions[currentIndex + 1], questions[currentIndex]];

  questions.forEach((q, index) => {
    q.order = index;
  });

  renderMinigameDetails();
  autoSaveTrial();
}

// ==================== Hangman's Gambit Editor ====================

function renderHangmansGambitEditor(mg) {
  // Initialize typeSpecific if needed
  if (!mg.typeSpecific) {
    mg.typeSpecific = {};
  }
  if (mg.typeSpecific.answerKey === undefined) {
    mg.typeSpecific.answerKey = "";
  }

  return `
    <div class="minigame-editor-section">
      <h3>Answer Key</h3>
      <p class="help-text">Enter the answer key for this Hangman's Gambit puzzle.</p>

      <div class="form-group">
        <label>Answer Key</label>
        <input type="text"
               class="form-input"
               value="${mg.typeSpecific.answerKey || ''}"
               onchange="updateHangmansGambitField('${mg.gameId}', 'answerKey', this.value)"
               placeholder="Enter answer key">
      </div>
    </div>
  `;
}

function updateHangmansGambitField(gameId, field, value) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  if (!mg.typeSpecific) {
    mg.typeSpecific = {};
  }

  mg.typeSpecific[field] = value;
  autoSaveTrial();
}

// ==================== Debate Scrum Editor ====================

function renderDebateScumEditor(mg) {
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

      <button class="btn btn-primary"
              onclick="addDebateScumArgument('${mg.gameId}')"
              ${args.length >= 8 ? 'disabled' : ''}>
        ➕ Add Argument
      </button>
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
  return html;
}

function renderDebateScumArguments(gameId, args) {
  let html = '';

  // Add drop zone at top
  html += `<div class="argument-drop-zone"
                data-insert-position="0"
                ondragover="handleArgumentGapDragOver(event)"
                ondrop="handleArgumentDropInGap(event, '${gameId}', 0)"
                ondragleave="handleArgumentGapDragLeave(event)"></div>`;

  args.sort((a, b) => a.order - b.order).forEach((arg, index) => {
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

function renderDebateScumArgumentEditor(gameId, arg, index) {
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
              <option value="">None</option>
              ${cast.filter(c => c).map(c => `
                <option value="${c.id}" ${arg.oppositionCharacterId === c.id ? 'selected' : ''}>
                  ${c.name} ${c.surname}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Statement</label>
            <textarea class="form-input"
                      rows="3"
                      placeholder="Opposition statement..."
                      onchange="updateDebateScumArgument('${gameId}', '${arg.argumentId}', 'oppositionStatement', this.value)">${arg.oppositionStatement || ''}</textarea>
          </div>

          <div class="form-group">
            <label>Keywords (one per line)</label>
            <textarea class="form-input keywords-input"
                      rows="2"
                      placeholder="Enter keywords, one per line..."
                      onchange="updateDebateScumArgumentKeywords('${gameId}', '${arg.argumentId}', 'opposition', this.value)">${(arg.oppositionKeywords || []).join('\n')}</textarea>
            <small style="color: var(--text-tertiary);">Keywords that will be highlighted during this argument</small>
          </div>

          <div class="form-group">
            <label>Voice Line Audio</label>
            ${arg.oppositionAudioFile ? `
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
            ` : `
              <input type="file"
                     accept="audio/*"
                     onchange="handleDebateScumAudioUpload('${gameId}', '${arg.argumentId}', 'opposition', event)">
            `}
          </div>
        </div>

        <div class="argument-side defense-side">
          <h4>🔵 Defense Side</h4>

          <div class="form-group">
            <label>Character</label>
            <select class="form-input"
                    onchange="updateDebateScumArgument('${gameId}', '${arg.argumentId}', 'defenseCharacterId', this.value)">
              <option value="">None</option>
              ${cast.filter(c => c).map(c => `
                <option value="${c.id}" ${arg.defenseCharacterId === c.id ? 'selected' : ''}>
                  ${c.name} ${c.surname}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Counter Statement</label>
            <textarea class="form-input"
                      rows="3"
                      placeholder="Defense counter statement..."
                      onchange="updateDebateScumArgument('${gameId}', '${arg.argumentId}', 'defenseStatement', this.value)">${arg.defenseStatement || ''}</textarea>
          </div>

          <div class="form-group">
            <label>Keywords (one per line)</label>
            <textarea class="form-input keywords-input"
                      rows="2"
                      placeholder="Enter keywords, one per line..."
                      onchange="updateDebateScumArgumentKeywords('${gameId}', '${arg.argumentId}', 'defense', this.value)">${(arg.defenseKeywords || []).join('\n')}</textarea>
            <small style="color: var(--text-tertiary);">Keywords that will be highlighted during this argument</small>
          </div>

          <div class="form-group">
            <label>Voice Line Audio</label>
            ${arg.defenseAudioFile ? `
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
            ` : `
              <input type="file"
                     accept="audio/*"
                     onchange="handleDebateScumAudioUpload('${gameId}', '${arg.argumentId}', 'defense', event)">
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

function addDebateScumArgument(gameId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  if (!mg.typeSpecific) mg.typeSpecific = {};
  if (!mg.typeSpecific.arguments) mg.typeSpecific.arguments = [];

  if (mg.typeSpecific.arguments.length >= 8) {
    alert('Maximum 8 arguments allowed');
    return;
  }

  const newArg = {
    argumentId: `arg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    order: mg.typeSpecific.arguments.length,
    // Opposition side
    oppositionStatement: "",
    oppositionCharacterId: "",
    oppositionAudioFile: null,
    oppositionAudioBlob: null,
    oppositionKeywords: [],
    // Defense side
    defenseStatement: "",
    defenseCharacterId: "",
    defenseAudioFile: null,
    defenseAudioBlob: null,
    defenseKeywords: []
  };

  mg.typeSpecific.arguments.push(newArg);
  renderMinigameDetails();
  autoSaveTrial();
}

function deleteDebateScumArgument(gameId, argumentId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  mg.typeSpecific.arguments = mg.typeSpecific.arguments.filter(a => a.argumentId !== argumentId);

  // Re-index order
  mg.typeSpecific.arguments.forEach((a, index) => {
    a.order = index;
  });

  renderMinigameDetails();
  autoSaveTrial();
}

function updateDebateScumArgument(gameId, argumentId, field, value) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find(a => a.argumentId === argumentId);
  if (!arg) return;

  arg[field] = value;
  autoSaveTrial();
}

function moveArgumentUp(gameId, argumentId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const args = mg.typeSpecific.arguments;
  const currentIndex = args.findIndex(a => a.argumentId === argumentId);
  if (currentIndex <= 0) return;

  [args[currentIndex], args[currentIndex - 1]] = [args[currentIndex - 1], args[currentIndex]];
  args.forEach((a, index) => { a.order = index; });

  renderMinigameDetails();
  autoSaveTrial();
}

function moveArgumentDown(gameId, argumentId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const args = mg.typeSpecific.arguments;
  const currentIndex = args.findIndex(a => a.argumentId === argumentId);
  if (currentIndex === -1 || currentIndex >= args.length - 1) return;

  [args[currentIndex], args[currentIndex + 1]] = [args[currentIndex + 1], args[currentIndex]];
  args.forEach((a, index) => { a.order = index; });

  renderMinigameDetails();
  autoSaveTrial();
}

// Drag-and-drop handlers
let draggedArgumentId = null;

function handleArgumentDragStart(event, gameId, argumentId) {
  draggedArgumentId = argumentId;
  event.target.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
}

function handleArgumentDragEnd(event) {
  event.target.classList.remove('dragging');
  draggedArgumentId = null;
  document.querySelectorAll('.drag-over-gap').forEach(el => {
    el.classList.remove('drag-over-gap');
  });
}

function handleArgumentDropInGap(event, gameId, insertPosition) {
  event.preventDefault();
  event.stopPropagation();

  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg || !draggedArgumentId) return;

  const args = mg.typeSpecific.arguments;
  const draggedIndex = args.findIndex(a => a.argumentId === draggedArgumentId);

  if (draggedIndex === -1) return;
  if (insertPosition === draggedIndex || insertPosition === draggedIndex + 1) {
    draggedArgumentId = null;
    renderMinigameDetails();
    return;
  }

  const [draggedArg] = args.splice(draggedIndex, 1);
  let adjustedPosition = insertPosition;
  if (draggedIndex < insertPosition) adjustedPosition--;

  args.splice(adjustedPosition, 0, draggedArg);
  args.forEach((a, index) => { a.order = index; });

  draggedArgumentId = null;
  renderMinigameDetails();
  autoSaveTrial();
}

function handleArgumentGapDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('drag-over-gap');
}

function handleArgumentGapDragLeave(event) {
  event.currentTarget.classList.remove('drag-over-gap');
}

// ==================== Dialogue Audio Playback ====================

// Store audio elements per dialogue line
const dialogueAudioPlayers = {};

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

function formatAudioTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ==================== Debate Scrum Audio & Keywords ====================

async function handleDebateScumAudioUpload(gameId, argumentId, side, event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type (audio only)
  if (!file.type.startsWith('audio/')) {
    alert('Please select an audio file');
    event.target.value = '';
    return;
  }

  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find(a => a.argumentId === argumentId);
  if (!arg) return;

  try {
    // Create nested directory: Audio/Minigames/{gameId}/
    const audioDir = await dirHandle.getDirectoryHandle("Audio", { create: true });
    const minigamesDir = await audioDir.getDirectoryHandle("Minigames", { create: true });
    const gameAudioDir = await minigamesDir.getDirectoryHandle(gameId, { create: true });

    // Generate filename: scrum_{argumentId}_{side}.{ext}
    const ext = file.name.split('.').pop();
    const audioFileName = `scrum_${argumentId}_${side}.${ext}`;

    // Write audio file to disk
    const audioFileHandle = await gameAudioDir.getFileHandle(audioFileName, { create: true });
    const writable = await audioFileHandle.createWritable();
    await writable.write(file);
    await writable.close();

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
    console.error("Error saving audio:", error);
    alert(`Failed to save audio: ${error.message}`);
  }
}

async function clearDebateScumAudio(gameId, argumentId, side) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find(a => a.argumentId === argumentId);
  if (!arg) return;

  const audioFile = side === 'opposition' ? arg.oppositionAudioFile : arg.defenseAudioFile;

  // Delete file from disk
  if (audioFile) {
    try {
      const audioDir = await dirHandle.getDirectoryHandle("Audio", { create: false });
      const minigamesDir = await audioDir.getDirectoryHandle("Minigames", { create: false });
      const gameAudioDir = await minigamesDir.getDirectoryHandle(gameId, { create: false });
      await gameAudioDir.removeEntry(audioFile);
    } catch (e) {
      console.warn("Could not remove audio file:", e);
    }
  }

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

function updateDebateScumArgumentKeywords(gameId, argumentId, side, value) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find(a => a.argumentId === argumentId);
  if (!arg) return;

  // Split by newlines and filter empty
  const keywords = value.split('\n').map(k => k.trim()).filter(k => k.length > 0);

  if (side === 'opposition') {
    arg.oppositionKeywords = keywords;
  } else {
    arg.defenseKeywords = keywords;
  }

  autoSaveTrial();
}

// Store audio elements for debate scrum
const debateScumAudioPlayers = {};

async function playDebateScumAudio(gameId, argumentId, side) {
  const playerKey = `${gameId}_${argumentId}_${side}`;
  const player = debateScumAudioPlayers[playerKey];

  // Toggle pause if already playing
  if (player && !player.paused) {
    player.pause();
    player.currentTime = 0;
    updateDebateScumPlayButton(argumentId, side, false);
    return;
  }

  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find(a => a.argumentId === argumentId);
  if (!arg) return;

  // Get audio file and blob
  const audioFile = side === 'opposition' ? arg.oppositionAudioFile : arg.defenseAudioFile;
  let audioBlob = side === 'opposition' ? arg.oppositionAudioBlob : arg.defenseAudioBlob;

  if (!audioFile) return;

  // Load audio from disk if needed
  if (!audioBlob) {
    try {
      const audioDir = await dirHandle.getDirectoryHandle("Audio", { create: false });
      const minigamesDir = await audioDir.getDirectoryHandle("Minigames", { create: false });
      const gameAudioDir = await minigamesDir.getDirectoryHandle(gameId, { create: false });
      const fileHandle = await gameAudioDir.getFileHandle(audioFile);
      const file = await fileHandle.getFile();
      audioBlob = file;

      // Store blob for future use
      if (side === 'opposition') {
        arg.oppositionAudioBlob = file;
      } else {
        arg.defenseAudioBlob = file;
      }
    } catch (error) {
      console.error("Error loading audio:", error);
      alert("Failed to load audio file");
      return;
    }
  }

  try {
    const blobUrl = URL.createObjectURL(audioBlob);

    // Create or reuse audio element
    if (!debateScumAudioPlayers[playerKey]) {
      const audio = new Audio();
      debateScumAudioPlayers[playerKey] = audio;

      audio.onended = () => {
        updateDebateScumPlayButton(argumentId, side, false);
        URL.revokeObjectURL(audio.src);
      };

      audio.onerror = () => {
        alert("Audio playback error");
        updateDebateScumPlayButton(argumentId, side, false);
      };
    }

    const audio = debateScumAudioPlayers[playerKey];
    audio.src = blobUrl;
    await audio.play();
    updateDebateScumPlayButton(argumentId, side, true);
  } catch (error) {
    console.error("Error playing audio:", error);
    alert(`Failed to play audio: ${error.message}`);
  }
}

function updateDebateScumPlayButton(argumentId, side, isPlaying) {
  const btn = document.getElementById(`scrum-play-btn-${argumentId}-${side}`);
  if (btn) {
    btn.innerHTML = isPlaying ? '⏸️ Pause' : '▶️ Play';
  }
}

// ==================== Mass Panic Debate Handlers ====================

function updateMassPanicField(gameId, field, value) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg || !mg.typeSpecific) return;

  mg.typeSpecific[field] = value;
  autoSaveTrial();
}

function addMassPanicLineGroup(gameId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg || !mg.typeSpecific) return;

  if (!mg.typeSpecific.lineGroups) {
    mg.typeSpecific.lineGroups = [];
  }

  const groupId = `panic_group_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

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

function createEmptyPanicLine() {
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

function deleteMassPanicLineGroup(gameId, groupId) {
  if (!confirm('Delete this entire line group (all 3 speakers)?')) return;

  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg || !mg.typeSpecific || !mg.typeSpecific.lineGroups) return;

  // Delete audio files first
  const group = mg.typeSpecific.lineGroups.find(g => g.groupId === groupId);
  if (group) {
    ['speaker1', 'speaker2', 'speaker3'].forEach(async (speakerKey) => {
      const line = group[speakerKey];
      if (line && line.voiceLineFile) {
        try {
          const audioDir = await dirHandle.getDirectoryHandle("Audio", { create: false });
          const minigamesDir = await audioDir.getDirectoryHandle("Minigames", { create: false });
          const gameAudioDir = await minigamesDir.getDirectoryHandle(gameId, { create: false });
          await gameAudioDir.removeEntry(line.voiceLineFile);
        } catch (e) {
          console.warn("Could not remove audio file:", e);
        }
      }
    });
  }

  mg.typeSpecific.lineGroups = mg.typeSpecific.lineGroups.filter(g => g.groupId !== groupId);

  // Re-index orders
  mg.typeSpecific.lineGroups.forEach((group, index) => {
    group.order = index;
  });

  renderMinigameDetails();
  autoSaveTrial();
}

function updateMassPanicLineField(gameId, groupId, speakerKey, field, value) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg || !mg.typeSpecific || !mg.typeSpecific.lineGroups) return;

  const group = mg.typeSpecific.lineGroups.find(g => g.groupId === groupId);
  if (!group || !group[speakerKey]) return;

  group[speakerKey][field] = value;
  autoSaveTrial();
}

function handleLoudAssertionToggle(gameId, groupId, speakerKey, checked) {
  const mg = minigames.find(m => m.gameId === gameId);
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

function handleMassPanicAnswerSelection(gameId, groupId, speakerKey, bulletId) {
  const mg = minigames.find(m => m.gameId === gameId);
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

// Mass Panic Audio Handlers
async function handlePanicVoiceUpload(gameId, groupId, speakerKey, event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('audio/')) {
    alert('Please select an audio file');
    event.target.value = '';
    return;
  }

  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg || !mg.typeSpecific || !mg.typeSpecific.lineGroups) return;

  const group = mg.typeSpecific.lineGroups.find(g => g.groupId === groupId);
  if (!group || !group[speakerKey]) return;

  const line = group[speakerKey];

  try {
    const audioDir = await dirHandle.getDirectoryHandle("Audio", { create: true });
    const minigamesDir = await audioDir.getDirectoryHandle("Minigames", { create: true });
    const gameAudioDir = await minigamesDir.getDirectoryHandle(gameId, { create: true });

    const ext = file.name.split('.').pop();
    const audioFileName = `panic_${groupId}_${speakerKey}.${ext}`;

    const audioFileHandle = await gameAudioDir.getFileHandle(audioFileName, { create: true });
    const writable = await audioFileHandle.createWritable();
    await writable.write(file);
    await writable.close();

    line.voiceLineFile = audioFileName;
    line.voiceLineBlob = file;

    renderMinigameDetails();
    autoSaveTrial();
  } catch (error) {
    console.error("Error saving audio:", error);
    alert(`Failed to save audio: ${error.message}`);
  }
}

async function clearPanicVoiceLine(gameId, groupId, speakerKey) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg || !mg.typeSpecific || !mg.typeSpecific.lineGroups) return;

  const group = mg.typeSpecific.lineGroups.find(g => g.groupId === groupId);
  if (!group || !group[speakerKey]) return;

  const line = group[speakerKey];

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

  line.voiceLineFile = null;
  line.voiceLineBlob = null;

  renderMinigameDetails();
  autoSaveTrial();
}

// Mass Panic Audio Playback
const panicAudioPlayers = {};

async function playPanicAudioPreview(gameId, groupId, speakerKey) {
  const playerKey = `${gameId}_${groupId}_${speakerKey}`;
  const player = panicAudioPlayers[playerKey];

  if (player && !player.paused) {
    player.pause();
    player.currentTime = 0;
    updatePanicPlayButton(groupId, speakerKey, false);
    return;
  }

  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg || !mg.typeSpecific || !mg.typeSpecific.lineGroups) return;

  const group = mg.typeSpecific.lineGroups.find(g => g.groupId === groupId);
  if (!group || !group[speakerKey]) return;

  const line = group[speakerKey];
  if (!line.voiceLineFile) return;

  let audioBlob = line.voiceLineBlob;
  if (!audioBlob) {
    try {
      const audioDir = await dirHandle.getDirectoryHandle("Audio", { create: false });
      const minigamesDir = await audioDir.getDirectoryHandle("Minigames", { create: false });
      const gameAudioDir = await minigamesDir.getDirectoryHandle(gameId, { create: false });
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

function updatePanicPlayButton(groupId, speakerKey, isPlaying) {
  const btn = document.getElementById(`panic-play-btn-${groupId}-${speakerKey}`);
  if (btn) {
    btn.innerHTML = isPlaying ? '⏸️ Pause' : '▶️ Play';
  }
}

function seekPanicAudio(gameId, groupId, speakerKey, value) {
  const playerKey = `${gameId}_${groupId}_${speakerKey}`;
  const audio = panicAudioPlayers[playerKey];
  if (audio && audio.duration) {
    audio.currentTime = (value / 100) * audio.duration;
  }
}

function updatePanicSeekBar(groupId, speakerKey, audio) {
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
