// Minigame list and common settings; each game type's body comes from its
// own module under views/minigames/.
import { state } from '../core/state.js';
import { autoSaveTrial } from '../core/storage.js';
import { confirmDialog } from '../ui/dialogs.js';
import { generateId, escapeHtml } from '../utils.js';
import { renderDebateScrumEditor } from './minigames/debateScrumEditor.js';
import { renderHangmansGambitEditor } from './minigames/hangmansGambitEditor.js';
import { renderLogicDiveEditor } from './minigames/logicDiveEditor.js';
import { renderMassPanicDebateEditor } from './minigames/massPanicDebateEditor.js';
import { renderNonstopDebateEditor } from './minigames/nonstopDebateEditor.js';
import { MINIGAME_TYPE_LABELS } from '../core/constants.js';
import { ensureTypeSpecific } from '../core/minigameDefaults.js';
import { setHtml } from '../ui/dom.js';
let expandedMinigameId = null;

export function findMinigame(gameId) {
  return state.minigames.find((mg) => mg.gameId === gameId);
}

export function renderMinigameDetails() {
  const grid = document.getElementById('mainGrid');

  if (state.minigames.length === 0) {
    setHtml(
      grid,
      `
      <div id="minigameDetailsContainer">
        <div class="script-empty-state">
          <div class="script-empty-icon">${window.icon('gamepad', { size: 56 })}</div>
          <h2>No Minigames Configured</h2>
          <p>Click the button below to create your first minigame instance</p>
          <button class="btn btn-primary script-add-btn" onclick="addMinigame()">
            ${window.icon('plus')} Create Minigame
          </button>
        </div>
      </div>
    `
    );
  } else {
    let minigamesHtml = state.minigames.map((mg, index) => renderMinigameCard(mg, index)).join('');

    setHtml(
      grid,
      `
      <div id="minigameDetailsContainer">
        <div class="script-header">
          <h2>Minigames</h2>
        </div>
        <div class="minigame-cards-container">
          ${minigamesHtml}
        </div>
      </div>
    `
    );
  }
}

