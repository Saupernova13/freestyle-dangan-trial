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
    // Render script lines
    let linesHtml = scriptLines.map((line, index) => {
      return renderScriptLineBar(line, index);
    }).join('');

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

function deleteScriptLine(lineId) {
  scriptLines = scriptLines.filter(line => line.id !== lineId);
  // Reorder remaining lines
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
      <select class="script-character-select" onchange="updateScriptLine('${line.id}', 'characterId', this.value)">
        <option value="">Select Character...</option>
        ${characterOptions}
      </select>
      <input
        type="text"
        class="script-dialogue-input"
        placeholder="Enter dialogue..."
        value="${line.dialogue || ''}"
        oninput="updateScriptLine('${line.id}', 'dialogue', this.value)"
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
      >
    `;
  } else if (line.type === "minigame") {
    contentHtml = `
      <select class="script-minigame-select" onchange="updateScriptLine('${line.id}', 'minigameId', this.value)">
        <option value="">Select Minigame...</option>
        <option value="truth_bullets" ${line.minigameId === 'truth_bullets' ? 'selected' : ''}>Truth Bullets</option>
        <option value="hangmans_gambit" ${line.minigameId === 'hangmans_gambit' ? 'selected' : ''}>Hangman's Gambit</option>
        <option value="rebuttal_showdown" ${line.minigameId === 'rebuttal_showdown' ? 'selected' : ''}>Rebuttal Showdown</option>
      </select>
    `;
  }

  return `
    <div class="script-line-bar" data-line-id="${line.id}">
      <div class="script-line-number">#${lineNumber}</div>

      <div class="script-line-content">
        ${contentHtml}
      </div>

      <div class="script-line-type-select">
        <select onchange="changeScriptLineType('${line.id}', this.value)">
          <option value="speaking" ${line.type === 'speaking' ? 'selected' : ''}>Speaking</option>
          <option value="narrator" ${line.type === 'narrator' ? 'selected' : ''}>Narrator</option>
          <option value="minigame" ${line.type === 'minigame' ? 'selected' : ''}>Minigame Start</option>
        </select>
      </div>

      <button class="script-line-delete" onclick="deleteScriptLine('${line.id}')">🗑️</button>
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