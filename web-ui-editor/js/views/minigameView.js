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
        <div class="minigame-id-badge">${mg.gameId}</div>

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
        <label>Minigame Name</label>
        <input type="text"
               class="form-input"
               value="${mg.name || ''}"
               onchange="updateMinigameField('${mg.gameId}', 'name', this.value)"
               placeholder="Enter minigame name">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Game Type</label>
          <select class="form-input" onchange="updateMinigameField('${mg.gameId}', 'gameType', this.value)">
            <option value="nonstop_debate" ${mg.gameType === 'nonstop_debate' ? 'selected' : ''}>Nonstop Debate</option>
            <option value="mass_panic_debate" ${mg.gameType === 'mass_panic_debate' ? 'selected' : ''}>Mass Panic Debate</option>
            <option value="logic_dive" ${mg.gameType === 'logic_dive' ? 'selected' : ''}>Logic Dive</option>
            <option value="hangmans_gambit" ${mg.gameType === 'hangmans_gambit' ? 'selected' : ''}>Hangman's Gambit</option>
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
  }

  return editorHtml;
}

function updateMinigameField(gameId, field, value) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (mg) {
    mg[field] = value;
    autoSaveTrial();
    renderMinigameDetails(); // Re-render to show updated values
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
      <button class="btn btn-primary" onclick="addDialogueLine('${mg.gameId}')"
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
    dialogueLines.sort((a, b) => a.order - b.order).forEach((line, index) => {
      html += renderDialogueLineEditor(mg.gameId, line, index);
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

  autoSaveTrial();
  renderMinigameDetails();
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
    isCorrect: false,
    textEffect: "normal",
    textMovementDirection: "left_to_right",
    userFailedComment: "",
    userWrongAnswerComment: "",
    textFont: "default",
    characterSpotlight: "",
    characterId: "",
    voiceLineFile: null
  };

  mg.typeSpecific.dialogueLines.push(newLine);
  autoSaveTrial();
  renderMinigameDetails();
}

function renderDialogueLineEditor(gameId, line, index) {
  const fullSentence = `${line.sentenceBeginning || ''}${line.target || ''}${line.sentenceEnd || ''}`;
  const character = cast.find(c => c && c.id === line.characterId);
  const characterName = character ? `${character.name} ${character.surname}` : 'No character';

  return `
    <div class="dialogue-line-card ${line.isCorrect ? 'correct-target' : ''}" data-line-id="${line.lineId}">
      <div class="dialogue-line-header">
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
            <label>
              <input type="checkbox"
                     ${line.isCorrect ? 'checked' : ''}
                     onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'isCorrect', this.checked)">
              Is Correct Target
            </label>
          </div>

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
            <label>Movement Direction</label>
            <select class="form-input" onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'textMovementDirection', this.value)">
              <option value="left_to_right" ${line.textMovementDirection === 'left_to_right' ? 'selected' : ''}>Left to Right</option>
              <option value="right_to_left" ${line.textMovementDirection === 'right_to_left' ? 'selected' : ''}>Right to Left</option>
            </select>
          </div>

          <div class="form-group">
            <label>Character</label>
            <select class="form-input" onchange="updateDialogueLine('${gameId}', '${line.lineId}', 'characterId', this.value)">
              <option value="">None</option>
              ${cast.filter(c => c).map(c => `
                <option value="${c.id}" ${line.characterId === c.id ? 'selected' : ''}>${c.name} ${c.surname}</option>
              `).join('')}
            </select>
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
    autoSaveTrial();
    renderMinigameDetails();
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

  autoSaveTrial();
  renderMinigameDetails();
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
