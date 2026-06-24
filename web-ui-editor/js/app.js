// Script editor view: renders the script line list and owns line CRUD plus
// drag-and-drop reordering. The per-line character search dropdown lives in
// components/characterSearchDropdown.js.
import { initCharacterSearchDropdown } from './components/characterSearchDropdown.js';
import { updateFloatingAddButton } from './components/floatingAddButton.js';
import { initSpriteMagnifier } from './components/spriteMagnifier.js';
import { dropAtGap, moveItem, reindexOrder } from './core/listOps.js';
import { state } from './core/state.js';
import { autoSaveTrial, scheduleAutoSave } from './core/storage.js';
import { confirmDialog } from './ui/dialogs.js';
import { initModalBehaviors } from './ui/modalBehaviors.js';
import { initKeyboardActivation } from './ui/a11y.js';
import { updateExportButtonState } from './export.js';
import { loadSettings } from './settings.js';
import { initializeTheme } from './ui/theme.js';
import { generateId, escapeHtml } from './utils.js';
import { renderActiveView } from './views/viewManager.js';
import { MINIGAME_TYPE_LABELS } from './core/constants.js';

// Initialize app
document.addEventListener('DOMContentLoaded', function () {
  initializeTheme();
  loadSettings();
  initSpriteMagnifier();
  initCharacterSearchDropdown();
  initModalBehaviors();
  initKeyboardActivation();
  renderActiveView();

  // Trial name input handler
  document.getElementById('trialNameInput').addEventListener('input', (e) => {
    state.trialName = e.target.value.trim();
    updateExportButtonState();
    scheduleAutoSave();
  });
});

// Script Editor functions
export function renderScriptEditor() {
  const grid = document.getElementById('mainGrid');

  if (state.scriptLines.length === 0) {
    // Empty state
    grid.innerHTML = `
      <div id="scriptEditorContainer">
        <div class="script-empty-state">
          <div class="script-empty-icon">${window.icon('script', { size: 56 })}</div>
          <h2>No Script Lines Yet</h2>
          <p>Click the button below to add your first script line</p>
          <button class="btn btn-primary script-add-btn" onclick="addScriptLine()">
            ${window.icon('plus')} Add Script Line
          </button>
        </div>
      </div>
    `;
  } else {
    // Render script lines with drop zones between them
    let linesHtml = '';

    // Add drop zone at the top (before first line)
    linesHtml += `<div class="script-drop-zone" data-insert-position="0" ondragover="handleGapDragOver(event)" ondrop="handleDropInGap(event, 0)" ondragleave="handleGapDragLeave(event)"></div>`;

    // Add each line with a drop zone after it
    state.scriptLines.forEach((line, index) => {
      linesHtml += renderScriptLineBar(line, index);
      linesHtml += `<div class="script-drop-zone" data-insert-position="${index + 1}" ondragover="handleGapDragOver(event)" ondrop="handleDropInGap(event, ${index + 1})" ondragleave="handleGapDragLeave(event)"></div>`;
    });

    const selCount = state.selectedLineIds.size;
    const hintHtml =
      selCount > 0
        ? `<span>${selCount} selected — drag any selected line to move them together.</span>
           <button class="script-hint-clear" onclick="clearSelection()">Clear selection</button>`
        : `<span>Tip: Ctrl/Cmd-click lines to select several, then drag to reorder.</span>`;

    grid.innerHTML = `
      <div id="scriptEditorContainer">
        <div class="script-header">
          <h2>Trial Script</h2>
          <div class="script-search">
            ${window.icon('search', { size: 16 })}
            <input type="text" id="scriptSearch" placeholder="Search lines…"
                   value="${escapeHtml(scriptFilter)}" oninput="filterScript(this.value)"
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
    `;
  }

  // Re-apply any active search filter to the freshly rendered rows.
  applyScriptFilter();

  // Update floating add button
  updateFloatingAddButton();
}

// --- Search / filter -------------------------------------------------------
// Filter is applied by toggling row visibility (not re-rendering) so the
// search box keeps focus and caret position while typing.
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

// Match against the speaker name, dialogue/narration text, and type label.
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

// Multi-select functions
export function toggleLineSelection(event, lineId) {
  // Ctrl+Click or Cmd+Click to multi-select
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault();
    if (state.selectedLineIds.has(lineId)) {
      state.selectedLineIds.delete(lineId);
    } else {
      state.selectedLineIds.add(lineId);
    }
    renderScriptEditor(); // Re-render to show selection
  }
}

export function clearSelection() {
  state.selectedLineIds.clear();
  renderScriptEditor();
}

