// Script editor view: the line list, line CRUD, and drag-to-reorder.
//
// The per-line character dropdown lives in components/characterSearchDropdown.js.
// The application bootstrap used to sit at the top of this file, which gave
// "where does the app start?" a two-file answer; it is in main.js now.
import { updateFloatingAddButton } from './components/floatingAddButton.js';
import { markFileDeleted } from './core/history.js';
import { removeEntry, reportFailedRemoval } from './core/fileOps.js';
import { dropAtGap, moveItem, reindexOrder } from './core/listOps.js';
import { state } from './core/state.js';
import { autoSaveTrial, scheduleAutoSave } from './core/storage.js';
import { confirmDialog } from './ui/dialogs.js';
import { generateId, escapeHtml } from './utils.js';
import { MINIGAME_TYPE_LABELS, SCRIPT_LINE_TYPE_LABELS } from './core/constants.js';
import { renderLabelOptions, renderOptions } from './ui/options.js';
import { hasCameraMotion, hasCustomBoxStyle, hasSpecialEffects } from './core/scriptLineFields.js';

import { setHtml } from './ui/dom.js';
import { registerActions } from './ui/actions.js';
import {
  filterCharacters,
  handleCharacterKeydown,
  openCharacterDropdown,
} from './components/characterSearchDropdown.js';

// The arrow buttons, the edit and delete buttons and the type select all sit
// inside the line bar, which selects the line when clicked. Innermost-wins
// replaces the `event.stopPropagation()` each of them used to carry, and the
// two text inputs use `data-stop-click` to claim a click and do nothing with
// it - typing must not select the line.
registerActions('click', {
  addScriptLine: () => addScriptLine(),
  clearSelection: () => clearSelection(),
  toggleLineSelection: (el, event) => toggleLineSelection(event, el.dataset.lineId),
  moveLineTop: (el) => moveLineTop(el.dataset.lineId),
  moveLineUp: (el) => moveLineUp(el.dataset.lineId),
  moveLineDown: (el) => moveLineDown(el.dataset.lineId),
  moveLineBottom: (el) => moveLineBottom(el.dataset.lineId),
  deleteScriptLine: (el) => deleteScriptLine(el.dataset.lineId),
});

registerActions('input', {
  filterScript: (el) => filterScript(el.value),
  filterCharacters: (el) => filterCharacters(el.dataset.lineId, el.value),
  updateScriptLine: (el) => updateScriptLine(el.dataset.lineId, el.dataset.field, el.value),
});

registerActions('change', {
  updateScriptLine: (el) => updateScriptLine(el.dataset.lineId, el.dataset.field, el.value),
  changeScriptLineType: (el) => changeScriptLineType(el.dataset.lineId, el.value),
});

registerActions('focus', {
  openCharacterDropdown: (el) => openCharacterDropdown(el.dataset.lineId),
});

registerActions('keydown', {
  handleCharacterKeydown: (el, event) => handleCharacterKeydown(el.dataset.lineId, event),
});

// Script lines carry their own drag state (multi-select, a drag ghost and a
// reorder animation), so these are app.js's own, not listDragReorder's.
registerActions('dragstart', {
  scriptDragStart: (el, event) => handleDragStart(event, el.dataset.lineId),
});
registerActions('dragend', { scriptDragEnd: (el, event) => handleDragEnd(event) });
registerActions('dragover', { scriptGapDragOver: (el, event) => handleGapDragOver(event) });
registerActions('dragleave', { scriptGapDragLeave: (el, event) => handleGapDragLeave(event) });
registerActions('drop', {
  scriptDropInGap: (el, event) => handleDropInGap(event, Number(el.dataset.insertPosition)),
});