export function renderMinigameCard(mg, index) {
  const isExpanded = expandedMinigameId === mg.gameId;

  const difficultyColors = {
    easy: 'var(--success)',
    medium: 'var(--warning)',
    hard: 'var(--error)',
  };

  let cardContent = `
    <div class="minigame-card ${isExpanded ? 'expanded' : ''}" data-minigame-id="${mg.gameId}">
      <div class="minigame-card-header" onclick="toggleMinigameExpand('${mg.gameId}')">
        <div class="minigame-info">
          <div class="minigame-name">${escapeHtml(mg.name || 'Unnamed Minigame')}</div>
          <div class="minigame-meta">
            <span class="minigame-type">${escapeHtml(MINIGAME_TYPE_LABELS[mg.gameType] || mg.gameType)}</span>
            <span class="minigame-difficulty" style="color: ${difficultyColors[mg.difficulty] || 'inherit'}">
              ${escapeHtml(mg.difficulty)}
            </span>
            <span class="minigame-time">${window.icon('timer', { size: 14 })} ${escapeHtml(mg.timeLimit)}s</span>
          </div>
        </div>

        <div class="minigame-card-actions">
          <button class="btn-icon" onclick="event.stopPropagation(); deleteMinigame('${mg.gameId}')" title="Delete minigame">${window.icon('trash', { size: 16 })}</button>
          <span class="expand-icon">${isExpanded ? window.icon('chevronDown', { size: 14 }) : window.icon('chevronRight', { size: 14 })}</span>
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

export function toggleMinigameExpand(gameId) {
  if (expandedMinigameId === gameId) {
    expandedMinigameId = null;
  } else {
    expandedMinigameId = gameId;
  }
  renderMinigameDetails();
}

// gameType -> its editor. The dropdown and the dispatch below are both built
// from this, so a type can never be offered as authorable without an editor to
// fill it in.
const MINIGAME_EDITORS = {
  nonstop_debate: renderNonstopDebateEditor,
  mass_panic_debate: renderMassPanicDebateEditor,
  logic_dive: renderLogicDiveEditor,
  hangmans_gambit: renderHangmansGambitEditor,
  debate_scrum: renderDebateScrumEditor,
};

// Every type MINIGAME_TYPE_LABELS declares, which is what trialSchema
// validates gameType against. The list used to hardcode five of the eight, so
// a minigame of one of the other three displayed "Nonstop Debate" as selected
// while the data said otherwise - a control actively misreporting the model,
// and editing anything else on that minigame could commit the wrong type.
//
// The three without an editor are shown and disabled rather than omitted: the
// author can see what the trial holds, but cannot newly author a type the
// editor cannot fill in.
export function renderGameTypeOptions(selectedType) {
  return Object.entries(MINIGAME_TYPE_LABELS)
    .map(([type, label]) => {
      const isSelected = selectedType === type;
      const hasEditor = Boolean(MINIGAME_EDITORS[type]);
      const attrs =
        (isSelected ? ' selected' : '') + (!hasEditor && !isSelected ? ' disabled' : '');
      const suffix = hasEditor ? '' : ' (no editor yet)';
      return `<option value="${type}"${attrs}>${escapeHtml(label + suffix)}</option>`;
    })
    .join('');
}

export function renderMinigameEditor(mg) {
  // Common settings
  let editorHtml = `
    <div class="minigame-editor-section">
      <h3>Common Settings</h3>

      <div class="form-group">
        <label>Question / Name</label>
        <input type="text"
               class="form-input"
               value="${escapeHtml(mg.name || '')}"
               onchange="updateMinigameField('${mg.gameId}', 'name', this.value)"
               placeholder="The question shown to the player">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Game Type</label>
          <select class="form-input" onchange="updateMinigameField('${mg.gameId}', 'gameType', this.value)">
            ${renderGameTypeOptions(mg.gameType)}
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
               value="${escapeHtml(mg.failComment || '')}"
               onchange="updateMinigameField('${mg.gameId}', 'failComment', this.value)"
               placeholder="Shown on the result card when the player fails this minigame">
      </div>
    </div>
  `;

  const renderTypeEditor = MINIGAME_EDITORS[mg.gameType];
  if (renderTypeEditor) {
    editorHtml += renderTypeEditor(mg);
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

export function updateMinigameField(gameId, field, value) {
  const mg = findMinigame(gameId);
  if (mg) {
    mg[field] = value;

    // A new game type needs its own typeSpecific shape seeded.
    if (field === 'gameType') {
      if (value === 'nonstop_debate' && !mg.typeSpecific) {
        mg.typeSpecific = { selectedBullets: [], dialogueLines: [] };
      } else if (value === 'logic_dive' && (!mg.typeSpecific || !mg.typeSpecific.questions)) {
        mg.typeSpecific = { questions: [] };
      } else if (
        value === 'hangmans_gambit' &&
        (!mg.typeSpecific || mg.typeSpecific.answerKey === undefined)
      ) {
        mg.typeSpecific = { answerKey: '' };
      } else if (value === 'debate_scrum' && (!mg.typeSpecific || !mg.typeSpecific.arguments)) {
        mg.typeSpecific = { arguments: [] };
      } else if (
        value === 'mass_panic_debate' &&
        (!mg.typeSpecific || !mg.typeSpecific.lineGroups)
      ) {
        mg.typeSpecific = {
          lineGroups: [],
          speaker1CharacterId: '',
          speaker2CharacterId: '',
          speaker3CharacterId: '',
        };
      }
      // Whatever the branches above left, the new type's remaining keys are
      // filled in here rather than by the editor's render function.
      ensureTypeSpecific(mg);
    }

    renderMinigameDetails();
    autoSaveTrial(); // deliberately not awaited; the UI is already updated
  }
}

export function addMinigame() {
  const newMinigame = {
    gameId: generateId('mg'),
    name: '',
    gameType: 'nonstop_debate',
    difficulty: 'medium',
    timeLimit: 60,
    typeSpecific: {
      selectedBullets: [],
      dialogueLines: [],
    },
  };
  state.minigames.push(newMinigame);
  expandedMinigameId = newMinigame.gameId; // Auto-expand new minigame
  renderMinigameDetails();
  autoSaveTrial();
}

export async function deleteMinigame(gameId) {
  const confirmed = await confirmDialog({
    title: 'Delete minigame',
    message:
      'Delete this minigame? This will also remove it from any script lines that reference it.',
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return;

  state.minigames = state.minigames.filter((mg) => mg.gameId !== gameId);

  state.scriptLines.forEach((line) => {
    if (line.type === 'minigame' && line.minigameId === gameId) {
      line.minigameId = '';
    }
  });

  renderMinigameDetails();
  autoSaveTrial();
}