// Drag-and-drop event handlers
export function handleDragStart(event, lineId) {
  // Check if this line is part of a selection
  if (state.selectedLineIds.size > 0 && state.selectedLineIds.has(lineId)) {
    // Dragging multiple selected lines
    state.draggedLineIds = Array.from(state.selectedLineIds);
  } else {
    // Dragging single line
    state.draggedLineIds = [lineId];
    state.selectedLineIds.clear();
  }

  event.target.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/html', event.target.innerHTML);

  // Create ghost element for visual preview
  createDragGhost(state.draggedLineIds);

  // Set custom drag image
  if (state.dragGhostElement) {
    event.dataTransfer.setDragImage(state.dragGhostElement, 0, 0);
  }
}

export function createDragGhost(lineIds) {
  // Create a ghost element showing what's being dragged
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
  event.preventDefault(); // Allow drop
  event.dataTransfer.dropEffect = 'move';

  // Add visual feedback to the gap
  const gap = event.currentTarget;
  if (gap.classList.contains('script-drop-zone')) {
    gap.classList.add('drag-over-gap');
  }
}

export function handleGapDragLeave(event) {
  // Remove visual feedback when leaving the gap
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

  // Add animation class for smooth transition
  document.querySelectorAll('.script-line-bar').forEach((el) => {
    el.classList.add('reordering');
  });

  // Remove animation class after transition
  setTimeout(() => {
    document.querySelectorAll('.script-line-bar').forEach((el) => {
      el.classList.remove('reordering');
    });
  }, 300);

  // Clean up and re-render
  cleanupDrag();
  renderScriptEditor();
  autoSaveTrial();
}

export function handleDragEnd(event) {
  event.target.classList.remove('dragging');
  cleanupDrag();
}

export function cleanupDrag() {
  // Clean up all visual feedback
  document.querySelectorAll('.drag-over').forEach((el) => {
    el.classList.remove('drag-over');
  });

  document.querySelectorAll('.drag-over-gap').forEach((el) => {
    el.classList.remove('drag-over-gap');
  });

  // Remove ghost element
  if (state.dragGhostElement && state.dragGhostElement.parentNode) {
    state.dragGhostElement.parentNode.removeChild(state.dragGhostElement);
  }
  state.dragGhostElement = null;

  // Clear selection after successful drag
  state.selectedLineIds.clear();
  state.draggedLineIds = [];
}

