// Minigame list and common settings; each game type's body comes from its
// own module under views/minigames/.
import { state } from '../core/state.js';
import { autoSaveTrial } from '../core/storage.js';
import { confirmDialog, showToast } from '../ui/dialogs.js';
import { generateId, escapeHtml } from '../utils.js';
import { renderDebateScrumEditor } from './minigames/debateScrumEditor.js';
import { renderHangmansGambitEditor } from './minigames/hangmansGambitEditor.js';
import { renderLogicDiveEditor } from './minigames/logicDiveEditor.js';
import { renderMassPanicDebateEditor } from './minigames/massPanicDebateEditor.js';
import { renderNonstopDebateEditor } from './minigames/nonstopDebateEditor.js';
import { DIFFICULTY_LABELS, MINIGAME_TYPE_LABELS } from '../core/constants.js';
import { renderLabelOptions, renderOptions } from '../ui/options.js';
import { hasAuthoredContent, resetTypeSpecific } from '../core/minigameDefaults.js';
import { setHtml } from '../ui/dom.js';
import { registerActions } from '../ui/actions.js';

// The delete button sits inside the card header, which toggles the card, so
// the innermost-wins rule replaces its `event.stopPropagation()`.
registerActions('click', {
  addMinigame: () => addMinigame(),
  toggleMinigameExpand: (el) => toggleMinigameExpand(el.dataset.gameId),
  deleteMinigame: (el) => deleteMinigame(el.dataset.gameId),
});

registerActions('change', {
  updateMinigameField: (el) => updateMinigameField(el.dataset.gameId, el.dataset.field, el.value),
  updateMinigameTimeLimit: (el) => updateMinigameTimeLimit(el.dataset.gameId, el.value),
});
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
          <button class="btn btn-primary script-add-btn" data-on-click="addMinigame">
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
      <div class="minigame-card-header" data-game-id="${escapeHtml(mg.gameId)}"
           data-on-click="toggleMinigameExpand">
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
          <button class="btn-icon" data-game-id="${escapeHtml(mg.gameId)}"
                  data-on-click="deleteMinigame" title="Delete minigame">${window.icon('trash', { size: 16 })}</button>
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
  return renderOptions(
    Object.entries(MINIGAME_TYPE_LABELS).map(([type, label]) => {
      const hasEditor = Boolean(MINIGAME_EDITORS[type]);
      return { value: type, label, disabled: !hasEditor, suffix: hasEditor ? '' : ' (no editor yet)' };
    }),
    selectedType
  );
}

export function renderMinigameEditor(mg) {
  let editorHtml = `
    <div class="minigame-editor-section">
      <h3>Common Settings</h3>

      <div class="form-group">
        <label>Question / Name</label>
        <input type="text"
               class="form-input"
               value="${escapeHtml(mg.name || '')}"
               data-game-id="${escapeHtml(mg.gameId)}" data-field="name"
               data-on-change="updateMinigameField"
               placeholder="The question shown to the player">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Game Type</label>
          <select class="form-input" data-game-id="${escapeHtml(mg.gameId)}" data-field="gameType"
                  data-on-change="updateMinigameField">
            ${renderGameTypeOptions(mg.gameType)}
          </select>
        </div>

        <div class="form-group">
          <label>Difficulty</label>
          <select class="form-input" data-game-id="${escapeHtml(mg.gameId)}" data-field="difficulty"
                  data-on-change="updateMinigameField">
            ${renderLabelOptions(DIFFICULTY_LABELS, mg.difficulty)}
          </select>
        </div>

        <div class="form-group">
          <label>Time Limit (seconds)</label>
          <input type="number"
                 class="form-input"
                 value="${mg.timeLimit || 60}"
                 data-game-id="${escapeHtml(mg.gameId)}"
                 data-on-change="updateMinigameTimeLimit"
                 min="0" max="3600">
        </div>
      </div>

      <div class="form-group">
        <label>Fail Comment</label>
        <input type="text"
               class="form-input"
               value="${escapeHtml(mg.failComment || '')}"
               data-game-id="${escapeHtml(mg.gameId)}" data-field="failComment"
               data-on-change="updateMinigameField"
               placeholder="Shown on the result card when the player fails this minigame">
      </div>
    </div>
  `;

  const renderTypeEditor = MINIGAME_EDITORS[mg.gameType];
  if (renderTypeEditor) {
    editorHtml += renderTypeEditor(mg);
  } else {
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

export async function updateMinigameField(gameId, field, value) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  if (field === 'gameType') {
    await changeMinigameType(mg, value);
    return;
  }

  mg[field] = value;
  renderMinigameDetails();
  autoSaveTrial(); // deliberately not awaited; the UI is already updated
}

// parseInt('') is NaN, and JSON.stringify writes NaN as null - which the
// schema rejects and writeTrialJson only console.warns about. Both ends then
// substituted 60 silently: the engine falls back at parse time, and the field
// re-renders as `mg.timeLimit || 60`. So clearing the box intending to retype
// a number left an invalid trial.json that looked like it said 60.
//
// Rejected rather than defaulted, so the author sees the box snap back to the
// value that is actually stored instead of watching it become something they
// did not type. Same shape as dialogueBoxTab's borderThickness guard.
export function updateMinigameTimeLimit(gameId, raw) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const seconds = parseInt(raw, 10);
  if (isNaN(seconds) || seconds < 0 || seconds > 3600) {
    showToast('Time limit must be a whole number of seconds from 0 to 3600.', {
      type: 'warning',
    });
    renderMinigameDetails();
    return;
  }

  mg.timeLimit = seconds;
  renderMinigameDetails();
  autoSaveTrial();
}

// A gameType change replaces typeSpecific, so switching a nonstop debate to
// mass panic destroys every authored dialogue line. changeScriptLineType
// confirms for the exactly analogous case; this path used to do it silently.
//
// Cancelling re-renders so the dropdown snaps back to the real gameType,
// which is still what state holds.
async function changeMinigameType(mg, newType) {
  if (mg.gameType === newType) return;

  if (hasAuthoredContent(mg)) {
    const proceed = await confirmDialog({
      title: 'Change minigame type',
      message:
        `This clears everything authored for ${MINIGAME_TYPE_LABELS[mg.gameType] || mg.gameType}` +
        ' and starts the new type empty. Continue?',
      confirmLabel: 'Change type',
      danger: true,
    });
    if (!proceed) {
      renderMinigameDetails();
      return;
    }
  }

  mg.gameType = newType;
  resetTypeSpecific(mg);
  renderMinigameDetails();
  autoSaveTrial();
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
  expandedMinigameId = newMinigame.gameId;
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
