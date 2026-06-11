// Main application initialization
// (Constants and state are now in separate files)

// Searchable dropdown state
let activeDropdownLineId = null;
let filteredCharacters = [];
let highlightedIndex = -1;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  initializeTheme();
  loadSettings();
  initSpriteMagnifier();
  renderActiveView();

  // Trial name input handler
  document.getElementById('trialNameInput').addEventListener('input', e => {
    trialName = e.target.value.trim();
    autoSaveTrial();
  });

  // Click outside to close dropdown
  document.addEventListener('click', function(e) {
    // Check if click is outside any searchable dropdown
    if (!e.target.closest('.searchable-dropdown') && activeDropdownLineId) {
      closeCharacterDropdown(activeDropdownLineId);
    }
  });
});

// Script Editor functions
function renderScriptEditor() {
  const grid = document.getElementById('mainGrid');

  if (scriptLines.length === 0) {
    // Empty state
    grid.innerHTML = `
      <div id="scriptEditorContainer">
        <div class="script-empty-state">
          <div class="script-empty-icon">📝</div>
          <h2>No Script Lines Yet</h2>
          <p>Click the button below to add your first script line</p>
          <button class="btn btn-primary script-add-btn" onclick="addScriptLine()">
            ➕ Add Script Line
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
    scriptLines.forEach((line, index) => {
      linesHtml += renderScriptLineBar(line, index);
      linesHtml += `<div class="script-drop-zone" data-insert-position="${index + 1}" ondragover="handleGapDragOver(event)" ondrop="handleDropInGap(event, ${index + 1})" ondragleave="handleGapDragLeave(event)"></div>`;
    });

    grid.innerHTML = `
      <div id="scriptEditorContainer">
        <div class="script-header">
          <h2>Trial Script</h2>
        </div>
        <div class="script-lines-container">
          ${linesHtml}
        </div>
      </div>
    `;
  }

  // Update floating add button
  updateFloatingAddButton();
}

function addScriptLine() {
  const newLine = {
    id: `line_${Date.now()}`,
    order: scriptLines.length,
    type: "speaking",
    characterId: "",
    dialogue: ""
  };
  scriptLines.push(newLine);
  renderScriptEditor();
  autoSaveTrial();
}

// Multi-select functions
function toggleLineSelection(event, lineId) {
  // Ctrl+Click or Cmd+Click to multi-select
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault();
    if (selectedLineIds.has(lineId)) {
      selectedLineIds.delete(lineId);
    } else {
      selectedLineIds.add(lineId);
    }
    renderScriptEditor();  // Re-render to show selection
  }
}

function clearSelection() {
  selectedLineIds.clear();
  renderScriptEditor();
}

// Drag-and-drop event handlers
function handleDragStart(event, lineId) {
  // Check if this line is part of a selection
  if (selectedLineIds.size > 0 && selectedLineIds.has(lineId)) {
    // Dragging multiple selected lines
    draggedLineIds = Array.from(selectedLineIds);
  } else {
    // Dragging single line
    draggedLineIds = [lineId];
    selectedLineIds.clear();
  }

  event.target.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/html', event.target.innerHTML);

  // Create ghost element for visual preview
  createDragGhost(draggedLineIds);

  // Set custom drag image
  if (dragGhostElement) {
    event.dataTransfer.setDragImage(dragGhostElement, 0, 0);
  }
}

function createDragGhost(lineIds) {
  // Create a ghost element showing what's being dragged
  dragGhostElement = document.createElement('div');
  dragGhostElement.className = 'drag-ghost';

  if (lineIds.length === 1) {
    dragGhostElement.textContent = '1 line';
  } else {
    dragGhostElement.textContent = `${lineIds.length} lines`;
  }

  dragGhostElement.style.position = 'absolute';
  dragGhostElement.style.top = '-1000px';
  dragGhostElement.style.left = '-1000px';
  document.body.appendChild(dragGhostElement);
}

function handleGapDragOver(event) {
  event.preventDefault();  // Allow drop
  event.dataTransfer.dropEffect = 'move';

  // Add visual feedback to the gap
  const gap = event.currentTarget;
  if (gap.classList.contains('script-drop-zone')) {
    gap.classList.add('drag-over-gap');
  }
}

function handleGapDragLeave(event) {
  // Remove visual feedback when leaving the gap
  const gap = event.currentTarget;
  if (gap.classList.contains('script-drop-zone')) {
    gap.classList.remove('drag-over-gap');
  }
}

function handleDropInGap(event, insertPosition) {
  event.preventDefault();
  event.stopPropagation();

  // Get the lines being dragged
  const draggedLines = draggedLineIds.map(id =>
    scriptLines.find(l => l.id === id)
  ).filter(Boolean);

  if (draggedLines.length === 0) {
    cleanupDrag();
    return;
  }

  // Calculate the indices of dragged lines
  const draggedIndices = draggedLineIds
    .map(id => scriptLines.findIndex(l => l.id === id))
    .filter(idx => idx !== -1)
    .sort((a, b) => a - b);  // Sort ascending for position calculation

  // Check if we're dropping in the same position (no-op)
  // The dragged block starts at draggedIndices[0] and ends at draggedIndices[draggedIndices.length - 1]
  if (insertPosition >= draggedIndices[0] && insertPosition <= draggedIndices[draggedIndices.length - 1] + 1) {
    cleanupDrag();
    return;
  }

  // Remove dragged lines from array (in reverse order to preserve indices)
  const draggedIndicesSorted = [...draggedIndices].sort((a, b) => b - a);
  draggedIndicesSorted.forEach(idx => {
    scriptLines.splice(idx, 1);
  });

  // Adjust insert position based on how many lines were removed before it
  let adjustedPosition = insertPosition;
  for (let idx of draggedIndices) {
    if (idx < insertPosition) {
      adjustedPosition--;
    }
  }

  // Insert dragged lines at the new position
  scriptLines.splice(adjustedPosition, 0, ...draggedLines);

  // Update order field for all lines
  scriptLines.forEach((line, index) => {
    line.order = index;
  });

  // Add animation class for smooth transition
  document.querySelectorAll('.script-line-bar').forEach(el => {
    el.classList.add('reordering');
  });

  // Remove animation class after transition
  setTimeout(() => {
    document.querySelectorAll('.script-line-bar').forEach(el => {
      el.classList.remove('reordering');
    });
  }, 300);

  // Clean up and re-render
  cleanupDrag();
  renderScriptEditor();
  autoSaveTrial();
}

function handleDragEnd(event) {
  event.target.classList.remove('dragging');
  cleanupDrag();
}

function cleanupDrag() {
  // Clean up all visual feedback
  document.querySelectorAll('.drag-over').forEach(el => {
    el.classList.remove('drag-over');
  });

  document.querySelectorAll('.drag-over-gap').forEach(el => {
    el.classList.remove('drag-over-gap');
  });

  // Remove ghost element
  if (dragGhostElement && dragGhostElement.parentNode) {
    dragGhostElement.parentNode.removeChild(dragGhostElement);
  }
  dragGhostElement = null;

  // Clear selection after successful drag
  selectedLineIds.clear();
  draggedLineIds = [];
}

function deleteScriptLine(lineId) {
  scriptLines = scriptLines.filter(line => line.id !== lineId);
  // Reorder remaining lines
  scriptLines.forEach((line, index) => {
    line.order = index;
  });
  renderScriptEditor();
  autoSaveTrial();
}

function moveLineUp(lineId) {
  const currentIndex = scriptLines.findIndex(l => l.id === lineId);
  if (currentIndex <= 0) return; // Already at top

  // Swap with previous line
  const temp = scriptLines[currentIndex];
  scriptLines[currentIndex] = scriptLines[currentIndex - 1];
  scriptLines[currentIndex - 1] = temp;

  // Update order fields
  scriptLines.forEach((line, index) => {
    line.order = index;
  });

  renderScriptEditor();
  autoSaveTrial();
}

function moveLineDown(lineId) {
  const currentIndex = scriptLines.findIndex(l => l.id === lineId);
  if (currentIndex === -1 || currentIndex >= scriptLines.length - 1) return; // Already at bottom

  // Swap with next line
  const temp = scriptLines[currentIndex];
  scriptLines[currentIndex] = scriptLines[currentIndex + 1];
  scriptLines[currentIndex + 1] = temp;

  // Update order fields
  scriptLines.forEach((line, index) => {
    line.order = index;
  });

  renderScriptEditor();
  autoSaveTrial();
}

function changeScriptLineType(lineId, newType) {
  const line = scriptLines.find(l => l.id === lineId);
  if (!line) return;

  // Clear type-specific fields
  delete line.characterId;
  delete line.dialogue;
  delete line.text;
  delete line.minigameId;

  // Set new type and initialize fields
  line.type = newType;
  if (newType === "speaking") {
    line.characterId = "";
    line.dialogue = "";
  } else if (newType === "narrator") {
    line.text = "";
  } else if (newType === "minigame") {
    line.minigameId = "";
  }

  renderScriptEditor();
  autoSaveTrial();
}

function updateScriptLine(lineId, field, value) {
  const line = scriptLines.find(l => l.id === lineId);
  if (!line) return;

  line[field] = value;
  autoSaveTrial();
}

// Searchable dropdown helper functions
function openCharacterDropdown(lineId) {
  // Close any open dropdown first
  if (activeDropdownLineId && activeDropdownLineId !== lineId) {
    closeCharacterDropdown(activeDropdownLineId);
  }

  activeDropdownLineId = lineId;
  highlightedIndex = -1;

  // Initialize with all characters
  filteredCharacters = cast.filter(c => c !== null);

  // Render the dropdown list
  renderCharacterDropdownList(lineId);
}

function closeCharacterDropdown(lineId) {
  const listEl = document.getElementById(`char-dropdown-list-${lineId}`);
  if (listEl) {
    listEl.style.display = 'none';
  }

  if (activeDropdownLineId === lineId) {
    activeDropdownLineId = null;
    filteredCharacters = [];
    highlightedIndex = -1;
  }
}

function filterCharacters(lineId, searchTerm) {
  const characters = cast.filter(c => c !== null);
  const term = searchTerm.toLowerCase().trim();

  if (term === '') {
    filteredCharacters = characters;
  } else {
    filteredCharacters = characters.filter(c => {
      const fullName = `${c.name} ${c.surname}`.toLowerCase();
      return fullName.includes(term);
    });
  }

  highlightedIndex = filteredCharacters.length > 0 ? 0 : -1;
  renderCharacterDropdownList(lineId);
}

function handleCharacterKeydown(lineId, event) {
  const listEl = document.getElementById(`char-dropdown-list-${lineId}`);

  // Only handle if dropdown is open
  if (!listEl || listEl.style.display === 'none') {
    return;
  }

  switch(event.key) {
    case 'ArrowDown':
      event.preventDefault();
      if (highlightedIndex < filteredCharacters.length - 1) {
        highlightedIndex++;
        updateDropdownHighlighting(lineId);
        scrollToHighlighted(lineId);
      }
      break;

    case 'ArrowUp':
      event.preventDefault();
      if (highlightedIndex > 0) {
        highlightedIndex--;
        updateDropdownHighlighting(lineId);
        scrollToHighlighted(lineId);
      }
      break;

    case 'Enter':
      event.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredCharacters.length) {
        const character = filteredCharacters[highlightedIndex];
        selectCharacterFromDropdown(lineId, character.id);
      }
      break;

    case 'Escape':
      event.preventDefault();
      closeCharacterDropdown(lineId);
      break;
  }
}

function selectCharacterFromDropdown(lineId, characterId) {
  updateScriptLine(lineId, 'characterId', characterId);
  closeCharacterDropdown(lineId);

  // Update the input value to show selected character
  const selectedChar = cast.find(c => c && c.id === characterId);
  if (selectedChar) {
    const inputEl = document.getElementById(`char-dropdown-input-${lineId}`);
    if (inputEl) {
      inputEl.value = `${selectedChar.name} ${selectedChar.surname}`;
    }
  }
}

function renderCharacterDropdownList(lineId) {
  const listEl = document.getElementById(`char-dropdown-list-${lineId}`);
  if (!listEl) return;

  if (filteredCharacters.length === 0) {
    listEl.innerHTML = '<div class="searchable-dropdown-item" style="cursor: default; opacity: 0.6;">No characters found</div>';
    listEl.style.display = 'block';
    return;
  }

  const line = scriptLines.find(l => l.id === lineId);
  const selectedCharId = line ? line.characterId : '';

  const itemsHtml = filteredCharacters.map((c, idx) => {
    const isSelected = c.id === selectedCharId;
    const isHighlighted = idx === highlightedIndex;
    const classes = ['searchable-dropdown-item'];
    if (isSelected) classes.push('selected');
    if (isHighlighted) classes.push('highlighted');

    return `
      <div class="${classes.join(' ')}"
           data-char-id="${c.id}"
           data-char-index="${idx}">
        ${c.name} ${c.surname} (${c.isHeadmaster ? 'Headmaster' : 'Student'})
      </div>
    `;
  }).join('');

  listEl.innerHTML = itemsHtml;
  listEl.style.display = 'block';

  // Attach event delegation for clicks and hover
  attachDropdownEventHandlers(lineId);
}

function attachDropdownEventHandlers(lineId) {
  const listEl = document.getElementById(`char-dropdown-list-${lineId}`);
  if (!listEl) return;

  // Remove old listeners if any
  const oldListEl = listEl.cloneNode(true);
  listEl.parentNode.replaceChild(oldListEl, listEl);
  const freshListEl = document.getElementById(`char-dropdown-list-${lineId}`);

  // Click delegation
  freshListEl.addEventListener('click', (e) => {
    const item = e.target.closest('.searchable-dropdown-item');
    if (item && item.hasAttribute('data-char-id')) {
      const charId = item.getAttribute('data-char-id');
      selectCharacterFromDropdown(lineId, charId);
    }
  });

  // Mouseenter delegation for highlighting
  freshListEl.addEventListener('mouseover', (e) => {
    const item = e.target.closest('.searchable-dropdown-item');
    if (item && item.hasAttribute('data-char-index')) {
      const idx = parseInt(item.getAttribute('data-char-index'));
      if (idx !== highlightedIndex) {
        highlightedIndex = idx;
        updateDropdownHighlighting(lineId);
      }
    }
  });
}

function updateDropdownHighlighting(lineId) {
  const listEl = document.getElementById(`char-dropdown-list-${lineId}`);
  if (!listEl) return;

  const items = listEl.querySelectorAll('.searchable-dropdown-item');
  items.forEach((item, idx) => {
    if (idx === highlightedIndex) {
      item.classList.add('highlighted');
    } else {
      item.classList.remove('highlighted');
    }
  });
}

function scrollToHighlighted(lineId) {
  const listEl = document.getElementById(`char-dropdown-list-${lineId}`);
  if (!listEl) return;

  const highlightedEl = listEl.querySelector('.highlighted');
  if (highlightedEl) {
    highlightedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function renderScriptLineBar(line, index) {
  const lineNumber = index + 1;
  let contentHtml = "";

  // Generate content based on type
  if (line.type === "speaking") {
    // Get selected character name for display
    const selectedChar = cast.find(c => c && c.id === line.characterId);
    const displayValue = selectedChar ? `${selectedChar.name} ${selectedChar.surname}` : '';

    contentHtml = `
      <div class="searchable-dropdown" onclick="event.stopPropagation()">
        <input
          type="text"
          id="char-dropdown-input-${line.id}"
          class="searchable-dropdown-input"
          placeholder="Search character..."
          value="${displayValue}"
          onfocus="openCharacterDropdown('${line.id}')"
          oninput="filterCharacters('${line.id}', this.value)"
          onkeydown="handleCharacterKeydown('${line.id}', event)"
        />
        <div id="char-dropdown-list-${line.id}" class="searchable-dropdown-list" style="display: none;"></div>
      </div>
      <input
        type="text"
        class="script-dialogue-input"
        placeholder="Enter dialogue..."
        value="${line.dialogue || ''}"
        oninput="updateScriptLine('${line.id}', 'dialogue', this.value)"
        onclick="event.stopPropagation()"
      >
    `;
  } else if (line.type === "narrator") {
    contentHtml = `
      <input
        type="text"
        class="script-narration-input"
        placeholder="Enter narration text..."
        value="${line.text || ''}"
        oninput="updateScriptLine('${line.id}', 'text', this.value)"
        onclick="event.stopPropagation()"
      >
    `;
  } else if (line.type === "minigame") {
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

    const minigameOptions = minigames.map(mg => {
      return `<option value="${mg.gameId}" ${line.minigameId === mg.gameId ? 'selected' : ''}>
        ${mg.name} (${typeLabels[mg.gameType]})
      </option>`;
    }).join('');

    contentHtml = `
      <select class="script-minigame-select" onchange="updateScriptLine('${line.id}', 'minigameId', this.value)" onclick="event.stopPropagation()">
        <option value="">Select Minigame Instance...</option>
        ${minigameOptions}
        ${minigames.length === 0 ? '<option value="" disabled>No minigames configured - visit Minigame Details to create one</option>' : ''}
      </select>
    `;
  }

  const isSelected = selectedLineIds.has(line.id);

  return `
    <div class="script-line-bar ${isSelected ? 'selected' : ''}"
         data-line-id="${line.id}"
         draggable="true"
         ondragstart="handleDragStart(event, '${line.id}')"
         ondragend="handleDragEnd(event)"
         onclick="toggleLineSelection(event, '${line.id}')">

      <div class="script-drag-handle">
        <div class="arrow-btn arrow-up" onclick="event.stopPropagation(); moveLineUp('${line.id}')" title="Move up">▲</div>
        <div class="arrow-btn arrow-down" onclick="event.stopPropagation(); moveLineDown('${line.id}')" title="Move down">▼</div>
      </div>

      <div class="script-line-number">#${lineNumber}</div>

      <div class="script-line-content">
        ${contentHtml}
      </div>

      <div class="script-line-type-select">
        <select onchange="changeScriptLineType('${line.id}', this.value)" onclick="event.stopPropagation()">
          <option value="speaking" ${line.type === 'speaking' ? 'selected' : ''}>Speaking</option>
          <option value="narrator" ${line.type === 'narrator' ? 'selected' : ''}>Narrator</option>
          <option value="minigame" ${line.type === 'minigame' ? 'selected' : ''}>Minigame Start</option>
        </select>
      </div>

      ${(line.type === 'speaking' || line.type === 'narrator') ? `<button class="script-line-edit" onclick="event.stopPropagation(); openScriptLineModal('${line.id}')" title="Edit advanced properties">✏️</button>` : ''}

      <button class="script-line-delete" onclick="event.stopPropagation(); deleteScriptLine('${line.id}')" title="Delete line">🗑️</button>
    </div>
  `;
}

// Storage functions now in js/core/storage.js
// Cast view now in js/views/castView.js
// Character model functions now in js/models/characterModel.js
// Minigame view and functions now in js/views/minigameView.js
// Truth bullets view and functions now in js/views/truthBulletsView.js

// ==================== Script Line Advanced Editing ====================

async function saveScriptLineAdvanced() {
  const line = scriptLines.find(l => l.id === activeLineId);
  if (!line) {
    alert("Script line not found!");
    closeModal();
    return;
  }

  try {
    showLoader(true);

    // Update line data based on type
    if (line.type === 'speaking') {
      line.spriteIndex = scriptLineFields.spriteIndex;
      line.cameraMotion = scriptLineFields.cameraMotion;
    }

    // Common fields for both narrator and speaking
    line.highlights = scriptLineFields.highlights;
    line.specialEffects = scriptLineFields.specialEffects;
    line.dialogueBoxStyle = scriptLineFields.dialogueBoxStyle;

    // Handle audio file upload
    if (scriptLineFields.audioBlob) {
      // Create Audio directory if it doesn't exist
      const audioDir = await dirHandle.getDirectoryHandle("Audio", { create: true });

      // Generate filename based on line ID
      const audioFileName = `${line.id}.${scriptLineFields.audioBlob.name.split('.').pop()}`;

      // Write audio file
      const audioFileHandle = await audioDir.getFileHandle(audioFileName, { create: true });
      const writable = await audioFileHandle.createWritable();
      await writable.write(scriptLineFields.audioBlob);
      await writable.close();

      line.audioFile = audioFileName;
    } else if (scriptLineFields.audioFile === null && line.audioFile) {
      // Audio was cleared, remove the file
      try {
        const audioDir = await dirHandle.getDirectoryHandle("Audio", { create: false });
        await audioDir.removeEntry(line.audioFile);
      } catch (e) {
        console.warn("Could not remove audio file:", e);
      }
      line.audioFile = null;
    }

    // Save trial data
    await autoSaveTrial();

    showLoader(false);
    closeModal();
    renderScriptEditor();

  } catch (error) {
    console.error("Error saving script line:", error);
    showLoader(false);
    modalErr = "Failed to save: " + error.message;
    renderScriptLineModal();
  }
}