export function renderScriptEditor() {
  const grid = document.getElementById('mainGrid');

  if (state.scriptLines.length === 0) {
    setHtml(
      grid,
      `
      <div id="scriptEditorContainer">
        <div class="script-empty-state">
          <div class="script-empty-icon">${window.icon('script', { size: 56 })}</div>
          <h2>No Script Lines Yet</h2>
          <p>Click the button below to add your first script line</p>
          <button class="btn btn-primary script-add-btn" data-on-click="addScriptLine">
            ${window.icon('plus')} Add Script Line
          </button>
        </div>
      </div>
    `
    );
  } else {
    // A drop zone before the first line, then one after every line.
    let linesHtml = '';

    linesHtml += `<div class="script-drop-zone" data-insert-position="0" data-on-dragover="scriptGapDragOver" data-on-drop="scriptDropInGap" data-on-dragleave="scriptGapDragLeave"></div>`;

    state.scriptLines.forEach((line, index) => {
      linesHtml += renderScriptLineBar(line, index);
      linesHtml += `<div class="script-drop-zone" data-insert-position="${index + 1}" data-on-dragover="scriptGapDragOver" data-on-drop="scriptDropInGap" data-on-dragleave="scriptGapDragLeave"></div>`;
    });

    const selCount = state.selectedLineIds.size;
    const hintHtml =
      selCount > 0
        ? `<span>${selCount} selected — drag any selected line to move them together.</span>
           <button class="script-hint-clear" data-on-click="clearSelection">Clear selection</button>`
        : `<span>Tip: Ctrl/Cmd-click lines to select several, then drag to reorder.</span>`;

    setHtml(
      grid,
      `
      <div id="scriptEditorContainer">
        <div class="script-header">
          <h2>Trial Script</h2>
          <div class="script-search">
            ${window.icon('search', { size: 16 })}
            <input type="text" id="scriptSearch" placeholder="Search lines…"
                   value="${escapeHtml(scriptFilter)}" data-on-input="filterScript"
                   spellcheck="false">
          </div>
        </div>
        <div class="script-hint">${hintHtml}</div>
        <div class="script-lines-container">
          ${linesHtml}
          <div class="script-no-matches" id="scriptNoMatches" style="display: none;">
            No lines match your search.
          </div>
        </div>
      </div>
    `
    );
  }

  applyScriptFilter();
  updateFloatingAddButton();
}

// --- Search / filter -------------------------------------------------------
// Toggles row visibility rather than re-rendering, so the box keeps focus.
let scriptFilter = '';

export function filterScript(value) {
  scriptFilter = value;
  applyScriptFilter();
}

function applyScriptFilter() {
  const container = document.querySelector('.script-lines-container');
  if (!container) return;

  const q = scriptFilter.trim().toLowerCase();
  container.classList.toggle('filtering', q.length > 0);

  let matches = 0;
  state.scriptLines.forEach((line) => {
    const bar = container.querySelector(`.script-line-bar[data-line-id="${line.id}"]`);
    if (!bar) return;
    const hidden = q.length > 0 && !lineMatchesQuery(line, q);
    bar.classList.toggle('filtered-out', hidden);
    if (!hidden) matches++;
  });

  const noMatches = document.getElementById('scriptNoMatches');
  if (noMatches) noMatches.style.display = q.length > 0 && matches === 0 ? 'block' : 'none';
}

// Matches speaker name, dialogue/narration text, and type label.
function lineMatchesQuery(line, q) {
  const parts = [line.type];
  if (line.type === 'speaking') {
    const c = state.cast.find((ch) => ch && ch.id === line.characterId);
    if (c) parts.push(`${c.name || ''} ${c.surname || ''}`);
    parts.push(line.dialogue || '');
  } else if (line.type === 'narrator') {
    parts.push(line.text || '');
  } else if (line.type === 'minigame') {
    const mg = state.minigames.find((m) => m.gameId === line.minigameId);
    if (mg) parts.push(mg.name || '');
  }
  return parts.join(' ').toLowerCase().includes(q);
}

export function moveLineTop(lineId) {
  if (!dropAtGap(state.scriptLines, 'id', [lineId], 0)) return;
  renderScriptEditor();
  autoSaveTrial();
}

export function moveLineBottom(lineId) {
  if (!dropAtGap(state.scriptLines, 'id', [lineId], state.scriptLines.length)) return;
  renderScriptEditor();
  autoSaveTrial();
}

export function addScriptLine() {
  const newLine = {
    id: generateId('line'),
    order: state.scriptLines.length,
    type: 'speaking',
    characterId: '',
    dialogue: '',
  };
  state.scriptLines.push(newLine);
  renderScriptEditor();
  autoSaveTrial();
}

