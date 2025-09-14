// Main application logic
const BLOCK_COUNT = 17;
const blockNames = [...Array(16)].map((_, i) => `Student ${String(i + 1).padStart(2, '0')}`).concat(['Headmaster']);
const blockTypes = [...Array(16)].fill(false).concat([true]); // false = student, true = headmaster
let cast = Array(BLOCK_COUNT).fill(null);
let trialName = "";
let dirHandle = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  initializeTheme();
  loadSettings();
  renderCastGrid();
  
  // Trial name input handler
  document.getElementById('trialNameInput').addEventListener('input', e => {
    trialName = e.target.value.trim();
    autoSaveTrial();
  });
});

// Generate unique ID for characters
function generateCharacterId() {
  return 'char_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
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
      const file = await dirHandle.getFileHandle("trial.json").then(fh => fh.getFile());
      const data = JSON.parse(await file.text());
      trialName = data.trialName || "";
      document.getElementById('trialNameInput').value = trialName;
      
      // Load characters from ID references
      await loadCharactersFromIds(data.characters || []);
    } else {
      trialName = "";
      document.getElementById('trialNameInput').value = "";
      cast = Array(BLOCK_COUNT).fill(null);
      await dirHandle.getDirectoryHandle('Characters', { create: true });
    }
    
    showLoader(false);
    renderCastGrid();
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
    metadata: {
      version: "3.0",
      lastModified: new Date().toISOString(),
      studentCount: blockTypes.filter(t => !t).length,
      headmasterCount: blockTypes.filter(t => t).length,
      totalCharacters: characterIds.filter(id => id !== null).length
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