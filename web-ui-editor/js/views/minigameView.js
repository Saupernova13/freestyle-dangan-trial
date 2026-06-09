// Minigame view coordinator - delegates to specific minigame editor modules
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

      <div class="form-group">
        <label>Fail Comment</label>
        <input type="text"
               class="form-input"
               value="${mg.failComment || ''}"
               onchange="updateMinigameField('${mg.gameId}', 'failComment', this.value)"
               placeholder="Shown on the result card when the player fails this minigame">
      </div>
    </div>
  `;

  // Type-specific settings - delegate to module functions
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
      } else if (value === 'mass_panic_debate' && (!mg.typeSpecific || !mg.typeSpecific.lineGroups)) {
        mg.typeSpecific = { lineGroups: [], speaker1CharacterId: "", speaker2CharacterId: "", speaker3CharacterId: "" };
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