export function toggleLineSelection(event, lineId) {
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault();
    if (state.selectedLineIds.has(lineId)) {
      state.selectedLineIds.delete(lineId);
    } else {
      state.selectedLineIds.add(lineId);
    }
    renderScriptEditor();
  }
}

export function clearSelection() {
  state.selectedLineIds.clear();
  renderScriptEditor();
}

// Dragging a selected line drags the whole selection; dragging any other
// line drops the selection and moves that line alone.
export function handleDragStart(event, lineId) {
  if (state.selectedLineIds.size > 0 && state.selectedLineIds.has(lineId)) {
    state.draggedLineIds = Array.from(state.selectedLineIds);
  } else {
    state.draggedLineIds = [lineId];
    state.selectedLineIds.clear();
  }

  event.target.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/html', event.target.innerHTML);

  createDragGhost(state.draggedLineIds);

  if (state.dragGhostElement) {
    event.dataTransfer.setDragImage(state.dragGhostElement, 0, 0);
  }
}

// Parked off-screen because setDragImage needs a rendered element.
export function createDragGhost(lineIds) {
  state.dragGhostElement = document.createElement('div');
  state.dragGhostElement.className = 'drag-ghost';

  if (lineIds.length === 1) {
    state.dragGhostElement.textContent = '1 line';
  } else {
    state.dragGhostElement.textContent = `${lineIds.length} lines`;
  }

  state.dragGhostElement.style.position = 'absolute';
  state.dragGhostElement.style.top = '-1000px';
  state.dragGhostElement.style.left = '-1000px';
  document.body.appendChild(state.dragGhostElement);
}

export function handleGapDragOver(event) {
  event.preventDefault(); // required to allow the drop
  event.dataTransfer.dropEffect = 'move';

  const gap = event.currentTarget;
  if (gap.classList.contains('script-drop-zone')) {
    gap.classList.add('drag-over-gap');
  }
}

export function handleGapDragLeave(event) {
  const gap = event.currentTarget;
  if (gap.classList.contains('script-drop-zone')) {
    gap.classList.remove('drag-over-gap');
  }
}

export function handleDropInGap(event, insertPosition) {
  event.preventDefault();
  event.stopPropagation();

  const changed = dropAtGap(state.scriptLines, 'id', state.draggedLineIds, insertPosition);
  if (!changed) {
    cleanupDrag();
    return;
  }

  document.querySelectorAll('.script-line-bar').forEach((el) => {
    el.classList.add('reordering');
  });

  // 300ms matches the .reordering transition in css/views/script-editor.css.
  setTimeout(() => {
    document.querySelectorAll('.script-line-bar').forEach((el) => {
      el.classList.remove('reordering');
    });
  }, 300);

  cleanupDrag();
  renderScriptEditor();
  autoSaveTrial();
}

export function handleDragEnd(event) {
  event.target.classList.remove('dragging');
  cleanupDrag();
}

export function cleanupDrag() {
  document.querySelectorAll('.drag-over').forEach((el) => {
    el.classList.remove('drag-over');
  });

  document.querySelectorAll('.drag-over-gap').forEach((el) => {
    el.classList.remove('drag-over-gap');
  });

  if (state.dragGhostElement && state.dragGhostElement.parentNode) {
    state.dragGhostElement.parentNode.removeChild(state.dragGhostElement);
  }
  state.dragGhostElement = null;

  state.selectedLineIds.clear();
  state.draggedLineIds = [];
}

