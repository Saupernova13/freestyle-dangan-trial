// Script Line modal for editing dialogue, audio, effects, and highlighting

let activeLineId = null;
let scriptLineTab = "sprite";
let scriptLineModalErr = "";
let scriptLineModalMsg = "";
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
  scriptLineModalErr = "";
  scriptLineModalMsg = "";

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
        <button class="dr-close" onclick="closeScriptLineModal()">&times;</button>

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

        ${scriptLineModalErr ? `<div class="dr-err">${scriptLineModalErr}</div>` : ""}
        ${scriptLineModalMsg ? `<div class="dr-success">${scriptLineModalMsg}</div>` : ""}

        <div class="dr-btn-row">
          <button class="btn btn-secondary" onclick="closeScriptLineModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveScriptLineAdvanced()">Save Changes</button>
        </div>
      </div>
    </div>
  `;
}

function switchScriptLineTab(tab) {
  scriptLineTab = tab;
  scriptLineModalErr = "";
  scriptLineModalMsg = "";
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
    scriptLineModalErr = "Please select a valid audio file.";
    renderScriptLineModal();
    return;
  }

  scriptLineFields.audioFile = file.name;
  scriptLineFields.audioBlob = file;
  scriptLineModalErr = "";
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
        scriptLineModalErr = "Failed to load audio file from disk.";
        renderScriptLineModal();
        return;
      }
    } catch (error) {
      scriptLineModalErr = `Error loading audio: ${error.message}`;
      renderScriptLineModal();
      return;
    }
  }

  if (!scriptLineFields.audioBlob) {
    scriptLineModalErr = "No audio file to play.";
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
        scriptLineModalErr = `Audio playback error: ${audioPreviewElement.error.message}`;
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
        scriptLineModalErr = `Failed to play audio: ${err.message}`;
        renderScriptLineModal();
      });

  } catch (error) {
    scriptLineModalErr = `Error playing audio: ${error.message}`;
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
    scriptLineModalErr = "Please select text to highlight.";
    renderScriptLineModal();
    return;
  }

  if (highlightingState.startChar < 0 || highlightingState.endChar > dialogue.length) {
    scriptLineModalErr = "Invalid selection range.";
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
  scriptLineModalErr = "";

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



// Close script line modal
function closeScriptLineModal() {
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
  activeLineId = null;
}
