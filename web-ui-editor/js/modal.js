// Modal management
let activeIdx = null;
let charFields = {
  name: "",
  surname: "",
  heightM: 1,
  heightCM: 50,
  weight: "",
  chest: "",
  blood: "A",
  dob: "",
  likes: "",
  dislikes: "",
  notes: ""
};
let charSprites = [];
let modalTab = "details";
let modalErr = "";
let modalMsg = "";

// Script line modal state
let activeLineId = null;
let scriptLineTab = "sprite";
let scriptLineFields = {
  spriteIndex: null,
  audioFile: null,
  audioBlob: null,
  highlights: [],
  cameraMotion: {
    type: "none",
    duration: 1.0,
    easing: "ease-in-out"
  },
  specialEffects: {
    effects: []
  },
  dialogueBoxStyle: {
    style: "default",
    borderColor: "#FFFFFF",
    bgOpacity: 0.9,
    borderThickness: 2
  }
};
let highlightingState = {
  startChar: 0,
  endChar: 0,
  currentColor: "#FFFF00"
};

// Audio preview state
let audioPreviewElement = null;
let isAudioPlaying = false;

// Minigame modal state
let activeMinigameId = null;
let minigameTab = "common";
let minigameFields = {
  name: "",
  gameType: "truth_bullets",
  difficulty: "medium",
  timeLimit: 60,
  typeSpecific: {}
};

// Truth Bullet modal state
let activeBulletId = null;
let bulletFields = {
  name: "",
  description: "",
  imageFile: null,
  imageBlob: null,
  inversedLieBulletName: ""
};

// Nonstop Debate dialogue line modal state
let activeDebateLineId = null;
let debateLineTab = "sentence";
let debateLineFields = {
  sentenceBeginning: "",
  target: "",
  sentenceEnd: "",
  isCorrect: false,
  userFailedComment: "",
  userWrongAnswerComment: "",
  textEffect: "none",
  textMovementDirection: "none",
  textFont: "default",
  characterId: "",
  characterSpotlight: false,
  voiceLineFile: null,
  voiceLineBlob: null
};

// Generate human-readable ID for characters
function generateCharacterId(name, surname, dob) {
  // Clean and format components
  const cleanName = name.charAt(0).toUpperCase().replace(/[^A-Za-z0-9]/g, '') || 'X';
  const cleanSurname = surname.charAt(0).toUpperCase().replace(/[^A-Za-z0-9]/g, '') || 'Y';
  const dobFormatted = dob.replace(/-/g, ''); // YYYYMMDD format
  const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `${cleanSurname}${cleanName}_${dobFormatted}_${randomString}`;
}

function openCharModal(idx) {
  if (!dirHandle) {
    alert("Choose a folder first!");
    return;
  }
  
  activeIdx = idx;
  modalTab = "details";
  modalErr = "";
  modalMsg = "";
  
  let c = cast[idx] || {};
  charFields = {
    name: c.name || "",
    surname: c.surname || "",
    heightM: c.heightM || 1,
    heightCM: c.heightCM || 50,
    weight: c.weight || "",
    chest: c.chest || "",
    blood: c.blood || "A",
    dob: c.dob || "",
    likes: c.likes || "",
    dislikes: c.dislikes || "",
    notes: c.notes || ""
  };
  
  // Load existing sprites if they exist
  if (c.sprites) {
    charSprites = [...c.sprites];
  } else {
    charSprites = Array(appSettings.maxSprites).fill(null);
  }
  
  renderModal();
}

function renderModal() {
  let root = document.getElementById("modalroot");
  const characterType = getCharacterType(activeIdx);
  const isHeadmasterChar = isHeadmaster(activeIdx);
  
  root.innerHTML = `
    <div class="dr-modal-bg">
      <div class="dr-modal">
        <button class="dr-close" onclick="closeModal()">&times;</button>
        <div class="dr-tabs">
          <button class="dr-tab${modalTab === 'details' ? ' active' : ''}" onclick="switchModalTab('details')">
            ${isHeadmasterChar ? '👑' : '🎓'} Character Details (${characterType.charAt(0).toUpperCase() + characterType.slice(1)})
          </button>
          <button class="dr-tab${modalTab === 'sprites' ? ' active' : ''}" onclick="switchModalTab('sprites')">Sprites</button>
        </div>
        <div class="dr-modal-content">
          <div id="dr-tab-content">${modalTab === 'details' ? renderDetailsTab() : renderSpritesTab()}</div>
          ${modalErr ? `<div class="dr-err">${modalErr}</div>` : ""}
          ${modalMsg ? `<div class="dr-success">${modalMsg}</div>` : ""}
        </div>
        <div class="dr-btn-row">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="trySaveChar()" ${(!dirHandle) ? "disabled" : ""}>Save ${isHeadmasterChar ? 'Headmaster' : 'Student'}</button>
        </div>
      </div>
    </div>
  `;
}

function closeModal() {
  // Stop and cleanup audio if playing
  if (audioPreviewElement) {
    audioPreviewElement.pause();
    if (audioPreviewElement.src) {
      URL.revokeObjectURL(audioPreviewElement.src);
    }
    audioPreviewElement = null;
    isAudioPlaying = false;
  }

  document.getElementById("modalroot").innerHTML = "";
  activeIdx = null;
}

function switchModalTab(tab) {
  modalTab = tab;
  modalErr = "";
  modalMsg = "";
  renderModal();
}

function fieldUpdate(field, val) {
  charFields[field] = val;
}

function renderDetailsTab() {
  const isHeadmasterChar = isHeadmaster(activeIdx);
  const characterType = getCharacterType(activeIdx);
  
  return `<form class="dr-form" onsubmit="event.preventDefault();">
    <div style="background: ${isHeadmasterChar ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, var(--primary), var(--primary-dark))'}; color: white; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem; text-align: center; font-weight: 600;">
      ${isHeadmasterChar ? '👑 HEADMASTER CHARACTER' : '🎓 STUDENT CHARACTER'}
    </div>
    <div class="dr-fg-row">
      <div class="dr-fg-field">
          <label>First Name</label>
          <input required value="${charFields.name || ''}" onchange="fieldUpdate('name',this.value)" oninput="fieldUpdate('name',this.value)">
      </div>
      <div class="dr-fg-field">
          <label>Last Name</label>
          <input required value="${charFields.surname || ''}" onchange="fieldUpdate('surname',this.value)" oninput="fieldUpdate('surname',this.value)">
      </div>
    </div>
    <div class="dr-fg-row">
      <div class="dr-fg-field">
          <label>Date of Birth</label>
          <input type="date" required value="${charFields.dob || ''}" onchange="fieldUpdate('dob',this.value)" oninput="fieldUpdate('dob',this.value)">
      </div>
      <div class="dr-fg-field">
        <label>Blood Type</label>
        <select required onchange="fieldUpdate('blood',this.value)">
          <option${charFields.blood === "A" ? ' selected' : ''}>A</option>
          <option${charFields.blood === "B" ? ' selected' : ''}>B</option>
          <option${charFields.blood === "O" ? ' selected' : ''}>O</option>
          <option${charFields.blood === "AB" ? ' selected' : ''}>AB</option>
          <option${charFields.blood === "Unknown" ? ' selected' : ''}>Unknown</option>
        </select>
      </div>
    </div>
    <div class="dr-fg-row">
      <div class="dr-fg-field">
        <label>Height</label>
        <div class="dr-fg-field input2">
          <input type="number" min="0.9" max="2.5" step="0.01" value="${charFields.heightM || ''}" onchange="fieldUpdate('heightM',this.value)" oninput="fieldUpdate('heightM',this.value)">
          <span>m</span>
          <input type="number" min="0" max="99" step="1" value="${charFields.heightCM || ''}" onchange="fieldUpdate('heightCM',this.value)" oninput="fieldUpdate('heightCM',this.value)">
          <span>cm</span>
        </div>
      </div>
      <div class="dr-fg-field">
        <label>Weight (kg)</label>
        <input type="number" min="0" max="300" required value="${charFields.weight || ''}" onchange="fieldUpdate('weight',this.value)" oninput="fieldUpdate('weight',this.value)">
      </div>
    </div>
    <div class="dr-fg-row">
      <div class="dr-fg-field">
        <label>Chest (cm)</label>
        <input type="number" min="0" max="200" required value="${charFields.chest || ''}" onchange="fieldUpdate('chest',this.value)" oninput="fieldUpdate('chest',this.value)">
      </div>
      <div class="dr-fg-field"></div>
    </div>
    <div class="dr-fg-row">
      <div class="dr-fg-field">
        <label>Likes</label>
        <textarea required onchange="fieldUpdate('likes',this.value)" oninput="fieldUpdate('likes',this.value)" placeholder="${isHeadmasterChar ? 'What does this headmaster enjoy?' : 'What does this student like?'}">${charFields.likes || ''}</textarea>
      </div>
      <div class="dr-fg-field">
        <label>Dislikes</label>
        <textarea required onchange="fieldUpdate('dislikes',this.value)" oninput="fieldUpdate('dislikes',this.value)" placeholder="${isHeadmasterChar ? 'What does this headmaster dislike?' : 'What does this student dislike?'}">${charFields.dislikes || ''}</textarea>
      </div>
    </div>
    <div class="dr-fg-row single">
      <div class="dr-fg-field">
        <label>Notes</label>
        <textarea required onchange="fieldUpdate('notes',this.value)" oninput="fieldUpdate('notes',this.value)" placeholder="${isHeadmasterChar ? 'Additional notes about this headmaster...' : 'Additional notes about this student...'}">${charFields.notes || ''}</textarea>
      </div>
    </div>
  </form>`;
}

function renderSpritesTab() {
  const isHeadmasterChar = isHeadmaster(activeIdx);
  
  return `
    <div class="dr-form">
      <button class="btn btn-primary dr-sprslot-bulk" type="button" onclick="bulkImportSprites()">📁 Bulk Import All ${appSettings.maxSprites} ${isHeadmasterChar ? 'Headmaster' : 'Student'} Sprites</button>
      <div class="dr-sprgrid">
        ${charSprites.map((spr, i) =>
    `<div class="dr-sprslot" onclick="triggerSpriteInput(${i})">
            <input type="file" accept="image/*" id="sprite_inp_${i}" onchange="spriteUpload(event,${i})">
            ${spr ?
        `<img src="${spr.dataURL}" alt="Sprite ${i + 1}"><span class="dr-sprslot-num">#${i + 1}</span>`
        : `<span style="color: var(--text-tertiary);">+<br><small>Sprite #${i + 1}</small></span>`
      }
          </div>`
  ).join("")}
      </div>
      <p style="font-size: 0.875rem; color: var(--text-tertiary); margin-top: 1rem;">
        Upload images in any format. They will be automatically processed and saved as PNG files.
        ${isHeadmasterChar ? '<br><strong>Note:</strong> This is for the Headmaster character.' : ''}
      </p>
    </div>
  `;
}

function spriteUpload(e, idx) {
  const file = e.target.files[0];
  if (!file) return;
  
  const url = URL.createObjectURL(file);
  charSprites[idx] = { dataURL: url, fname: file.name, blob: file };
  renderModal();
}

function triggerSpriteInput(i) {
  document.getElementById(`sprite_inp_${i}`).click();
}