export async function deleteScriptLine(lineId) {
  const line = state.scriptLines.find((l) => l.id === lineId);
  if (!line) return;

  const label = line.dialogue || line.text || 'this line';
  const confirmed = await confirmDialog({
    title: 'Delete script line',
    message: `Delete script line "${label}"? This also removes its voice audio.`,
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return;

  // Remove the line's voice audio so the trial folder doesn't accumulate
  // orphaned files that would be bundled into every export.
  await removeLineAudioFile(line);

  state.scriptLines = state.scriptLines.filter((l) => l.id !== lineId);
  reindexOrder(state.scriptLines);
  renderScriptEditor();
  autoSaveTrial();
}

// Delete a script line's audio file from the trial folder, if any.
async function removeLineAudioFile(line) {
  if (!line.audioFile || !state.dirHandle) return;
  try {
    const audioDir = await state.dirHandle.getDirectoryHandle('Audio', { create: false });
    await audioDir.removeEntry(line.audioFile);
  } catch (e) {
    console.warn('Could not remove audio file:', e);
  }
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

  // Switching type clears type-specific content and settings. Confirm first if
  // the line actually has something to lose, and re-render to restore the
  // dropdown if the user backs out.
  const hasData = !!(
    (line.dialogue && line.dialogue.trim()) ||
    (line.text && line.text.trim()) ||
    line.characterId ||
    line.minigameId ||
    line.audioFile ||
    line.spriteIndex != null ||
    line.cameraMotion ||
    (line.highlights && line.highlights.length) ||
    (line.specialEffects && line.specialEffects.length) ||
    line.dialogueBoxStyle
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

  // Clear type-specific fields
  delete line.characterId;
  delete line.dialogue;
  delete line.text;
  delete line.minigameId;

  // Clear advanced properties that no longer apply, so stale data never
  // reaches trial.json. Audio/highlights/effects are valid for both spoken
  // and narrated lines, but nothing carries over to a minigame trigger, and
  // sprite/camera settings are speaking-only.
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

  // Set new type and initialize fields
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
  // Fires on every keystroke of the dialogue inputs - debounce the write.
  scheduleAutoSave();
}

export function renderScriptLineBar(line, index) {
  const lineNumber = index + 1;
  let contentHtml = '';

  // Generate content based on type
  if (line.type === 'speaking') {
    // Get selected character name for display
    const selectedChar = state.cast.find((c) => c && c.id === line.characterId);
    const displayValue = selectedChar ? `${selectedChar.name} ${selectedChar.surname}` : '';

    contentHtml = `
      <div class="searchable-dropdown" onclick="event.stopPropagation()">
        <input
          type="text"
          id="char-dropdown-input-${line.id}"
          class="searchable-dropdown-input"
          placeholder="Search character..."
          value="${escapeHtml(displayValue)}"
          onfocus="openCharacterDropdown('${line.id}')"
          oninput="filterCharacters('${line.id}', this.value)"
          onkeydown="handleCharacterKeydown('${line.id}', event)"
        />
        <div id="char-dropdown-list-${line.id}" class="searchable-dropdown-list" style="display: none;"></div>
      </div>
      <textarea
        class="script-dialogue-input"
        rows="1"
        placeholder="Enter dialogue..."
        oninput="updateScriptLine('${line.id}', 'dialogue', this.value)"
        onclick="event.stopPropagation()"
      >${escapeHtml(line.dialogue || '')}</textarea>
    `;
  } else if (line.type === 'narrator') {
    contentHtml = `
      <textarea
        class="script-narration-input"
        rows="1"
        placeholder="Enter narration text..."
        oninput="updateScriptLine('${line.id}', 'text', this.value)"
        onclick="event.stopPropagation()"
      >${escapeHtml(line.text || '')}</textarea>
    `;
  } else if (line.type === 'minigame') {
    const minigameOptions = state.minigames
      .map((mg) => {
        return `<option value="${mg.gameId}" ${line.minigameId === mg.gameId ? 'selected' : ''}>
        ${escapeHtml(mg.name)} (${MINIGAME_TYPE_LABELS[mg.gameType] || mg.gameType})
      </option>`;
      })
      .join('');

    contentHtml = `
      <select class="script-minigame-select" onchange="updateScriptLine('${line.id}', 'minigameId', this.value)" onclick="event.stopPropagation()">
        <option value="">Select a minigame…</option>
        ${minigameOptions}
        ${state.minigames.length === 0 ? '<option value="" disabled>No minigames yet — create one in the Minigames tab</option>' : ''}
      </select>
    `;
  }

  const isSelected = state.selectedLineIds.has(line.id);

  // Badges advertise which advanced properties this line carries, so authors
  // can see at a glance what's configured without opening the editor.
  const badgeDefs = [];
  if (line.type === 'speaking' && line.spriteIndex != null)
    badgeDefs.push(['sprite', 'Sprite selected']);
  if (line.audioFile) badgeDefs.push(['volume', 'Voice audio']);
  if (line.highlights && line.highlights.length) badgeDefs.push(['highlight', 'Highlighted text']);
  if (line.type === 'speaking' && line.cameraMotion) badgeDefs.push(['camera', 'Camera motion']);
  if (line.specialEffects && line.specialEffects.length)
    badgeDefs.push(['sparkles', 'Special effects']);
  if (line.dialogueBoxStyle) badgeDefs.push(['message', 'Custom box style']);
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
         ondragstart="handleDragStart(event, '${line.id}')"
         ondragend="handleDragEnd(event)"
         onclick="toggleLineSelection(event, '${line.id}')">

      <div class="script-drag-handle">
        <div class="arrow-btn" onclick="event.stopPropagation(); moveLineTop('${line.id}')" title="Move to top">${window.icon('chevronsUp', { size: 13 })}</div>
        <div class="arrow-btn arrow-up" onclick="event.stopPropagation(); moveLineUp('${line.id}')" title="Move up">${window.icon('chevronUp', { size: 14 })}</div>
        <div class="arrow-btn arrow-down" onclick="event.stopPropagation(); moveLineDown('${line.id}')" title="Move down">${window.icon('chevronDown', { size: 14 })}</div>
        <div class="arrow-btn" onclick="event.stopPropagation(); moveLineBottom('${line.id}')" title="Move to bottom">${window.icon('chevronsDown', { size: 13 })}</div>
      </div>

      <div class="script-line-number">#${lineNumber}</div>

      <div class="script-line-content">
        ${contentHtml}
      </div>

      ${badgesHtml}

      <div class="script-line-type-select">
        <select onchange="changeScriptLineType('${line.id}', this.value)" onclick="event.stopPropagation()">
          <option value="speaking" ${line.type === 'speaking' ? 'selected' : ''}>Speaking</option>
          <option value="narrator" ${line.type === 'narrator' ? 'selected' : ''}>Narrator</option>
          <option value="minigame" ${line.type === 'minigame' ? 'selected' : ''}>Minigame</option>
        </select>
      </div>

      ${line.type === 'speaking' || line.type === 'narrator' ? `<button class="script-line-edit" onclick="event.stopPropagation(); openScriptLineModal('${line.id}')" title="Edit advanced properties">${window.icon('edit', { size: 16 })}</button>` : ''}

      <button class="script-line-delete" onclick="event.stopPropagation(); deleteScriptLine('${line.id}')" title="Delete line">${window.icon('trash', { size: 16 })}</button>
    </div>
  `;
}