export async function deleteScriptLine(lineId) {
  const line = state.scriptLines.find((l) => l.id === lineId);
  if (!line) return;

  const label = line.dialogue || line.text || 'this line';
  const confirmed = await confirmDialog({
    title: 'Delete script line',
    message:
      `Delete script line "${label}"? This also removes its voice audio, ` +
      'which cannot be undone.',
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return;

  // Orphaned audio would otherwise be bundled into every export.
  await removeLineAudioFile(line);

  state.scriptLines = state.scriptLines.filter((l) => l.id !== lineId);
  reindexOrder(state.scriptLines);
  renderScriptEditor();
  autoSaveTrial();
}

async function removeLineAudioFile(line) {
  if (!line.audioFile || !state.dirHandle) return;
  const audioDir = await state.dirHandle
    .getDirectoryHandle('Audio', { create: false })
    .catch(() => null);
  reportFailedRemoval(line.audioFile, await removeEntry(audioDir, line.audioFile));
  // Undo cannot bring the bytes back, so it must not step past this.
  markFileDeleted();
  // Cleared either way: the line no longer plays it, and leaving the name
  // behind would point at a file the author may have deleted by hand.
  line.audioFile = null;
}

export function moveLineUp(lineId) {
  if (!moveItem(state.scriptLines, 'id', lineId, -1)) return;
  renderScriptEditor();
  autoSaveTrial();
}

export function moveLineDown(lineId) {
  if (!moveItem(state.scriptLines, 'id', lineId, 1)) return;
  renderScriptEditor();
  autoSaveTrial();
}

export async function changeScriptLineType(lineId, newType) {
  const line = state.scriptLines.find((l) => l.id === lineId);
  if (!line) return;
  if (line.type === newType) return;

  // Switching type clears type-specific content, so confirm before losing it.
  const hasData = !!(
    (line.dialogue && line.dialogue.trim()) ||
    (line.text && line.text.trim()) ||
    line.characterId ||
    line.minigameId ||
    line.audioFile ||
    line.spriteIndex != null ||
    hasCameraMotion(line) ||
    (line.highlights && line.highlights.length) ||
    hasSpecialEffects(line) ||
    hasCustomBoxStyle(line)
  );
  if (hasData) {
    const proceed = await confirmDialog({
      title: 'Change line type',
      message: "This clears the line's current content and any advanced settings. Continue?",
      confirmLabel: 'Change type',
      danger: true,
    });
    if (!proceed) {
      renderScriptEditor();
      return;
    }
  }

  delete line.characterId;
  delete line.dialogue;
  delete line.text;
  delete line.minigameId;

  // Drop advanced properties the new type can't carry: a minigame trigger
  // keeps none, sprite/camera are speaking-only, and audio/highlights/effects
  // survive speaking<->narrator.
  if (newType === 'minigame') {
    await removeLineAudioFile(line);
    delete line.audioFile;
    delete line.highlights;
    delete line.specialEffects;
    delete line.dialogueBoxStyle;
  }
  if (newType !== 'speaking') {
    delete line.spriteIndex;
    delete line.cameraMotion;
  }

  line.type = newType;
  if (newType === 'speaking') {
    line.characterId = '';
    line.dialogue = '';
  } else if (newType === 'narrator') {
    line.text = '';
  } else if (newType === 'minigame') {
    line.minigameId = '';
  }

  renderScriptEditor();
  autoSaveTrial();
}

export function updateScriptLine(lineId, field, value) {
  const line = state.scriptLines.find((l) => l.id === lineId);
  if (!line) return;

  line[field] = value;
  // Fires on every keystroke of the dialogue inputs, so debounce the write.
  scheduleAutoSave();
}

export function renderScriptLineBar(line, index) {
  const lineNumber = index + 1;
  let contentHtml = '';

  if (line.type === 'speaking') {
    const selectedChar = state.cast.find((c) => c && c.id === line.characterId);
    const displayValue = selectedChar ? `${selectedChar.name} ${selectedChar.surname}` : '';

    contentHtml = `
      <div class="searchable-dropdown" data-stop-click>
        <input
          type="text"
          id="char-dropdown-input-${line.id}"
          class="searchable-dropdown-input"
          placeholder="Search character..."
          value="${escapeHtml(displayValue)}"
          data-line-id="${escapeHtml(line.id)}" data-on-focus="openCharacterDropdown"
          data-on-input="filterCharacters"
          data-on-keydown="handleCharacterKeydown"
        />
        <div id="char-dropdown-list-${line.id}" class="searchable-dropdown-list" style="display: none;"></div>
      </div>
      <textarea
        class="script-dialogue-input"
        rows="1"
        placeholder="Enter dialogue..."
        data-line-id="${escapeHtml(line.id)}" data-field="dialogue" data-on-input="updateScriptLine"
        data-stop-click
      >${escapeHtml(line.dialogue || '')}</textarea>
    `;
  } else if (line.type === 'narrator') {
    contentHtml = `
      <textarea
        class="script-narration-input"
        rows="1"
        placeholder="Enter narration text..."
        data-line-id="${escapeHtml(line.id)}" data-field="text" data-on-input="updateScriptLine"
        data-stop-click
      >${escapeHtml(line.text || '')}</textarea>
    `;
  } else if (line.type === 'minigame') {
    const minigameOptions = renderOptions(
      state.minigames.map((mg) => ({
        value: mg.gameId,
        label: mg.name,
        suffix: ` (${MINIGAME_TYPE_LABELS[mg.gameType] || mg.gameType})`,
      })),
      line.minigameId
    );

    contentHtml = `
      <select class="script-minigame-select" data-line-id="${escapeHtml(line.id)}" data-field="minigameId"
              data-on-change="updateScriptLine" data-stop-click>
        <option value="">Select a minigame…</option>
        ${minigameOptions}
        ${state.minigames.length === 0 ? '<option value="" disabled>No minigames yet — create one in the Minigames tab</option>' : ''}
      </select>
    `;
  }

  const isSelected = state.selectedLineIds.has(line.id);

  // Badges show which advanced properties a line carries without opening it.
  const badgeDefs = [];
  if (line.type === 'speaking' && line.spriteIndex != null)
    badgeDefs.push(['sprite', 'Sprite selected']);
  if (line.audioFile) badgeDefs.push(['volume', 'Voice audio']);
  if (line.highlights && line.highlights.length) badgeDefs.push(['highlight', 'Highlighted text']);
  if (line.type === 'speaking' && hasCameraMotion(line))
    badgeDefs.push(['camera', 'Camera motion']);
  if (hasSpecialEffects(line)) badgeDefs.push(['sparkles', 'Special effects']);
  if (hasCustomBoxStyle(line)) badgeDefs.push(['message', 'Custom box style']);
  const badgesHtml = badgeDefs.length
    ? `<div class="script-line-badges">${badgeDefs
        .map(
          ([ic, title]) =>
            `<span class="script-line-badge" title="${title}">${window.icon(ic, { size: 13 })}</span>`
        )
        .join('')}</div>`
    : '';

  return `
    <div class="script-line-bar ${isSelected ? 'selected' : ''}"
         data-line-id="${line.id}"
         draggable="true"
         data-line-id="${escapeHtml(line.id)}"
         data-on-dragstart="scriptDragStart"
         data-on-dragend="scriptDragEnd"
         data-on-click="toggleLineSelection">

      <div class="script-drag-handle">
        <div class="arrow-btn" data-line-id="${escapeHtml(line.id)}" data-on-click="moveLineTop" title="Move to top">${window.icon('chevronsUp', { size: 13 })}</div>
        <div class="arrow-btn arrow-up" data-line-id="${escapeHtml(line.id)}" data-on-click="moveLineUp" title="Move up">${window.icon('chevronUp', { size: 14 })}</div>
        <div class="arrow-btn arrow-down" data-line-id="${escapeHtml(line.id)}" data-on-click="moveLineDown" title="Move down">${window.icon('chevronDown', { size: 14 })}</div>
        <div class="arrow-btn" data-line-id="${escapeHtml(line.id)}" data-on-click="moveLineBottom" title="Move to bottom">${window.icon('chevronsDown', { size: 13 })}</div>
      </div>

      <div class="script-line-number">#${lineNumber}</div>

      <div class="script-line-content">
        ${contentHtml}
      </div>

      ${badgesHtml}

      <div class="script-line-type-select">
        <select data-line-id="${escapeHtml(line.id)}" data-on-change="changeScriptLineType" data-stop-click>
          ${renderLabelOptions(SCRIPT_LINE_TYPE_LABELS, line.type)}
        </select>
      </div>

      ${line.type === 'speaking' || line.type === 'narrator' ? `<button class="script-line-edit" data-line-id="${escapeHtml(line.id)}" data-on-click="openScriptLineModal" title="Edit advanced properties">${window.icon('edit', { size: 16 })}</button>` : ''}

      <button class="script-line-delete" data-line-id="${escapeHtml(line.id)}" data-on-click="deleteScriptLine" title="Delete line">${window.icon('trash', { size: 16 })}</button>
    </div>
  `;
}