function bulkImportSprites() {
  let inp = document.createElement("input");
  inp.type = 'file';
  inp.accept = "image/*";
  inp.multiple = true;
  
  inp.onchange = e => {
    let files = Array.from(inp.files);
    if (files.length !== appSettings.maxSprites) {
      modalErr = `Please select exactly ${appSettings.maxSprites} images.`;
      renderModal();
      return;
    }
    
    files.forEach((f, idx) => {
      let url = URL.createObjectURL(f);
      charSprites[idx] = { dataURL: url, fname: f.name, blob: f };
      if (idx === appSettings.maxSprites - 1) renderModal();
    });
  };
  
  inp.click();
}

async function trySaveChar() {
  let missingF = !charFields.name || !charFields.surname || !charFields.weight || !charFields.chest
    || !charFields.dob || !charFields.likes || !charFields.dislikes || !charFields.notes;
  let badh = isNaN(parseFloat(charFields.heightM)) || isNaN(parseInt(charFields.heightCM));
  let allSprites = charSprites.length === appSettings.maxSprites && charSprites.every(s => s && s.blob);
  
  if (missingF || badh || !allSprites) {
    modalErr = "";
    if (missingF || badh) modalErr += "All fields must be filled correctly.<br>";
    if (!allSprites) modalErr += `All ${appSettings.maxSprites} sprites must be uploaded.`;
    renderModal();
    return;
  }
  
  if (!dirHandle) {
    modalErr = "Choose a folder first!";
    renderModal();
    return;
  }
  
  try {
    showLoader(true);
    
    // Generate human-readable ID for new characters or keep existing ID
    const existingChar = cast[activeIdx];
    const characterId = existingChar ? existingChar.id : generateCharacterId(charFields.name, charFields.surname, charFields.dob);
    
    let charDirname = (charFields.name + "_" + charFields.surname).replace(/[^a-zA-Z0-9_\- ]/g, '_');
    let charsDir = await dirHandle.getDirectoryHandle("Characters", { create: true });
    let charDir = await charsDir.getDirectoryHandle(charDirname, { create: true });
    
    // Save character data (optimized structure)
    let charJson = { 
      id: characterId,
      name: charFields.name,
      surname: charFields.surname,
      heightM: parseFloat(charFields.heightM),
      heightCM: parseInt(charFields.heightCM),
      weight: parseInt(charFields.weight),
      chest: parseInt(charFields.chest),
      blood: charFields.blood,
      dob: charFields.dob,
      likes: charFields.likes,
      dislikes: charFields.dislikes,
      notes: charFields.notes,
      isHeadmaster: isHeadmaster(activeIdx), // Single boolean instead of redundant fields
      position: activeIdx,
      lastModified: new Date().toISOString()
    };
    
    let writer = await charDir.getFileHandle("character.json", { create: true }).then(fh => fh.createWritable());
    await writer.write(JSON.stringify(charJson, null, 2));
    await writer.close();
    
    // Save sprites with proper error handling
    let savedSprites = [];
    for (let k = 0; k < appSettings.maxSprites; k++) {
      let s = charSprites[k];
      if (s && s.blob) {
        try {
          let sw = await charDir.getFileHandle(`sprite_${String(k + 1).padStart(2, '0')}.png`, { create: true }).then(fh => fh.createWritable());
          await sw.write(s.blob);
          await sw.close();
          savedSprites.push(s);
        } catch (error) {
          console.error(`Failed to save sprite ${k + 1}:`, error);
          throw new Error(`Failed to save sprite ${k + 1}: ${error.message}`);
        }
      } else {
        savedSprites.push(null);
      }
    }
    
    // Update cast with new character data
    cast[activeIdx] = { 
      ...charJson,
      sprites: savedSprites
    };
    
    // Save trial data
    await autoSaveTrial();
    
    showLoader(false);
    closeModal();
    renderCastGrid();
    
  } catch (error) {
    showLoader(false);
    modalErr = `Failed to save character: ${error.message}`;
    renderModal();
    console.error('Character save error:', error);
  }
}

// ==================== Script Line Modal Functions ====================

function getAvailableTabs(line) {
  if (line.type === 'narrator') {
    return ['audio', 'dialogueBox', 'highlighting', 'specialEffects'];
  } else if (line.type === 'speaking') {
    return ['sprite', 'audio', 'dialogueBox', 'highlighting', 'cameraMotion', 'specialEffects'];
  }
  return [];
}

function openScriptLineModal(lineId) {
  if (!dirHandle) {
    alert("Choose a folder first!");
    return;
  }

  activeLineId = lineId;
  modalErr = "";
  modalMsg = "";

  // Find the script line
  const line = scriptLines.find(l => l.id === lineId);
  if (!line) {
    alert("Script line not found!");
    return;
  }

  // Set initial tab based on line type
  if (line.type === 'narrator') {
    scriptLineTab = "audio";  // Start with audio for narrator
  } else {
    scriptLineTab = "sprite";  // Start with sprite for speaking
  }

  // Load existing data
  scriptLineFields = {
    spriteIndex: line.spriteIndex ?? null,
    audioFile: line.audioFile || null,
    audioBlob: null,
    highlights: line.highlights ? [...line.highlights] : [],
    cameraMotion: line.cameraMotion || {
      type: "none",
      duration: 1.0,
      easing: "ease-in-out"
    },
    specialEffects: line.specialEffects || {
      effects: []
    },
    dialogueBoxStyle: line.dialogueBoxStyle || {
      style: "default",
      borderColor: "#FFFFFF",
      bgOpacity: 0.9,
      borderThickness: 2
    }
  };

  highlightingState = {
    startChar: 0,
    endChar: 0,
    currentColor: "#FFFF00"
  };

  renderScriptLineModal();
}

function renderScriptLineModal() {
  const root = document.getElementById("modalroot");
  const line = scriptLines.find(l => l.id === activeLineId);

  // For speaking lines, validate character selection
  if (line.type === 'speaking') {
    const character = cast.find(c => c && c.id === line.characterId);
    if (!character) {
      alert("No character selected for this line!");
      closeModal();
      return;
    }
  }

  const availableTabs = getAvailableTabs(line);

  // Set default tab if current tab is not available
  if (!availableTabs.includes(scriptLineTab)) {
    scriptLineTab = availableTabs[0] || 'audio';
  }

  let tabContent = "";
  if (scriptLineTab === "sprite" && line.type === 'speaking') {
    const character = cast.find(c => c && c.id === line.characterId);
    tabContent = renderSpriteSelectionTab(character);
  } else if (scriptLineTab === "audio") {
    tabContent = renderAudioUploadTab(line);
  } else if (scriptLineTab === "dialogueBox") {
    tabContent = renderDialogueBoxTab(line);
  } else if (scriptLineTab === "highlighting") {
    tabContent = renderHighlightingTab(line);
  } else if (scriptLineTab === "cameraMotion" && line.type === 'speaking') {
    tabContent = renderCameraMotionTab(line);
  } else if (scriptLineTab === "specialEffects") {
    tabContent = renderSpecialEffectsTab(line);
  }

  root.innerHTML = `
    <div class="dr-modal-bg">
      <div class="dr-modal">
        <button class="dr-close" onclick="closeModal()">&times;</button>

        <div class="dr-tabs">
          ${availableTabs.includes('sprite') ? `
            <div class="dr-tab ${scriptLineTab === 'sprite' ? 'active' : ''}"
                 onclick="switchScriptLineTab('sprite')">
              🎭 Sprite
            </div>
          ` : ''}

          ${availableTabs.includes('audio') ? `
            <div class="dr-tab ${scriptLineTab === 'audio' ? 'active' : ''}"
                 onclick="switchScriptLineTab('audio')">
              🔊 Audio
            </div>
          ` : ''}

          ${availableTabs.includes('dialogueBox') ? `
            <div class="dr-tab ${scriptLineTab === 'dialogueBox' ? 'active' : ''}"
                 onclick="switchScriptLineTab('dialogueBox')">
              💬 Box Style
            </div>
          ` : ''}

          ${availableTabs.includes('highlighting') ? `
            <div class="dr-tab ${scriptLineTab === 'highlighting' ? 'active' : ''}"
                 onclick="switchScriptLineTab('highlighting')">
              🖍️ Highlighting
            </div>
          ` : ''}

          ${availableTabs.includes('cameraMotion') ? `
            <div class="dr-tab ${scriptLineTab === 'cameraMotion' ? 'active' : ''}"
                 onclick="switchScriptLineTab('cameraMotion')">
              📹 Camera
            </div>
          ` : ''}

          ${availableTabs.includes('specialEffects') ? `
            <div class="dr-tab ${scriptLineTab === 'specialEffects' ? 'active' : ''}"
                 onclick="switchScriptLineTab('specialEffects')">
              ✨ Effects
            </div>
          ` : ''}
        </div>

        <div class="dr-modal-content">
          ${tabContent}
        </div>

        ${modalErr ? `<div class="dr-err">${modalErr}</div>` : ""}
        ${modalMsg ? `<div class="dr-success">${modalMsg}</div>` : ""}

        <div class="dr-btn-row">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveScriptLineAdvanced()">Save Changes</button>
        </div>
      </div>
    </div>
  `;
}

function switchScriptLineTab(tab) {
  scriptLineTab = tab;
  modalErr = "";
  modalMsg = "";
  renderScriptLineModal();

  // Initialize drag selection if switching to highlighting tab
  if (tab === 'highlighting') {
    setTimeout(() => initializeDragSelection(), 0);
  }
}

// Tab rendering functions
function renderSpriteSelectionTab(character) {
  if (!character.sprites || character.sprites.length === 0) {
    return `
      <div class="dr-form">
        <p>This character has no sprites uploaded yet.</p>
        <p>Please edit the character in the Cast view to add sprites.</p>
      </div>
    `;
  }

  let spriteSlots = character.sprites.map((spr, idx) => {
    if (!spr) {
      return `
        <div class="dr-sprslot empty">
          <span>No Sprite</span>
        </div>
      `;
    }

    const isSelected = scriptLineFields.spriteIndex === idx;
    return `
      <div class="dr-sprslot ${isSelected ? 'selected-sprite' : ''}"
           onclick="selectSprite(${idx})"
           title="Sprite ${idx + 1}">
        <img src="${spr.dataURL}" alt="Sprite ${idx + 1}">
        ${isSelected ? '<div class="sprite-check">✓</div>' : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="dr-form">
      <h3>Select Character Sprite</h3>
      <p style="color: var(--text-tertiary); margin-bottom: 1rem;">
        Choose which sprite expression to show during this dialogue.
      </p>
      <div class="dr-sprgrid">
        ${spriteSlots}
      </div>
    </div>
  `;
}

function selectSprite(index) {
  scriptLineFields.spriteIndex = index;
  renderScriptLineModal();
}

function renderAudioUploadTab(line) {
  const hasAudio = scriptLineFields.audioFile !== null;

  return `
    <div class="dr-form">
      <h3>Audio Playback</h3>
      <p style="color: var(--text-tertiary); margin-bottom: 1rem;">
        Upload an audio file for this dialogue line (optional).
      </p>

      ${hasAudio ? `
        <div class="audio-preview">
          <div class="audio-info">
            <span class="audio-icon">🎵</span>
            <span class="audio-filename">${scriptLineFields.audioFile || 'audio.mp3'}</span>
          </div>

          <div class="audio-seek-container">
            <span class="audio-time-current" id="audio-time-current">0:00</span>
            <input type="range"
                   class="audio-seek-bar"
                   id="audio-seek-bar"
                   min="0"
                   max="100"
                   value="0"
                   oninput="seekAudio(this.value)">
            <span class="audio-time-total" id="audio-time-total">0:00</span>
          </div>

          <div class="audio-controls">
            <button class="btn btn-secondary" onclick="playAudioPreview()">${isAudioPlaying ? '⏸️ Pause' : '▶️ Play'}</button>
            <button class="btn btn-secondary" onclick="clearAudio()">🗑️ Remove</button>
          </div>
        </div>
      ` : `
        <div class="audio-empty">
          <p>No audio file uploaded</p>
        </div>
      `}

      <input type="file" accept="audio/*" id="audioFileInput"
             onchange="handleAudioUpload(event)" style="display: none;">
      <button class="btn btn-primary" onclick="triggerAudioInput()">
        📁 ${hasAudio ? 'Replace' : 'Upload'} Audio
      </button>
    </div>
  `;
}

function triggerAudioInput() {
  document.getElementById('audioFileInput').click();
}

function handleAudioUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('audio/')) {
    modalErr = "Please select a valid audio file.";
    renderScriptLineModal();
    return;
  }

  scriptLineFields.audioFile = file.name;
  scriptLineFields.audioBlob = file;
  modalErr = "";
  renderScriptLineModal();
}

