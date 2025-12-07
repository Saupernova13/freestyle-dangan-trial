// Main application logic
const BLOCK_COUNT = 17;
const blockNames = [...Array(16)].map((_, i) => `Student ${String(i + 1).padStart(2, '0')}`).concat(['Headmaster']);
const blockTypes = [...Array(16)].fill(false).concat([true]); // false = student, true = headmaster
let cast = Array(BLOCK_COUNT).fill(null);
let trialName = "";
let dirHandle = null;

// View management
let activeView = "cast";  // "cast" or "script"
let scriptLines = [];     // Array of script line objects

// Drag-and-drop state
let draggedLineIds = [];       // IDs of lines being dragged (supports multi-select)
let selectedLineIds = new Set();  // Set of selected line IDs for multi-select
let dragGhostElement = null;   // Ghost element for drag preview

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  initializeTheme();
  loadSettings();
  renderActiveView();

  // Trial name input handler
  document.getElementById('trialNameInput').addEventListener('input', e => {
    trialName = e.target.value.trim();
    autoSaveTrial();
  });
});

// View management functions
function switchView(viewName) {
  activeView = viewName;
  updateNavSelection();
  renderActiveView();
}

function updateNavSelection() {
  document.querySelectorAll('.nav-item').forEach(item => {
    const itemView = item.getAttribute('data-view');
    if (itemView === activeView) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

function renderActiveView() {
  if (activeView === "cast") {
    renderCastGrid();
  } else if (activeView === "script") {
    renderScriptEditor();
  }
}

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
          <button class="btn btn-primary" onclick="addScriptLine()">➕ Add Line</button>
        </div>
        <div class="script-lines-container">
          ${linesHtml}
        </div>
      </div>
    `;
  }
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

function renderScriptLineBar(line, index) {
  const lineNumber = index + 1;
  let contentHtml = "";

  // Generate content based on type
  if (line.type === "speaking") {
    const characters = cast.filter(c => c !== null);
    const characterOptions = characters.map(c =>
      `<option value="${c.id}" ${c.id === line.characterId ? 'selected' : ''}>
        ${c.name} ${c.surname} (${c.isHeadmaster ? 'Headmaster' : 'Student'})
      </option>`
    ).join('');

    contentHtml = `
      <select class="script-character-select" onchange="updateScriptLine('${line.id}', 'characterId', this.value)" onclick="event.stopPropagation()">
        <option value="">Select Character...</option>
        ${characterOptions}
      </select>
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
    contentHtml = `
      <select class="script-minigame-select" onchange="updateScriptLine('${line.id}', 'minigameId', this.value)" onclick="event.stopPropagation()">
        <option value="">Select Minigame...</option>
        <option value="truth_bullets" ${line.minigameId === 'truth_bullets' ? 'selected' : ''}>Truth Bullets</option>
        <option value="hangmans_gambit" ${line.minigameId === 'hangmans_gambit' ? 'selected' : ''}>Hangman's Gambit</option>
        <option value="rebuttal_showdown" ${line.minigameId === 'rebuttal_showdown' ? 'selected' : ''}>Rebuttal Showdown</option>
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

      ${line.type === 'speaking' ? `<button class="script-line-edit" onclick="event.stopPropagation(); openScriptLineModal('${line.id}')" title="Edit advanced properties">✏️</button>` : ''}

      <button class="script-line-delete" onclick="event.stopPropagation(); deleteScriptLine('${line.id}')" title="Delete line">🗑️</button>
    </div>
  `;
}

async function chooseTrialDir() {
  try {
    showLoader(true);
    let dH = await window.showDirectoryPicker({ id: 'dr-trial-dir', mode: 'readwrite' });
    dirHandle = dH;
    renderDirDisplay(dirHandle);
    
    let files = [];
    for await (const entry of dirHandle.values()) files.push(entry.name);
    
    if (files.includes("trial.json")) {
      try {
        const file = await dirHandle.getFileHandle("trial.json").then(fh => fh.getFile());
        const data = JSON.parse(await file.text());
        trialName = data.trialName || "";
        document.getElementById('trialNameInput').value = trialName;

        // Load characters from ID references
        await loadCharactersFromIds(data.characters || []);

        // Load script lines
        if (data.script && data.script.lines) {
          scriptLines = data.script.lines;
        } else {
          scriptLines = [];
        }
      } catch (error) {
        console.error("Failed to parse trial.json:", error);
        // Initialize with empty trial if corrupted
        trialName = "";
        document.getElementById('trialNameInput').value = "";
        cast = Array(BLOCK_COUNT).fill(null);
        scriptLines = [];
      }
    } else {
      trialName = "";
      document.getElementById('trialNameInput').value = "";
      cast = Array(BLOCK_COUNT).fill(null);
      scriptLines = [];
      await dirHandle.getDirectoryHandle('Characters', { create: true });
    }

    showLoader(false);
    renderActiveView();
  } catch (err) {
    console.log(err);
    showLoader(false);
  }
}

async function loadCharactersFromIds(characterIds) {
  cast = Array(BLOCK_COUNT).fill(null);
  
  let charsDir = await dirHandle.getDirectoryHandle("Characters", { create: false }).catch(() => null);
  if (!charsDir) return;
  
  for (let i = 0; i < characterIds.length; i++) {
    const charId = characterIds[i];
    if (charId) {
      try {
        // Find character folder by ID
        for await (const [folderName, folderHandle] of charsDir.entries()) {
          if (folderHandle.kind === 'directory') {
            try {
              let charFile = await folderHandle.getFileHandle("character.json");
              let charData = JSON.parse(await (await charFile.getFile()).text());
              
              if (charData.id === charId) {
                // Load sprites
                charData.sprites = [];
                const spriteCount = appSettings.maxSprites;
                for (let j = 1; j <= spriteCount; j++) {
                  try {
                    let f = await folderHandle.getFileHandle(`sprite_${String(j).padStart(2, '0')}.png`);
                    let file = await f.getFile();
                    let b64 = await fileToDataUrl(file);
                    charData.sprites.push({ dataURL: b64, fname: file.name, blob: file });
                  } catch {
                    charData.sprites.push(null);
                  }
                }
                
                cast[i] = charData;
                break;
              }
            } catch {
              continue;
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to load character at position ${i}:`, error);
      }
    }
  }
}

function renderCastGrid() {
  const grid = document.getElementById('mainGrid');
  grid.innerHTML = '';
  
  for (let i = 0; i < BLOCK_COUNT; i++) {
    const c = cast[i];
    const isHeadmaster = blockTypes[i];
    const div = document.createElement('div');
    div.className = 'cast-block';
    div.setAttribute('tabindex', 0);
    div.setAttribute('data-filled', c ? "1" : "0");
    div.setAttribute('data-type', isHeadmaster ? 'headmaster' : 'student');
    div.onclick = () => dirHandle ? openCharModal(i) : null;
    
    if (c) {
      // Character exists - show sprite and name
      let spriteHtml = '';
      if (c.sprites && c.sprites[0] && c.sprites[0].dataURL) {
        spriteHtml = `<img src="${c.sprites[0].dataURL}" class="blk-ppic" alt="Character sprite">`;
      } else {
        spriteHtml = `<div class="blk-ppic" style="display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);">No Image</div>`;
      }
      
      div.innerHTML = `
        ${spriteHtml}
        <div class="cast-name">${c.name || ""} ${c.surname || ""}</div>
        <div class="cast-block-title">${blockNames[i]}</div>
      `;
    } else {
      // Empty slot - show plus and default name
      div.innerHTML = `
        <div class="blk-plus">+</div>
        <div class="cast-name">No Character</div>
        <div class="cast-block-title">${blockNames[i]}</div>
      `;
    }
    
    grid.appendChild(div);
  }
}

async function autoSaveTrial() {
  if (!dirHandle) return;

  // Create minimal ID-only references
  let characterIds = cast.map(c => c ? c.id : null);

  let trialJs = {
    trialName,
    characters: characterIds, // Just an array of IDs or nulls
    script: {
      lines: scriptLines,
      lastModified: new Date().toISOString()
    },
    metadata: {
      version: "3.0",
      lastModified: new Date().toISOString(),
      studentCount: blockTypes.filter(t => !t).length,
      headmasterCount: blockTypes.filter(t => t).length,
      totalCharacters: characterIds.filter(id => id !== null).length,
      scriptLineCount: scriptLines.length
    }
  };

  let fHandle = await dirHandle.getFileHandle("trial.json", { create: true });
  let wr = await fHandle.createWritable();
  await wr.write(JSON.stringify(trialJs, null, 2));
  await wr.close();
}

// Utility functions to work with character types
function getStudents() {
  return cast.filter((c, index) => c && !blockTypes[index]);
}

function getHeadmaster() {
  const headmasterIndex = blockTypes.findIndex(type => type === true);
  return cast[headmasterIndex] || null;
}

function getCharactersByType(isHeadmaster) {
  return cast.filter((c, index) => c && blockTypes[index] === isHeadmaster);
}

function getCharacterType(index) {
  return blockTypes[index] ? 'headmaster' : 'student';
}

function isHeadmaster(index) {
  return blockTypes[index] === true;
}

function isStudent(index) {
  return blockTypes[index] === false;
}

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

    // Update line data
    line.spriteIndex = scriptLineFields.spriteIndex;
    line.highlights = scriptLineFields.highlights;
    line.cameraMotion = scriptLineFields.cameraMotion;
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