function clearAudio() {
  scriptLineFields.audioFile = null;
  scriptLineFields.audioBlob = null;
  renderScriptLineModal();
}

function renderDialogueBoxTab(line) {
  const box = scriptLineFields.dialogueBoxStyle;

  const boxStyles = [
    { value: "default", label: "Default", desc: "Standard rectangular box" },
    { value: "slant_left", label: "Slant Left", desc: "Box tilted to the left" },
    { value: "slant_right", label: "Slant Right", desc: "Box tilted to the right" },
    { value: "spiky", label: "Spiky", desc: "Sharp pointed edges" },
    { value: "bubbly", label: "Bubbly", desc: "Rounded speech bubble style" },
    { value: "rounded", label: "Rounded", desc: "Soft rounded corners" },
    { value: "sharp", label: "Sharp", desc: "Hard angular edges" }
  ];

  const styleOptions = boxStyles.map(style =>
    `<option value="${style.value}" ${box.style === style.value ? 'selected' : ''} title="${style.desc}">
      ${style.label}
    </option>`
  ).join('');

  const selectedStyle = boxStyles.find(s => s.value === box.style);

  return `
    <div class="dr-form">
      <h3>Dialogue Box Style</h3>
      <p style="color: var(--text-tertiary); margin-bottom: 1rem;">
        Customize the appearance of the dialogue box for this line.
      </p>

      <div class="dialoguebox-preview-box">
        <div class="dialoguebox-preview-icon">💬</div>
        <div class="dialoguebox-preview-text">
          <strong>${selectedStyle ? selectedStyle.label : 'Default'}</strong>
          <p>${selectedStyle ? selectedStyle.desc : 'Standard rectangular box'}</p>
        </div>
      </div>

      <div class="dr-fg-row">
        <div class="dr-fg-field" style="flex: 2;">
          <label>Box Style:</label>
          <select onchange="updateDialogueBoxStyle('style', this.value)">
            ${styleOptions}
          </select>
        </div>
      </div>

      <div class="dr-fg-row">
        <div class="dr-fg-field">
          <label>Border Color:</label>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <input type="color"
                   value="${box.borderColor}"
                   onchange="updateDialogueBoxStyle('borderColor', this.value)"
                   style="width: 50px; height: 35px;">
            <span style="font-size: 0.875rem; color: var(--text-tertiary);">${box.borderColor}</span>
          </div>
        </div>
        <div class="dr-fg-field">
          <label>Background Opacity:</label>
          <input type="range"
                 min="0"
                 max="1"
                 step="0.1"
                 value="${box.bgOpacity}"
                 oninput="updateDialogueBoxStyle('bgOpacity', parseFloat(this.value))"
                 style="width: 100%;">
          <span style="font-size: 0.875rem; color: var(--text-tertiary);">${Math.round(box.bgOpacity * 100)}%</span>
        </div>
      </div>

      <div class="dr-fg-row">
        <div class="dr-fg-field">
          <label>Border Thickness (px):</label>
          <input type="number"
                 min="0"
                 max="10"
                 step="1"
                 value="${box.borderThickness}"
                 onchange="updateDialogueBoxStyle('borderThickness', parseInt(this.value))">
        </div>
      </div>
    </div>
  `;
}

function updateDialogueBoxStyle(field, value) {
  scriptLineFields.dialogueBoxStyle[field] = value;

  // Update only the dialogue box tab content
  const tabContent = document.querySelector('.dr-modal-content');
  if (tabContent && scriptLineTab === 'dialogueBox') {
    const line = scriptLines.find(l => l.id === activeLineId);
    tabContent.innerHTML = renderDialogueBoxTab(line);
  }
}

async function loadAudioFileFromDisk(filename) {
  try {
    const audioDir = await dirHandle.getDirectoryHandle("Audio", { create: false });
    const fileHandle = await audioDir.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return file;
  } catch (error) {
    console.error("Error loading audio file:", error);
    return null;
  }
}

async function playAudioPreview() {
  // Toggle pause if already playing
  if (audioPreviewElement && !audioPreviewElement.paused) {
    audioPreviewElement.pause();
    audioPreviewElement.currentTime = 0;
    isAudioPlaying = false;
    updateAudioPlayButton();
    return;
  }

  // Load audio from disk if we have filename but no blob
  if (!scriptLineFields.audioBlob && scriptLineFields.audioFile) {
    try {
      const audioFile = await loadAudioFileFromDisk(scriptLineFields.audioFile);
      if (audioFile) {
        scriptLineFields.audioBlob = audioFile;
      } else {
        modalErr = "Failed to load audio file from disk.";
        renderScriptLineModal();
        return;
      }
    } catch (error) {
      modalErr = `Error loading audio: ${error.message}`;
      renderScriptLineModal();
      return;
    }
  }

  if (!scriptLineFields.audioBlob) {
    modalErr = "No audio file to play.";
    renderScriptLineModal();
    return;
  }

  try {
    // Create blob URL for preview
    const blobUrl = URL.createObjectURL(scriptLineFields.audioBlob);

    // Create or reuse audio element
    if (!audioPreviewElement) {
      audioPreviewElement = new Audio();

      // Event handlers
      audioPreviewElement.onended = () => {
        isAudioPlaying = false;
        URL.revokeObjectURL(audioPreviewElement.src);
        updateAudioPlayButton();
      };

      audioPreviewElement.onerror = (e) => {
        isAudioPlaying = false;
        modalErr = `Audio playback error: ${audioPreviewElement.error.message}`;
        renderScriptLineModal();
      };

      audioPreviewElement.ontimeupdate = () => {
        updateAudioSeekBar();
      };

      audioPreviewElement.onloadedmetadata = () => {
        updateAudioSeekBar();
      };
    }

    audioPreviewElement.src = blobUrl;
    audioPreviewElement.play()
      .then(() => {
        isAudioPlaying = true;
        updateAudioPlayButton();
        updateAudioSeekBar();
      })
      .catch(err => {
        isAudioPlaying = false;
        modalErr = `Failed to play audio: ${err.message}`;
        renderScriptLineModal();
      });

  } catch (error) {
    modalErr = `Error playing audio: ${error.message}`;
    renderScriptLineModal();
  }
}

// Update only the play button without full re-render
function updateAudioPlayButton() {
  const playButton = document.querySelector('.audio-controls .btn-secondary');
  if (playButton) {
    playButton.innerHTML = isAudioPlaying ? '⏸️ Pause' : '▶️ Play';
  }
}

function seekAudio(value) {
  if (audioPreviewElement) {
    const duration = audioPreviewElement.duration;
    audioPreviewElement.currentTime = (value / 100) * duration;
  }
}

function updateAudioSeekBar() {
  if (!audioPreviewElement) return;

  const seekBar = document.getElementById('audio-seek-bar');
  const currentTimeEl = document.getElementById('audio-time-current');
  const totalTimeEl = document.getElementById('audio-time-total');

  if (seekBar && currentTimeEl && totalTimeEl) {
    const current = audioPreviewElement.currentTime;
    const duration = audioPreviewElement.duration || 0;
    const percent = duration > 0 ? (current / duration) * 100 : 0;

    seekBar.value = percent;
    currentTimeEl.textContent = formatTime(current);
    totalTimeEl.textContent = formatTime(duration);
  }
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function renderCameraMotionTab(line) {
  const cam = scriptLineFields.cameraMotion;

  const cameraTypes = [
    { value: "none", label: "None", desc: "No camera movement" },
    { value: "pan_left", label: "Pan Left", desc: "Camera pans to the left" },
    { value: "pan_right", label: "Pan Right", desc: "Camera pans to the right" },
    { value: "pan_up", label: "Pan Up", desc: "Camera pans upward" },
    { value: "pan_down", label: "Pan Down", desc: "Camera pans downward" },
    { value: "zoom_in", label: "Zoom In", desc: "Camera zooms closer" },
    { value: "zoom_out", label: "Zoom Out", desc: "Camera zooms out" },
    { value: "rotate_cw", label: "Rotate Clockwise", desc: "Camera rotates clockwise" },
    { value: "rotate_ccw", label: "Rotate Counter-Clockwise", desc: "Camera rotates counter-clockwise" },
    { value: "tilt_up", label: "Tilt Up", desc: "Camera tilts upward" },
    { value: "tilt_down", label: "Tilt Down", desc: "Camera tilts downward" },
    { value: "dolly_in", label: "Dolly In", desc: "Camera moves forward on track" },
    { value: "dolly_out", label: "Dolly Out", desc: "Camera moves backward on track" },
    { value: "truck_left", label: "Truck Left", desc: "Camera moves left on track" },
    { value: "truck_right", label: "Truck Right", desc: "Camera moves right on track" },
    { value: "pedestal_up", label: "Pedestal Up", desc: "Camera moves up vertically" },
    { value: "pedestal_down", label: "Pedestal Down", desc: "Camera moves down vertically" }
  ];

  const easingTypes = [
    { value: "linear", label: "Linear" },
    { value: "ease-in", label: "Ease In" },
    { value: "ease-out", label: "Ease Out" },
    { value: "ease-in-out", label: "Ease In-Out" }
  ];

  const cameraOptions = cameraTypes.map(type =>
    `<option value="${type.value}" ${cam.type === type.value ? 'selected' : ''} title="${type.desc}">
      ${type.label}
    </option>`
  ).join('');

  const easingOptions = easingTypes.map(easing =>
    `<option value="${easing.value}" ${cam.easing === easing.value ? 'selected' : ''}>
      ${easing.label}
    </option>`
  ).join('');

  const selectedType = cameraTypes.find(t => t.value === cam.type);

  return `
    <div class="dr-form">
      <h3>Camera Motion</h3>
      <p style="color: var(--text-tertiary); margin-bottom: 1rem;">
        Configure camera animation during this dialogue line.
      </p>

      <div class="camera-preview-box">
        <div class="camera-preview-icon">📹</div>
        <div class="camera-preview-text">
          <strong>${selectedType ? selectedType.label : 'None'}</strong>
          <p>${selectedType ? selectedType.desc : 'No camera movement'}</p>
        </div>
      </div>

      <div class="dr-fg-row">
        <div class="dr-fg-field" style="flex: 2;">
          <label>Motion Type:</label>
          <select onchange="updateCameraMotion('type', this.value)">
            ${cameraOptions}
          </select>
        </div>
      </div>

      ${cam.type !== 'none' ? `
        <div class="dr-fg-row">
          <div class="dr-fg-field">
            <label>Duration (seconds):</label>
            <input type="number" min="0.1" max="10" step="0.1"
                   value="${cam.duration}"
                   onchange="updateCameraMotion('duration', parseFloat(this.value))">
          </div>
          <div class="dr-fg-field">
            <label>Easing:</label>
            <select onchange="updateCameraMotion('easing', this.value)">
              ${easingOptions}
            </select>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function updateCameraMotion(field, value) {
  scriptLineFields.cameraMotion[field] = value;

  // Update only the camera tab content
  const tabContent = document.querySelector('.dr-modal-content');
  if (tabContent && scriptLineTab === 'cameraMotion') {
    const line = scriptLines.find(l => l.id === activeLineId);
    tabContent.innerHTML = renderCameraMotionTab(line);
  }
}

function renderSpecialEffectsTab(line) {
  const effects = scriptLineFields.specialEffects.effects;

  const availableEffects = [
    { type: "shake", label: "Screen Shake", icon: "📳", hasIntensity: true },
    { type: "flash", label: "Flash", icon: "⚡", hasColor: true },
    { type: "pulse", label: "Pulse", icon: "💓", hasIntensity: true },
    { type: "fade_black", label: "Fade to Black", icon: "⬛" },
    { type: "fade_white", label: "Fade to White", icon: "⬜" },
    { type: "blur", label: "Background Blur", icon: "💨", hasIntensity: true },
    { type: "distortion", label: "Distortion/Ripple", icon: "🌀", hasIntensity: true },
    { type: "sepia", label: "Sepia Filter", icon: "🟫" },
    { type: "grayscale", label: "Grayscale", icon: "⚫" },
    { type: "invert", label: "Color Invert", icon: "🔄" },
    { type: "vignette", label: "Vignette", icon: "◉", hasIntensity: true },
    { type: "scanlines", label: "Scanlines", icon: "📺" }
  ];

  // Render active effects list
  const activeEffectsList = effects.map((effect, idx) => {
    const effectDef = availableEffects.find(e => e.type === effect.type);
    return `
      <div class="effect-active-item">
        <span class="effect-icon">${effectDef ? effectDef.icon : '✨'}</span>
        <div class="effect-details">
          <strong>${effectDef ? effectDef.label : effect.type}</strong>
          <div class="effect-params">
            ${effect.intensity !== undefined ? `Intensity: ${effect.intensity}` : ''}
            ${effect.color !== undefined ? `Color: ${effect.color}` : ''}
            ${effect.duration ? `Duration: ${effect.duration}s` : ''}
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="removeEffect(${idx})">
          🗑️
        </button>
      </div>
    `;
  }).join('');

  // Render available effects grid
  const effectsGrid = availableEffects.map(effect => {
    const isActive = effects.some(e => e.type === effect.type);
    return `
      <div class="effect-option ${isActive ? 'effect-active' : ''}"
           onclick="toggleEffect('${effect.type}')">
        <div class="effect-option-icon">${effect.icon}</div>
        <div class="effect-option-label">${effect.label}</div>
        ${isActive ? '<div class="effect-checkmark">✓</div>' : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="dr-form">
      <h3>Special Effects</h3>
      <p style="color: var(--text-tertiary); margin-bottom: 1rem;">
        Add visual effects that trigger during this dialogue line.
      </p>

      ${effects.length > 0 ? `
        <div class="active-effects-list">
          <h4>Active Effects:</h4>
          ${activeEffectsList}
        </div>
      ` : ''}

      <div class="effects-grid">
        <h4>Available Effects:</h4>
        <div class="effects-grid-container">
          ${effectsGrid}
        </div>
      </div>

      <div class="effects-help">
        <small>💡 Click an effect to add/remove it. Effects will trigger when this dialogue line appears.</small>
      </div>
    </div>
  `;
}

function toggleEffect(effectType) {
  const effects = scriptLineFields.specialEffects.effects;
  const existingIndex = effects.findIndex(e => e.type === effectType);

  if (existingIndex !== -1) {
    // Remove effect
    effects.splice(existingIndex, 1);
  } else {
    // Add effect with default values
    const newEffect = { type: effectType };

    // Set defaults based on effect type
    if (['shake', 'blur', 'distortion', 'vignette', 'pulse'].includes(effectType)) {
      newEffect.intensity = 0.5;
      newEffect.duration = 0.5;
    } else if (effectType === 'flash') {
      newEffect.color = '#FFFFFF';
      newEffect.duration = 0.2;
    } else {
      newEffect.duration = 1.0;
    }

    effects.push(newEffect);
  }

  // Update only the effects tab content
  const tabContent = document.querySelector('.dr-modal-content');
  if (tabContent && scriptLineTab === 'specialEffects') {
    const line = scriptLines.find(l => l.id === activeLineId);
    tabContent.innerHTML = renderSpecialEffectsTab(line);
  }
}

function removeEffect(index) {
  scriptLineFields.specialEffects.effects.splice(index, 1);

  // Update only the effects tab content
  const tabContent = document.querySelector('.dr-modal-content');
  if (tabContent && scriptLineTab === 'specialEffects') {
    const line = scriptLines.find(l => l.id === activeLineId);
    tabContent.innerHTML = renderSpecialEffectsTab(line);
  }
}

function renderHighlightingTab(line) {
  const dialogue = line.dialogue || line.text || "";

  // Render the dialogue with highlights applied
  const highlightedText = renderHighlightedDialogue(dialogue, scriptLineFields.highlights);

  // Render existing highlights list
  const highlightsList = scriptLineFields.highlights.map((h, idx) => {
    const excerpt = dialogue.substring(h.startChar, h.endChar);
    return `
      <div class="highlight-item" style="border-left: 4px solid ${h.color};">
        <div class="highlight-info">
          <span class="highlight-text">"${excerpt}"</span>
          <span class="highlight-range">(chars ${h.startChar}-${h.endChar})</span>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="removeHighlight(${idx})">
          🗑️
        </button>
      </div>
    `;
  }).join('');

  // Render dialogue as individual character spans for selection
  const selectableDialogue = dialogue.split('').map((char, idx) =>
    `<span class="char-selectable" data-char-index="${idx}">${char === ' ' ? '&nbsp;' : char}</span>`
  ).join('');

  return `
    <div class="dr-form">
      <h3>Text Highlighting</h3>
      <p style="color: var(--text-tertiary); margin-bottom: 1rem;">
        Click and drag across the text to select the portion you want to highlight.
      </p>

      <!-- Single unified preview -->
      <div class="highlight-preview">
        <h4>Text Preview:</h4>
        <div class="preview-text" id="highlight-unified-preview">
          ${highlightedText}
        </div>
        <div class="selection-info" id="selection-info" style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-tertiary);">
          <span>Selection: <strong id="selection-range">None</strong></span>
        </div>
      </div>

      <!-- Existing highlights list -->
      ${scriptLineFields.highlights.length > 0 ? `
        <div class="highlights-list">
          <h4>Current Highlights:</h4>
          ${highlightsList}
        </div>
      ` : ''}

      <!-- Drag-to-select controls -->
      <div class="highlight-controls">
        <h4>Add New Highlight:</h4>

        <!-- Selectable dialogue text -->
        <div class="dialogue-selector" id="dialogue-selector">
          <div class="dialogue-text" data-dialogue-text="${dialogue}">
            ${selectableDialogue}
          </div>
        </div>

        <!-- Color selection -->
        <div class="color-selection">
          <label>Text Color:</label>
          <div class="color-presets">
            <button class="color-preset ${highlightingState.currentColor === '#FFFF00' ? 'active' : ''}"
                    style="background: #FFFF00;"
                    onclick="selectHighlightColor('#FFFF00')"
                    title="Yellow">
            </button>
            <button class="color-preset ${highlightingState.currentColor === '#FF0000' ? 'active' : ''}"
                    style="background: #FF0000;"
                    onclick="selectHighlightColor('#FF0000')"
                    title="Red">
            </button>
            <button class="color-preset ${highlightingState.currentColor === '#00FF00' ? 'active' : ''}"
                    style="background: #00FF00;"
                    onclick="selectHighlightColor('#00FF00')"
                    title="Green">
            </button>
            <input type="color" value="${highlightingState.currentColor}"
                   onchange="selectHighlightColor(this.value)"
                   title="Custom color">
          </div>
          <div class="current-color-preview" style="background: ${highlightingState.currentColor};">
            <span>${highlightingState.currentColor}</span>
          </div>
        </div>

        <div class="highlight-button-row">
          <button class="btn btn-primary" onclick="addHighlightFromSelection()" id="add-highlight-btn" disabled>
            ➕ Add Highlight
          </button>
          <button class="btn btn-secondary" onclick="clearSelection()">
            ❌ Clear Selection
          </button>
        </div>
      </div>
    </div>
  `;
}

// Initialize drag selection after rendering highlighting tab
function initializeDragSelection() {
  const dialogueSelector = document.getElementById('dialogue-selector');
  if (!dialogueSelector) return;

  const dialogueText = dialogueSelector.querySelector('.dialogue-text');
  const selectionInfo = document.getElementById('selection-info');
  const selectionRange = document.getElementById('selection-range');
  const addButton = document.getElementById('add-highlight-btn');

  let isSelecting = false;
  let startIndex = -1;
  let currentEndIndex = -1;

  // Mouse down - start selection
  dialogueText.addEventListener('mousedown', (e) => {
    if (!e.target.classList.contains('char-selectable')) return;

    isSelecting = true;
    startIndex = parseInt(e.target.dataset.charIndex);
    currentEndIndex = startIndex;

    clearPreviousSelection();
    highlightingState.startChar = startIndex;
    highlightingState.endChar = startIndex + 1;

    updateSelectionDisplay();
  });

  // Mouse move - extend selection
  dialogueText.addEventListener('mousemove', (e) => {
    if (!isSelecting) return;
    if (!e.target.classList.contains('char-selectable')) return;

    currentEndIndex = parseInt(e.target.dataset.charIndex);

    // Calculate proper start/end (handle backward selection)
    const selStart = Math.min(startIndex, currentEndIndex);
    const selEnd = Math.max(startIndex, currentEndIndex) + 1;

    highlightingState.startChar = selStart;
    highlightingState.endChar = selEnd;

    clearPreviousSelection();
    updateSelectionDisplay();
  });

  // Mouse up - finish selection
  document.addEventListener('mouseup', () => {
    if (isSelecting) {
      isSelecting = false;

      // Enable add button if valid selection
      const validSelection = highlightingState.endChar > highlightingState.startChar;
      if (addButton) {
        addButton.disabled = !validSelection;
      }
    }
  });

  function clearPreviousSelection() {
    dialogueText.querySelectorAll('.char-selectable').forEach(span => {
      span.classList.remove('char-selected');
    });
  }

  function updateSelectionDisplay() {
    const line = scriptLines.find(l => l.id === activeLineId);
    const dialogue = line.dialogue || "";

    // Highlight selected characters in the selectable text
    const spans = dialogueText.querySelectorAll('.char-selectable');
    for (let i = highlightingState.startChar; i < highlightingState.endChar; i++) {
      if (spans[i]) {
        spans[i].classList.add('char-selected');
      }
    }

    // Update selection info
    const selectedText = dialogue.substring(highlightingState.startChar, highlightingState.endChar);
    selectionRange.innerHTML = highlightingState.endChar > highlightingState.startChar
      ? `"${selectedText}" (${highlightingState.startChar}-${highlightingState.endChar})`
      : 'None';

    // Update unified preview with live selection + existing highlights
    const unifiedPreview = document.getElementById('highlight-unified-preview');
    if (unifiedPreview) {
      const tempHighlights = [...scriptLineFields.highlights];
      if (highlightingState.endChar > highlightingState.startChar) {
        tempHighlights.push({
          startChar: highlightingState.startChar,
          endChar: highlightingState.endChar,
          color: highlightingState.currentColor,
          isTemp: true  // Mark as temporary
        });
      }
      unifiedPreview.innerHTML = renderHighlightedDialogue(dialogue, tempHighlights);
    }
  }
}

// Render dialogue with all highlights applied
function renderHighlightedDialogue(dialogue, highlights) {
  if (!dialogue) return '<em>No dialogue text</em>';
  if (!highlights || highlights.length === 0) return dialogue;

  // Sort highlights by start position to apply them correctly
  const sorted = [...highlights].sort((a, b) => a.startChar - b.startChar);

  // Build highlighted HTML
  let result = '';
  let lastIndex = 0;

  sorted.forEach(h => {
    // Add text before highlight
    result += dialogue.substring(lastIndex, h.startChar);
    // Add highlighted text
    result += `<span style="color: ${h.color}; font-weight: 600;">`;
    result += dialogue.substring(h.startChar, h.endChar);
    result += '</span>';
    lastIndex = h.endChar;
  });

  // Add remaining text
  result += dialogue.substring(lastIndex);

  return result;
}

// Render preview of current selection (before adding)
function renderSelectionPreview(dialogue, start, end, color) {
  if (!dialogue || start >= end || start < 0 || end > dialogue.length) {
    return '<em>Invalid selection</em>';
  }

  return dialogue.substring(0, start) +
         `<span style="background-color: ${color}; padding: 2px 4px; border-radius: 3px;">` +
         dialogue.substring(start, end) +
         '</span>' +
         dialogue.substring(end);
}

// Clear text selection
function clearSelection() {
  highlightingState.startChar = 0;
  highlightingState.endChar = 0;

  const dialogueText = document.querySelector('.dialogue-text');
  if (dialogueText) {
    dialogueText.querySelectorAll('.char-selectable').forEach(span => {
      span.classList.remove('char-selected');
    });
  }

  const selectionRange = document.getElementById('selection-range');
  if (selectionRange) {
    selectionRange.innerHTML = 'None';
  }

  const livePreview = document.getElementById('selection-live-preview');
  if (livePreview) {
    livePreview.innerHTML = '<em>Drag across the text above to select</em>';
  }

  const addButton = document.getElementById('add-highlight-btn');
  if (addButton) {
    addButton.disabled = true;
  }
}

// Select color (updated to avoid full re-render)
function selectHighlightColor(color) {
  highlightingState.currentColor = color;

  // Update color preview without full re-render
  const colorPreview = document.querySelector('.current-color-preview');
  if (colorPreview) {
    colorPreview.style.background = color;
    colorPreview.querySelector('span').textContent = color;
  }

  // Update color preset active states
  document.querySelectorAll('.color-preset').forEach(btn => {
    const btnColor = btn.style.background.toLowerCase();
    const targetColor = color.toLowerCase();
    if (btnColor === targetColor || rgbToHex(btnColor) === targetColor) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update live preview if selection exists
  const line = scriptLines.find(l => l.id === activeLineId);
  const livePreview = document.getElementById('selection-live-preview');
  if (livePreview && highlightingState.endChar > highlightingState.startChar && line) {
    livePreview.innerHTML = renderSelectionPreview(
      line.dialogue,
      highlightingState.startChar,
      highlightingState.endChar,
      color
    );
  }
}

// Helper function to convert RGB to hex for color comparison
function rgbToHex(rgb) {
  if (rgb.startsWith('#')) return rgb.toLowerCase();
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return rgb;
  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

// Add highlight from drag selection
function addHighlightFromSelection() {
  const line = scriptLines.find(l => l.id === activeLineId);
  const dialogue = line.dialogue || "";

  // Validate
  if (highlightingState.startChar >= highlightingState.endChar) {
    modalErr = "Please select text to highlight.";
    renderScriptLineModal();
    return;
  }

  if (highlightingState.startChar < 0 || highlightingState.endChar > dialogue.length) {
    modalErr = "Invalid selection range.";
    renderScriptLineModal();
    return;
  }

  // Add highlight
  scriptLineFields.highlights.push({
    startChar: highlightingState.startChar,
    endChar: highlightingState.endChar,
    color: highlightingState.currentColor
  });

  // Reset state
  highlightingState.startChar = 0;
  highlightingState.endChar = 0;
  modalErr = "";

  // Re-render to show updated highlights
  renderScriptLineModal();

  // Re-initialize drag selection after re-render
  setTimeout(() => initializeDragSelection(), 0);
}

// Remove highlight
function removeHighlight(index) {
  scriptLineFields.highlights.splice(index, 1);
  renderScriptLineModal();

  // Re-initialize drag selection after re-render
  setTimeout(() => initializeDragSelection(), 0);
}

// ==================== Minigame Modal Functions ====================

function openMinigameModal(gameId) {
  if (!dirHandle) {
    alert("Choose a folder first!");
    return;
  }

  const mg = minigames.find(m => m.gameId === gameId);

  if (!mg) {
    console.error('ERROR: Could not find minigame with ID:', gameId);
    console.error('Available minigames:', minigames);
    alert('Error: Minigame not found. Please try again.');
    return;
  }

  console.log('Opening minigame modal for:', mg);

  activeMinigameId = gameId;
  minigameTab = "common";
  modalErr = "";
  modalMsg = "";

  // Ensure typeSpecific exists before opening modal
  if (!mg.typeSpecific) {
    console.warn('Initializing missing typeSpecific in openMinigameModal');
    mg.typeSpecific = { selectedBullets: [], dialogueLines: [] };
  }

  minigameFields = {
    name: mg.name || "",
    gameType: mg.gameType || "nonstop_debate",
    difficulty: mg.difficulty || "medium",
    timeLimit: mg.timeLimit || 60,
    typeSpecific: { ...mg.typeSpecific } || {}
  };

  renderMinigameModal();
}

function renderMinigameModal() {
  const root = document.getElementById("modalroot");
  const mg = minigames.find(m => m.gameId === activeMinigameId);

  const availableTabs = ['common', minigameFields.gameType];
  let tabContent = "";

  if (minigameTab === 'common') {
    tabContent = renderMinigameCommonTab(mg);
  } else if (minigameTab === 'nonstop_debate') {
    tabContent = renderNonstopDebateTab(mg);
  } else if (minigameTab === 'mass_panic_debate') {
    tabContent = renderPlaceholderTab('Mass Panic Debate');
  } else if (minigameTab === 'logic_dive') {
    tabContent = renderPlaceholderTab('Logic Dive');
  } else if (minigameTab === 'hangmans_gambit') {
    tabContent = renderPlaceholderTab('Hangman\'s Gambit');
  } else if (minigameTab === 'debate_scrum') {
    tabContent = renderPlaceholderTab('Debate Scrum');
  } else if (minigameTab === 'rebuttal_showdown') {
    tabContent = renderPlaceholderTab('Rebuttal Showdown');
  } else if (minigameTab === 'psyche_taxi') {
    tabContent = renderPlaceholderTab('Psyche Taxi');
  } else if (minigameTab === 'closing_argument') {
    tabContent = renderPlaceholderTab('Closing Argument');
  }

  root.innerHTML = `
    <div class="dr-modal-bg">
      <div class="dr-modal">
        <button class="dr-close" onclick="closeMinigameModal()">&times;</button>

        <div class="dr-tabs">
          <div class="dr-tab ${minigameTab === 'common' ? 'active' : ''}"
               onclick="switchMinigameTab('common')">
            ⚙️ Common Settings
          </div>
          <div class="dr-tab ${minigameTab === minigameFields.gameType ? 'active' : ''}"
               onclick="switchMinigameTab('${minigameFields.gameType}')">
            ${getMinigameTabIcon(minigameFields.gameType)} ${getMinigameTabLabel(minigameFields.gameType)}
          </div>
        </div>

        <div class="dr-modal-content">
          ${tabContent}
        </div>

        ${modalErr ? `<div class="dr-err">${modalErr}</div>` : ""}
        ${modalMsg ? `<div class="dr-success">${modalMsg}</div>` : ""}

        <div class="dr-btn-row">
          <button class="btn btn-secondary" onclick="closeMinigameModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveMinigame()">Save Minigame</button>
        </div>
      </div>
    </div>
  `;
}

function getMinigameTabIcon(gameType) {
  const icons = {
    'nonstop_debate': '💬',
    'mass_panic_debate': '🗣️',
    'logic_dive': '🎿',
    'hangmans_gambit': '📝',
    'debate_scrum': '⚔️',
    'rebuttal_showdown': '🔫',
    'psyche_taxi': '🚕',
    'closing_argument': '⚖️'
  };
  return icons[gameType] || '🎮';
}

function getMinigameTabLabel(gameType) {
  const labels = {
    'nonstop_debate': 'Nonstop Debate Settings',
    'mass_panic_debate': 'Mass Panic Debate Settings',
    'logic_dive': 'Logic Dive Settings',
    'hangmans_gambit': 'Hangman\'s Gambit Settings',
    'debate_scrum': 'Debate Scrum Settings',
    'rebuttal_showdown': 'Rebuttal Showdown Settings',
    'psyche_taxi': 'Psyche Taxi Settings',
    'closing_argument': 'Closing Argument Settings'
  };
  return labels[gameType] || 'Game Settings';
}

function switchMinigameTab(tab) {
  minigameTab = tab;
  modalErr = "";
  modalMsg = "";
  renderMinigameModal();
}

function closeMinigameModal() {
  document.getElementById("modalroot").innerHTML = "";
  activeMinigameId = null;
}

function renderMinigameCommonTab(mg) {
  return `
    <div class="dr-form">
      <h3>Minigame Configuration</h3>

      <div class="minigame-id-display">
        <label>Game ID (Read-only):</label>
        <code>${mg.gameId}</code>
      </div>

      <div class="dr-fg-row">
        <div class="dr-fg-field">
          <label>Minigame Name:</label>
          <input type="text"
                 value="${minigameFields.name || ''}"
                 oninput="updateMinigameField('name', this.value)"
                 placeholder="Enter a descriptive name...">
        </div>
      </div>

      <div class="dr-fg-row">
        <div class="dr-fg-field">
          <label>Game Type:</label>
          <select onchange="updateMinigameGameType(this.value)">
            <option value="nonstop_debate" ${minigameFields.gameType === 'nonstop_debate' ? 'selected' : ''}>
              Nonstop Debate
            </option>
            <option value="mass_panic_debate" ${minigameFields.gameType === 'mass_panic_debate' ? 'selected' : ''}>
              Mass Panic Debate
            </option>
            <option value="logic_dive" ${minigameFields.gameType === 'logic_dive' ? 'selected' : ''}>
              Logic Dive
            </option>
            <option value="hangmans_gambit" ${minigameFields.gameType === 'hangmans_gambit' ? 'selected' : ''}>
              Hangman's Gambit
            </option>
            <option value="debate_scrum" ${minigameFields.gameType === 'debate_scrum' ? 'selected' : ''}>
              Debate Scrum
            </option>
            <option value="rebuttal_showdown" ${minigameFields.gameType === 'rebuttal_showdown' ? 'selected' : ''}>
              Rebuttal Showdown
            </option>
            <option value="psyche_taxi" ${minigameFields.gameType === 'psyche_taxi' ? 'selected' : ''}>
              Psyche Taxi
            </option>
            <option value="closing_argument" ${minigameFields.gameType === 'closing_argument' ? 'selected' : ''}>
              Closing Argument
            </option>
          </select>
        </div>
        <div class="dr-fg-field">
          <label>Difficulty:</label>
          <select onchange="updateMinigameField('difficulty', this.value)">
            <option value="easy" ${minigameFields.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
            <option value="medium" ${minigameFields.difficulty === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="hard" ${minigameFields.difficulty === 'hard' ? 'selected' : ''}>Hard</option>
          </select>
        </div>
      </div>

      <div class="dr-fg-row">
        <div class="dr-fg-field">
          <label>Time Limit (seconds):</label>
          <input type="number"
                 min="10"
                 max="600"
                 step="5"
                 value="${minigameFields.timeLimit || 60}"
                 onchange="updateMinigameField('timeLimit', parseInt(this.value))">
        </div>
      </div>
    </div>
  `;
}

function renderPlaceholderTab(gameName) {
  return `
    <div class="dr-form">
      <h3>${gameName} Configuration</h3>
      <p style="color: var(--text-tertiary);">
        Configure ${gameName.toLowerCase()} settings for this minigame instance.
      </p>

      <div class="placeholder-content">
        <p>${gameName} specific settings will be implemented in a future update.</p>
      </div>
    </div>
  `;
}

function renderNonstopDebateTab(mg) {
  try {
    console.log('=== Rendering Nonstop Debate Tab ===');
    console.log('Minigame object:', mg);
    console.log('Truth bullets available:', truthBullets);
    console.log('Cast available:', cast);
    console.log('Active minigame ID:', activeMinigameId);

    // Null safety check for minigame object
    if (!mg) {
      console.error('ERROR: Minigame object is null/undefined');
      return `
        <div class="dr-form">
          <h3>Error: Minigame Not Found</h3>
          <p style="color: var(--error);">The minigame object could not be loaded. Please try closing and reopening the modal.</p>
        </div>
      `;
    }

    // Null safety check for truthBullets
    if (!truthBullets) {
      console.error('ERROR: truthBullets is null/undefined');
      truthBullets = [];
    }
    if (!Array.isArray(truthBullets)) {
      console.error('ERROR: truthBullets is not an array:', typeof truthBullets);
      truthBullets = [];
    }

    // Null safety check for cast
    if (!cast) {
      console.error('ERROR: cast is null/undefined');
      cast = Array(17).fill(null);
    }

    // Initialize typeSpecific if needed
    if (!mg.typeSpecific) {
      console.warn('Initializing missing typeSpecific');
      mg.typeSpecific = { selectedBullets: [], dialogueLines: [] };
    }
    if (!mg.typeSpecific.selectedBullets) {
      console.warn('Initializing missing selectedBullets');
      mg.typeSpecific.selectedBullets = [];
    }
    if (!mg.typeSpecific.dialogueLines) {
      console.warn('Initializing missing dialogueLines');
      mg.typeSpecific.dialogueLines = [];
    }

    const selectedBullets = mg.typeSpecific.selectedBullets || [];
    const dialogueLines = mg.typeSpecific.dialogueLines || [];

    console.log('Selected bullets:', selectedBullets);
    console.log('Dialogue lines:', dialogueLines);

    // Render bullet selection grid
    const bulletSelectionHtml = truthBullets.map(bullet => {
    const isSelected = selectedBullets.includes(bullet.bulletId);
    return `
      <div class="bullet-select-item ${isSelected ? 'selected' : ''}"
           onclick="toggleBulletSelection('${bullet.bulletId}')">
        <div class="bullet-select-checkbox">${isSelected ? '✓' : ''}</div>
        <div class="bullet-select-image">
          ${bullet.imageDataURL ? `<img src="${bullet.imageDataURL}" alt="${bullet.name}">` : '📷'}
        </div>
        <div class="bullet-select-info">
          <div class="bullet-select-name">${bullet.name || 'Unnamed'}</div>
          <div class="bullet-select-desc">${bullet.description || ''}</div>
        </div>
      </div>
    `;
  }).join('');

  // Render dialogue lines list
  const dialogueLinesHtml = dialogueLines
    .sort((a, b) => a.order - b.order)
    .map((line, index) => renderDebateDialogueBar(line, index))
    .join('');

  return `
    <div class="dr-form">
      <h3>Nonstop Debate Configuration</h3>

      <!-- Bullet Selection Section -->
      <div class="nsd-section">
        <h4>Truth Bullets (Select up to 6)</h4>
        <p style="color: var(--text-tertiary); font-size: 0.875rem;">
          Selected: ${selectedBullets.length}/6
        </p>

        ${truthBullets.length === 0 ? `
          <div class="placeholder-content">
            <p>No truth bullets available.</p>
            <p>Visit the Truth Bullets section to create evidence.</p>
          </div>
        ` : `
          <div class="bullet-selection-grid">
            ${bulletSelectionHtml}
          </div>
        `}
      </div>

      <!-- Dialogue Lines Section -->
      <div class="nsd-section">
        <h4>Debate Dialogue Lines (${dialogueLines.length}/30)</h4>

        ${dialogueLines.length === 0 ? `
          <div class="placeholder-content">
            <p>No dialogue lines yet.</p>
            <button class="btn btn-primary" onclick="addDebateDialogueLine()">
              ➕ Add Dialogue Line
            </button>
          </div>
        ` : `
          <div class="nsd-dialogue-header">
            <button class="btn btn-primary" onclick="addDebateDialogueLine()"
                    ${dialogueLines.length >= 30 ? 'disabled' : ''}>
              ➕ Add Dialogue Line
            </button>
          </div>
          <div class="nsd-dialogue-list">
            ${dialogueLinesHtml}
          </div>
        `}
      </div>
    </div>
  `;
  } catch (error) {
    console.error('CRITICAL ERROR in renderNonstopDebateTab:', error);
    console.error('Stack trace:', error.stack);
    return `
      <div class="dr-form">
        <h3>Error Rendering Tab</h3>
        <p style="color: var(--error);">An error occurred while rendering the Nonstop Debate settings.</p>
        <details>
          <summary>Error Details (for debugging)</summary>
          <pre style="background: var(--bg-tertiary); padding: 1rem; border-radius: 4px; font-size: 0.75rem;">
${error.message}

${error.stack}
          </pre>
        </details>
        <p style="margin-top: 1rem;">Please check the browser console (F12) for more information.</p>
      </div>
    `;
  }
}

function toggleBulletSelection(bulletId) {
  const mg = minigames.find(m => m.gameId === activeMinigameId);
  if (!mg || !mg.typeSpecific) return;

  const selectedBullets = mg.typeSpecific.selectedBullets;
  const index = selectedBullets.indexOf(bulletId);

  if (index !== -1) {
    // Deselect
    selectedBullets.splice(index, 1);
  } else {
    // Select (max 6)
    if (selectedBullets.length >= 6) {
      modalErr = "Maximum 6 truth bullets can be selected.";
      setTimeout(() => {
        modalErr = "";
        renderMinigameModal();
      }, 2000);
      return;
    }
    selectedBullets.push(bulletId);
  }

  renderMinigameModal();
}

function renderDebateDialogueBar(line, index) {
  const fullSentence = `${line.sentenceBeginning || ''}${line.target || ''}${line.sentenceEnd || ''}`;

  // Add defensive check for cast
  let characterName = 'No character';
  if (cast && Array.isArray(cast)) {
    const character = cast.find(c => c && c.id === line.characterId);
    if (character) {
      characterName = `${character.name} ${character.surname}`;
    }
  } else {
    console.warn('Cast array not available in renderDebateDialogueBar');
  }

  return `
    <div class="nsd-dialogue-line-bar ${line.isCorrect ? 'nsd-line-correct' : 'nsd-line-incorrect'}"
         data-line-id="${line.lineId}"
         draggable="true"
         ondragstart="handleDebateLineDragStart(event, '${line.lineId}')"
         ondragend="handleDebateLineDragEnd(event)"
         ondragover="handleDebateLineDragOver(event)"
         ondrop="handleDebateLineDrop(event, '${line.lineId}')">

      <div class="nsd-line-number">#${index + 1}</div>

      <div class="nsd-line-content">
        <div class="nsd-line-sentence">"${fullSentence || 'Empty line'}"</div>
        <div class="nsd-line-meta">
          <span>${characterName}</span>
          ${line.isCorrect ? '<span class="nsd-correct-badge">✓ Correct</span>' : '<span class="nsd-incorrect-badge">✗ Incorrect</span>'}
        </div>
      </div>

      <button class="script-line-edit"
              onclick="event.stopPropagation(); openDebateDialogueModal('${line.lineId}')"
              title="Edit dialogue">✏️</button>

      <button class="script-line-delete"
              onclick="event.stopPropagation(); deleteDebateDialogueLine('${line.lineId}')"
              title="Delete dialogue">🗑️</button>
    </div>
  `;
}

function generateDebateLineId() {
  return `nsd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function addDebateDialogueLine() {
  const mg = minigames.find(m => m.gameId === activeMinigameId);
  if (!mg || !mg.typeSpecific) return;

  if (mg.typeSpecific.dialogueLines.length >= 30) {
    modalErr = "Maximum 30 dialogue lines per debate.";
    renderMinigameModal();
    return;
  }

  const newLine = {
    lineId: generateDebateLineId(),
    order: mg.typeSpecific.dialogueLines.length,
    sentenceBeginning: "",
    target: "",
    sentenceEnd: "",
    isCorrect: false,
    userFailedComment: "",
    userWrongAnswerComment: "",
    textEffect: "none",
    textMovementDirection: "none",
    textFont: "default",
    characterId: "",
    characterSpotlight: false,
    voiceLineFile: null
  };

  mg.typeSpecific.dialogueLines.push(newLine);
  renderMinigameModal();
  openDebateDialogueModal(newLine.lineId);
}

function deleteDebateDialogueLine(lineId) {
  const mg = minigames.find(m => m.gameId === activeMinigameId);
  if (!mg || !mg.typeSpecific) return;

  mg.typeSpecific.dialogueLines = mg.typeSpecific.dialogueLines.filter(l => l.lineId !== lineId);

  // Reorder remaining lines
  mg.typeSpecific.dialogueLines.forEach((line, index) => {
    line.order = index;
  });

  renderMinigameModal();
  autoSaveTrial();
}

// Drag-and-drop handlers for dialogue lines
let draggedDebateLineId = null;

function handleDebateLineDragStart(event, lineId) {
  draggedDebateLineId = lineId;
  event.target.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
}

function handleDebateLineDragEnd(event) {
  event.target.classList.remove('dragging');
  draggedDebateLineId = null;
}

function handleDebateLineDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function handleDebateLineDrop(event, targetLineId) {
  event.preventDefault();
  event.stopPropagation();

  if (!draggedDebateLineId || draggedDebateLineId === targetLineId) return;

  const mg = minigames.find(m => m.gameId === activeMinigameId);
  if (!mg || !mg.typeSpecific) return;

  const lines = mg.typeSpecific.dialogueLines;
  const draggedIndex = lines.findIndex(l => l.lineId === draggedDebateLineId);
  const targetIndex = lines.findIndex(l => l.lineId === targetLineId);

  if (draggedIndex === -1 || targetIndex === -1) return;

  // Remove dragged line and insert at target position
  const [draggedLine] = lines.splice(draggedIndex, 1);
  lines.splice(targetIndex, 0, draggedLine);

  // Update order fields
  lines.forEach((line, index) => {
    line.order = index;
  });

  renderMinigameModal();
  autoSaveTrial();
}

function updateMinigameField(field, value) {
  minigameFields[field] = value;
}

function updateMinigameGameType(newType) {
  minigameFields.gameType = newType;
  minigameTab = 'common';
  renderMinigameModal();
}

function saveMinigame() {
  const mg = minigames.find(m => m.gameId === activeMinigameId);
  if (!mg) {
    alert("Minigame not found!");
    closeMinigameModal();
    return;
  }

  if (!minigameFields.name.trim()) {
    modalErr = "Please enter a minigame name.";
    renderMinigameModal();
    return;
  }

  mg.name = minigameFields.name;
  mg.gameType = minigameFields.gameType;
  mg.difficulty = minigameFields.difficulty;
  mg.timeLimit = minigameFields.timeLimit;
  mg.typeSpecific = minigameFields.typeSpecific;

  autoSaveTrial();
  closeMinigameModal();
  renderMinigameDetails();
}

// ==================== Truth Bullet Modal Functions ====================

function openTruthBulletModal(bulletId) {
  if (!dirHandle) {
    alert("Choose a folder first!");
    return;
  }

  activeBulletId = bulletId;
  modalErr = "";
  modalMsg = "";

  const bullet = truthBullets.find(b => b.bulletId === bulletId);
  if (!bullet) {
    alert("Truth bullet not found!");
    return;
  }

  bulletFields = {
    name: bullet.name || "",
    description: bullet.description || "",
    imageFile: bullet.imageFile || null,
    imageBlob: null,
    inversedLieBulletName: bullet.inversedLieBulletName || ""
  };

  renderTruthBulletModal();
}

function renderTruthBulletModal() {
  const root = document.getElementById("modalroot");
  const bullet = truthBullets.find(b => b.bulletId === activeBulletId);

  const hasImage = bulletFields.imageFile !== null;

  root.innerHTML = `
    <div class="dr-modal-bg">
      <div class="dr-modal">
        <button class="dr-close" onclick="closeTruthBulletModal()">&times;</button>

        <div class="dr-modal-content">
          <div class="dr-form">
            <h3>Truth Bullet Configuration</h3>

            <div class="minigame-id-display">
              <label>Bullet ID (Read-only):</label>
              <code>${bullet.bulletId}</code>
            </div>

            <div class="dr-fg-row">
              <div class="dr-fg-field">
                <label>Bullet Name:</label>
                <input type="text"
                       value="${bulletFields.name}"
                       oninput="updateBulletField('name', this.value)"
                       placeholder="E.g., Bloody Knife">
              </div>
            </div>

            <div class="dr-fg-row">
              <div class="dr-fg-field">
                <label>Description:</label>
                <textarea rows="3"
                          oninput="updateBulletField('description', this.value)"
                          placeholder="Describe this evidence...">${bulletFields.description}</textarea>
              </div>
            </div>

            <div class="dr-fg-row">
              <div class="dr-fg-field">
                <label>Inversed Lie Bullet Name:</label>
                <input type="text"
                       value="${bulletFields.inversedLieBulletName}"
                       oninput="updateBulletField('inversedLieBulletName', this.value)"
                       placeholder="E.g., Clean Knife">
                <small style="color: var(--text-tertiary);">Name when converted to a lie</small>
              </div>
            </div>

            <div class="dr-fg-row">
              <div class="dr-fg-field">
                <label>Bullet Image:</label>
                ${hasImage ? `
                  <div class="bullet-image-preview">
                    <img src="${bullet.imageDataURL || ''}" alt="Bullet image">
                    <button class="btn btn-secondary" onclick="clearBulletImage()">🗑️ Remove Image</button>
                  </div>
                ` : `
                  <div class="bullet-image-empty">
                    <p>No image uploaded</p>
                  </div>
                `}
                <input type="file" accept="image/*" id="bulletImageInput"
                       onchange="handleBulletImageUpload(event)" style="display: none;">
                <button class="btn btn-primary" onclick="triggerBulletImageInput()">
                  📁 ${hasImage ? 'Replace' : 'Upload'} Image
                </button>
              </div>
            </div>
          </div>
        </div>

        ${modalErr ? `<div class="dr-err">${modalErr}</div>` : ""}
        ${modalMsg ? `<div class="dr-success">${modalMsg}</div>` : ""}

        <div class="dr-btn-row">
          <button class="btn btn-secondary" onclick="closeTruthBulletModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveTruthBullet()">Save Bullet</button>
        </div>
      </div>
    </div>
  `;
}

function updateBulletField(field, value) {
  bulletFields[field] = value;
}

function triggerBulletImageInput() {
  document.getElementById('bulletImageInput').click();
}

function handleBulletImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    modalErr = "Please select a valid image file.";
    renderTruthBulletModal();
    return;
  }

  bulletFields.imageFile = file.name;
  bulletFields.imageBlob = file;
  modalErr = "";
  renderTruthBulletModal();
}

function clearBulletImage() {
  bulletFields.imageFile = null;
  bulletFields.imageBlob = null;
  renderTruthBulletModal();
}

function closeTruthBulletModal() {
  document.getElementById("modalroot").innerHTML = "";
  activeBulletId = null;
}

async function saveTruthBullet() {
  const bullet = truthBullets.find(b => b.bulletId === activeBulletId);
  if (!bullet) {
    alert("Bullet not found!");
    closeTruthBulletModal();
    return;
  }

  if (!bulletFields.name.trim()) {
    modalErr = "Please enter a bullet name.";
    renderTruthBulletModal();
    return;
  }

  try {
    showLoader(true);

    // Handle image upload
    if (bulletFields.imageBlob) {
      const bulletsDir = await dirHandle.getDirectoryHandle("TruthBullets", { create: true });
      const imageFileName = `${bullet.bulletId}.${bulletFields.imageBlob.name.split('.').pop()}`;
      const imageFileHandle = await bulletsDir.getFileHandle(imageFileName, { create: true });
      const writable = await imageFileHandle.createWritable();
      await writable.write(bulletFields.imageBlob);
      await writable.close();

      bullet.imageFile = imageFileName;

      // Store data URL for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        bullet.imageDataURL = e.target.result;
      };
      reader.readAsDataURL(bulletFields.imageBlob);
    } else if (bulletFields.imageFile === null && bullet.imageFile) {
      // Image was cleared, remove the file
      try {
        const bulletsDir = await dirHandle.getDirectoryHandle("TruthBullets", { create: false });
        await bulletsDir.removeEntry(bullet.imageFile);
      } catch (e) {
        console.warn("Could not remove image file:", e);
      }
      bullet.imageFile = null;
      bullet.imageDataURL = null;
    }

    bullet.name = bulletFields.name;
    bullet.description = bulletFields.description;
    bullet.inversedLieBulletName = bulletFields.inversedLieBulletName;

    await autoSaveTrial();

    showLoader(false);
    closeTruthBulletModal();
    renderTruthBulletsView();

  } catch (error) {
    console.error("Error saving truth bullet:", error);
    showLoader(false);
    modalErr = "Failed to save: " + error.message;
    renderTruthBulletModal();
  }
}

// ==================== Debate Dialogue Line Modal ====================

function openDebateDialogueModal(lineId) {
  if (!dirHandle) {
    alert("Choose a folder first!");
    return;
  }

  const mg = minigames.find(m => m.gameId === activeMinigameId);
  if (!mg || !mg.typeSpecific) return;

  const line = mg.typeSpecific.dialogueLines.find(l => l.lineId === lineId);
  if (!line) {
    alert("Dialogue line not found!");
    return;
  }

  activeDebateLineId = lineId;
  debateLineTab = "sentence";
  modalErr = "";
  modalMsg = "";

  debateLineFields = {
    sentenceBeginning: line.sentenceBeginning || "",
    target: line.target || "",
    sentenceEnd: line.sentenceEnd || "",
    isCorrect: line.isCorrect || false,
    userFailedComment: line.userFailedComment || "",
    userWrongAnswerComment: line.userWrongAnswerComment || "",
    textEffect: line.textEffect || "none",
    textMovementDirection: line.textMovementDirection || "none",
    textFont: line.textFont || "default",
    characterId: line.characterId || "",
    characterSpotlight: line.characterSpotlight || false,
    voiceLineFile: line.voiceLineFile || null,
    voiceLineBlob: null
  };

  renderDebateDialogueModal();
}

function renderDebateDialogueModal() {
  const root = document.getElementById("modalroot");
  const mg = minigames.find(m => m.gameId === activeMinigameId);
  const line = mg.typeSpecific.dialogueLines.find(l => l.lineId === activeDebateLineId);

  const tabs = ['sentence', 'target', 'feedback', 'effects', 'character'];
  let tabContent = "";

  if (debateLineTab === 'sentence') {
    tabContent = renderSentenceTab();
  } else if (debateLineTab === 'target') {
    tabContent = renderTargetTab();
  } else if (debateLineTab === 'feedback') {
    tabContent = renderFeedbackTab();
  } else if (debateLineTab === 'effects') {
    tabContent = renderEffectsTab();
  } else if (debateLineTab === 'character') {
    tabContent = renderCharacterTab();
  }

  root.innerHTML = `
    <div class="dr-modal-bg">
      <div class="dr-modal">
        <button class="dr-close" onclick="closeDebateDialogueModal()">&times;</button>

        <div class="dr-tabs">
          <div class="dr-tab ${debateLineTab === 'sentence' ? 'active' : ''}"
               onclick="switchDebateLineTab('sentence')">
            📝 Sentence
          </div>
          <div class="dr-tab ${debateLineTab === 'target' ? 'active' : ''}"
               onclick="switchDebateLineTab('target')">
            🎯 Target
          </div>
          <div class="dr-tab ${debateLineTab === 'feedback' ? 'active' : ''}"
               onclick="switchDebateLineTab('feedback')">
            💬 Feedback
          </div>
          <div class="dr-tab ${debateLineTab === 'effects' ? 'active' : ''}"
               onclick="switchDebateLineTab('effects')">
            ✨ Effects
          </div>
          <div class="dr-tab ${debateLineTab === 'character' ? 'active' : ''}"
               onclick="switchDebateLineTab('character')">
            👤 Character
          </div>
        </div>

        <div class="dr-modal-content">
          ${tabContent}
        </div>

        ${modalErr ? `<div class="dr-err">${modalErr}</div>` : ""}
        ${modalMsg ? `<div class="dr-success">${modalMsg}</div>` : ""}

        <div class="dr-btn-row">
          <button class="btn btn-secondary" onclick="closeDebateDialogueModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveDebateDialogueLine()">Save Line</button>
        </div>
      </div>
    </div>
  `;
}

function switchDebateLineTab(tab) {
  debateLineTab = tab;
  modalErr = "";
  modalMsg = "";
  renderDebateDialogueModal();
}

function closeDebateDialogueModal() {
  document.getElementById("modalroot").innerHTML = "";
  activeDebateLineId = null;
}

function renderSentenceTab() {
  const fullSentence = `${debateLineFields.sentenceBeginning}${debateLineFields.target}${debateLineFields.sentenceEnd}`;

  return `
    <div class="dr-form">
      <h3>3-Part Sentence Structure</h3>
      <p style="color: var(--text-tertiary);">
        Split the sentence into three parts: before target, target (weak point), and after target.
      </p>

      <div class="sentence-preview">
        <h4>Live Preview:</h4>
        <div class="sentence-preview-text" id="sentencePreview">
          ${debateLineFields.sentenceBeginning}
          <span class="sentence-target">${debateLineFields.target || '[target]'}</span>
          ${debateLineFields.sentenceEnd}
        </div>
      </div>

      <div class="dr-fg-row">
        <div class="dr-fg-field">
          <label>Before Target:</label>
          <input type="text"
                 value="${debateLineFields.sentenceBeginning}"
                 oninput="updateDebateLineField('sentenceBeginning', this.value); updateSentencePreview()"
                 placeholder="I think that">
        </div>
      </div>

      <div class="dr-fg-row">
        <div class="dr-fg-field">
          <label>Target (Weak Point):</label>
          <input type="text"
                 value="${debateLineFields.target}"
                 oninput="updateDebateLineField('target', this.value); updateSentencePreview()"
                 placeholder="the murder weapon"
                 style="font-weight: 600; color: var(--error);">
          <small style="color: var(--text-tertiary);">This is the part players will shoot</small>
        </div>
      </div>

      <div class="dr-fg-row">
        <div class="dr-fg-field">
          <label>After Target:</label>
          <input type="text"
                 value="${debateLineFields.sentenceEnd}"
                 oninput="updateDebateLineField('sentenceEnd', this.value); updateSentencePreview()"
                 placeholder="was left at the scene">
        </div>
      </div>
    </div>
  `;
}

function renderTargetTab() {
  return `
    <div class="dr-form">
      <h3>Target Properties</h3>
      <p style="color: var(--text-tertiary);">
        Configure whether this is the correct target to shoot.
      </p>

      <div class="dr-fg-row">
        <div class="dr-fg-field">
          <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
            <input type="checkbox"
                   ${debateLineFields.isCorrect ? 'checked' : ''}
                   onchange="updateDebateLineField('isCorrect', this.checked)"
                   style="width: auto;">
            <span>This is the CORRECT target</span>
          </label>
          <small style="color: var(--text-tertiary); display: block; margin-top: 0.5rem;">
            Check this if shooting this target with the right bullet solves the debate
          </small>
        </div>
      </div>

      <div class="target-status-indicator ${debateLineFields.isCorrect ? 'correct' : 'incorrect'}">
        ${debateLineFields.isCorrect
          ? '<span>✓ This target is CORRECT</span>'
          : '<span>✗ This target is INCORRECT</span>'}
      </div>
    </div>
  `;
}

function renderFeedbackTab() {
  return `
    <div class="dr-form">
      <h3>User Feedback Messages</h3>
      <p style="color: var(--text-tertiary);">
        Messages shown to the player when they fail or use the wrong bullet.
      </p>

      <div class="dr-fg-row">
        <div class="dr-fg-field">
          <label>Time Ran Out Comment:</label>
          <textarea rows="2"
                    oninput="updateDebateLineField('userFailedComment', this.value)"
                    placeholder="Time's up! You failed to break through...">${debateLineFields.userFailedComment}</textarea>
          <small style="color: var(--text-tertiary);">Shown when the debate timer expires</small>
        </div>
      </div>

      <div class="dr-fg-row">
        <div class="dr-fg-field">
          <label>Wrong Answer Comment:</label>
          <textarea rows="2"
                    oninput="updateDebateLineField('userWrongAnswerComment', this.value)"
                    placeholder="That's not right! Try again...">${debateLineFields.userWrongAnswerComment}</textarea>
          <small style="color: var(--text-tertiary);">Shown when player uses wrong truth bullet</small>
        </div>
      </div>
    </div>
  `;
}

function renderEffectsTab() {
  return `
    <div class="dr-form">
      <h3>Visual Effects</h3>
      <p style="color: var(--text-tertiary);">
        Configure how this text appears and moves during the debate.
      </p>

      <div class="dr-fg-row">
        <div class="dr-fg-field">
          <label>Text Effect:</label>
          <select onchange="updateDebateLineField('textEffect', this.value)">
            <option value="none" ${debateLineFields.textEffect === 'none' ? 'selected' : ''}>None</option>
            <option value="shake" ${debateLineFields.textEffect === 'shake' ? 'selected' : ''}>Shake</option>
            <option value="pulse" ${debateLineFields.textEffect === 'pulse' ? 'selected' : ''}>Pulse</option>
            <option value="glow" ${debateLineFields.textEffect === 'glow' ? 'selected' : ''}>Glow</option>
            <option value="fade" ${debateLineFields.textEffect === 'fade' ? 'selected' : ''}>Fade</option>
            <option value="bounce" ${debateLineFields.textEffect === 'bounce' ? 'selected' : ''}>Bounce</option>
          </select>
        </div>
        <div class="dr-fg-field">
          <label>Movement Direction:</label>
          <select onchange="updateDebateLineField('textMovementDirection', this.value)">
            <option value="none" ${debateLineFields.textMovementDirection === 'none' ? 'selected' : ''}>None</option>
            <option value="left" ${debateLineFields.textMovementDirection === 'left' ? 'selected' : ''}>Left →</option>
            <option value="right" ${debateLineFields.textMovementDirection === 'right' ? 'selected' : ''}>← Right</option>
            <option value="up" ${debateLineFields.textMovementDirection === 'up' ? 'selected' : ''}>Up ↑</option>
            <option value="down" ${debateLineFields.textMovementDirection === 'down' ? 'selected' : ''}>Down ↓</option>
            <option value="circular" ${debateLineFields.textMovementDirection === 'circular' ? 'selected' : ''}>Circular ⭮</option>
          </select>
        </div>
      </div>

      <div class="dr-fg-row">
        <div class="dr-fg-field">
          <label>Text Font Style:</label>
          <select onchange="updateDebateLineField('textFont', this.value)">
            <option value="default" ${debateLineFields.textFont === 'default' ? 'selected' : ''}>Default</option>
            <option value="bold" ${debateLineFields.textFont === 'bold' ? 'selected' : ''}>Bold</option>
            <option value="italic" ${debateLineFields.textFont === 'italic' ? 'selected' : ''}>Italic</option>
            <option value="handwritten" ${debateLineFields.textFont === 'handwritten' ? 'selected' : ''}>Handwritten</option>
            <option value="glitch" ${debateLineFields.textFont === 'glitch' ? 'selected' : ''}>Glitch</option>
          </select>
        </div>
      </div>
    </div>
  `;
}

function renderCharacterTab() {
  const characters = cast.filter(c => c !== null);
  const characterOptions = characters.map(c =>
    `<option value="${c.id}" ${c.id === debateLineFields.characterId ? 'selected' : ''}>
      ${c.name} ${c.surname} (${c.isHeadmaster ? 'Headmaster' : 'Student'})
    </option>`
  ).join('');

  const hasVoice = debateLineFields.voiceLineFile !== null;

  return `
    <div class="dr-form">
      <h3>Character & Audio</h3>
      <p style="color: var(--text-tertiary);">
        Assign a character to this line and optionally add voice acting.
      </p>

      <div class="dr-fg-row">
        <div class="dr-fg-field">
          <label>Speaking Character:</label>
          <select onchange="updateDebateLineField('characterId', this.value)">
            <option value="">No character</option>
            ${characterOptions}
          </select>
        </div>
      </div>

      <div class="dr-fg-row">
        <div class="dr-fg-field">
          <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
            <input type="checkbox"
                   ${debateLineFields.characterSpotlight ? 'checked' : ''}
                   onchange="updateDebateLineField('characterSpotlight', this.checked)"
                   style="width: auto;">
            <span>Enable Character Spotlight</span>
          </label>
          <small style="color: var(--text-tertiary); display: block; margin-top: 0.5rem;">
            Highlight/focus on the character while this line appears
          </small>
        </div>
      </div>

      <div class="dr-fg-row">
        <div class="dr-fg-field">
          <label>Voice Line Audio:</label>
          ${hasVoice ? `
            <div class="audio-preview">
              <div class="audio-info">
                <span class="audio-icon">🎵</span>
                <span class="audio-filename">${debateLineFields.voiceLineFile}</span>
              </div>
              <div class="audio-controls">
                <button class="btn btn-secondary" onclick="clearDebateVoiceLine()">🗑️ Remove</button>
              </div>
            </div>
          ` : `
            <div class="audio-empty">
              <p>No voice line uploaded</p>
            </div>
          `}
          <input type="file" accept="audio/*" id="debateVoiceInput"
                 onchange="handleDebateVoiceUpload(event)" style="display: none;">
          <button class="btn btn-primary" onclick="triggerDebateVoiceInput()">
            📁 ${hasVoice ? 'Replace' : 'Upload'} Voice Line
          </button>
        </div>
      </div>
    </div>
  `;
}

function updateDebateLineField(field, value) {
  debateLineFields[field] = value;
}

function updateSentencePreview() {
  const preview = document.getElementById('sentencePreview');
  if (preview) {
    preview.innerHTML = `
      ${debateLineFields.sentenceBeginning}
      <span class="sentence-target">${debateLineFields.target || '[target]'}</span>
      ${debateLineFields.sentenceEnd}
    `;
  }
}

function triggerDebateVoiceInput() {
  document.getElementById('debateVoiceInput').click();
}

function handleDebateVoiceUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('audio/')) {
    modalErr = "Please select a valid audio file.";
    renderDebateDialogueModal();
    return;
  }

  debateLineFields.voiceLineFile = file.name;
  debateLineFields.voiceLineBlob = file;
  modalErr = "";
  renderDebateDialogueModal();
}

function clearDebateVoiceLine() {
  debateLineFields.voiceLineFile = null;
  debateLineFields.voiceLineBlob = null;
  renderDebateDialogueModal();
}

async function saveDebateDialogueLine() {
  const mg = minigames.find(m => m.gameId === activeMinigameId);
  if (!mg || !mg.typeSpecific) return;

  const line = mg.typeSpecific.dialogueLines.find(l => l.lineId === activeDebateLineId);
  if (!line) {
    alert("Dialogue line not found!");
    closeDebateDialogueModal();
    return;
  }

  try {
    showLoader(true);

    // Handle voice line upload
    if (debateLineFields.voiceLineBlob) {
      const debateDir = await dirHandle.getDirectoryHandle("NonstopDebate", { create: true });
      const voiceFileName = `${line.lineId}.${debateLineFields.voiceLineBlob.name.split('.').pop()}`;
      const voiceFileHandle = await debateDir.getFileHandle(voiceFileName, { create: true });
      const writable = await voiceFileHandle.createWritable();
      await writable.write(debateLineFields.voiceLineBlob);
      await writable.close();

      line.voiceLineFile = voiceFileName;
    } else if (debateLineFields.voiceLineFile === null && line.voiceLineFile) {
      // Voice was cleared, remove the file
      try {
        const debateDir = await dirHandle.getDirectoryHandle("NonstopDebate", { create: false });
        await debateDir.removeEntry(line.voiceLineFile);
      } catch (e) {
        console.warn("Could not remove voice file:", e);
      }
      line.voiceLineFile = null;
    }

    // Update line data
    line.sentenceBeginning = debateLineFields.sentenceBeginning;
    line.target = debateLineFields.target;
    line.sentenceEnd = debateLineFields.sentenceEnd;
    line.isCorrect = debateLineFields.isCorrect;
    line.userFailedComment = debateLineFields.userFailedComment;
    line.userWrongAnswerComment = debateLineFields.userWrongAnswerComment;
    line.textEffect = debateLineFields.textEffect;
    line.textMovementDirection = debateLineFields.textMovementDirection;
    line.textFont = debateLineFields.textFont;
    line.characterId = debateLineFields.characterId;
    line.characterSpotlight = debateLineFields.characterSpotlight;

    await autoSaveTrial();

    showLoader(false);
    closeDebateDialogueModal();
    renderMinigameModal();

  } catch (error) {
    console.error("Error saving dialogue line:", error);
    showLoader(false);
    modalErr = "Failed to save: " + error.message;
    renderDebateDialogueModal();
  }
}