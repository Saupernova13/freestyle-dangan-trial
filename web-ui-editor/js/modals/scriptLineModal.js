// Script Line modal for editing dialogue, audio, effects, and highlighting
import {
  isAudioPreviewPlaying,
  seekAudioPreview,
  stopAudioPreview,
  toggleAudioPreview,
} from '../components/audioPreview.js';
import { renderScriptEditor } from '../app.js';
import { state } from '../core/state.js';
import { autoSaveTrial, loadRemainingSprites } from '../core/storage.js';
import { closeModal } from './modalCoordinator.js';
import { appSettings } from '../settings.js';
import { escapeHtml, normalizeHighlights, showLoader } from '../utils.js';

// ==================== Constants ====================
const AUDIO_PREVIEW_KEY = 'script-line-modal';
const DEFAULT_HIGHLIGHT_COLOR = '#FFFF00';
const DEFAULT_CAMERA_MOTION = { type: 'none', duration: 1.0, easing: 'ease-in-out' };
const DEFAULT_DIALOGUE_BOX_STYLE = { style: 'default', borderColor: '#FFFFFF', bgOpacity: 0.9, borderThickness: 2 };
const COLOR_REGEX = /^#[0-9a-fA-F]{6}$/i;

// ==================== Module State ====================
let activeLineId = null;
let scriptLineTab = 'sprite';
let scriptLineModalErr = '';
let scriptLineModalMsg = '';
let scriptLineFields = {
  spriteIndex: null,
  audioFile: null,
  audioBlob: null,
  highlights: [],
  cameraMotion: { ...DEFAULT_CAMERA_MOTION },
  specialEffects: { effects: [] },
  dialogueBoxStyle: { ...DEFAULT_DIALOGUE_BOX_STYLE },
};
let highlightingState = {
  startChar: 0,
  endChar: 0,
  currentColor: DEFAULT_HIGHLIGHT_COLOR,
};

/** Get available tabs for a script line based on its type */
export function getAvailableTabs(line) {
  if (!line || typeof line !== 'object') return [];
  if (line.type === 'narrator') {
    return ['audio', 'dialogueBox', 'highlighting', 'specialEffects'];
  } else if (line.type === 'speaking') {
    return ['sprite', 'audio', 'dialogueBox', 'highlighting', 'cameraMotion', 'specialEffects'];
  }
  return [];
}

/**
 * Open the script line editor modal for a given line ID.
 * Loads all related data (sprites, audio, etc.) and initializes the modal state.
 * @param {string} lineId - The ID of the script line to edit
 */
export async function openScriptLineModal(lineId) {
  if (!state.dirHandle) {
    alert('Choose a folder first!');
    return;
  }

  if (!lineId || typeof lineId !== 'string') {
    alert('Invalid script line ID');
    return;
  }

  activeLineId = lineId;
  scriptLineModalErr = '';
  scriptLineModalMsg = '';

  // Find the script line
  const line = state.scriptLines.find((l) => l.id === lineId);
  if (!line || typeof line !== 'object') {
    alert('Script line not found!');
    return;
  }

  // Load remaining sprites for the character if speaking line
  if (line.type === 'speaking') {
    const character = state.cast.find((c) => c && c.id === line.characterId);
    if (character && character.id && character._folderHandle) {
      // Check if sprites need to be loaded
      if (!character.sprites || character.sprites.length < appSettings.maxSprites) {
        showLoader(true);
        const charIndex = state.cast.indexOf(character);
        await loadRemainingSprites(charIndex);
        showLoader(false);
      }
    }
  }

  // Set initial tab based on line type
  if (line.type === 'narrator') {
    scriptLineTab = 'audio'; // Start with audio for narrator
  } else {
    scriptLineTab = 'sprite'; // Start with sprite for speaking
  }

  // Load existing data
  scriptLineFields = {
    spriteIndex: line.spriteIndex ?? null,
    audioFile: line.audioFile || null,
    audioBlob: null,
    highlights: line.highlights ? [...line.highlights] : [],
    cameraMotion: line.cameraMotion || {
      type: 'none',
      duration: 1.0,
      easing: 'ease-in-out',
    },
    specialEffects: line.specialEffects || {
      effects: [],
    },
    dialogueBoxStyle: line.dialogueBoxStyle || {
      style: 'default',
      borderColor: '#FFFFFF',
      bgOpacity: 0.9,
      borderThickness: 2,
    },
  };

  highlightingState = {
    startChar: 0,
    endChar: 0,
    currentColor: '#FFFF00',
  };

  renderScriptLineModal();
}

export function renderScriptLineModal() {
  const root = document.getElementById('modalroot');
  const line = state.scriptLines.find((l) => l.id === activeLineId);

  // For speaking lines, validate character selection
  if (line.type === 'speaking') {
    const character = state.cast.find((c) => c && c.id === line.characterId);
    if (!character) {
      alert('No character selected for this line!');
      closeModal();
      return;
    }
  }

  const availableTabs = getAvailableTabs(line);

  // Set default tab if current tab is not available
  if (!availableTabs.includes(scriptLineTab)) {
    scriptLineTab = availableTabs[0] || 'audio';
  }

  let tabContent = '';
  if (scriptLineTab === 'sprite' && line.type === 'speaking') {
    const character = state.cast.find((c) => c && c.id === line.characterId);
    tabContent = renderSpriteSelectionTab(character);
  } else if (scriptLineTab === 'audio') {
    tabContent = renderAudioUploadTab(line);
  } else if (scriptLineTab === 'dialogueBox') {
    tabContent = renderDialogueBoxTab(line);
  } else if (scriptLineTab === 'highlighting') {
    tabContent = renderHighlightingTab(line);
  } else if (scriptLineTab === 'cameraMotion' && line.type === 'speaking') {
    tabContent = renderCameraMotionTab(line);
  } else if (scriptLineTab === 'specialEffects') {
    tabContent = renderSpecialEffectsTab(line);
  }

  root.innerHTML = `
    <div class="dr-modal-bg">
      <div class="dr-modal">
        <button class="dr-close" onclick="closeScriptLineModal()">&times;</button>

        <div class="dr-tabs">
          ${
            availableTabs.includes('sprite')
              ? `
            <div class="dr-tab ${scriptLineTab === 'sprite' ? 'active' : ''}"
                 onclick="switchScriptLineTab('sprite')">
              ${window.icon('sprite')} Sprite
            </div>
          `
              : ''
          }

          ${
            availableTabs.includes('audio')
              ? `
            <div class="dr-tab ${scriptLineTab === 'audio' ? 'active' : ''}"
                 onclick="switchScriptLineTab('audio')">
              ${window.icon('volume')} Audio
            </div>
          `
              : ''
          }

          ${
            availableTabs.includes('dialogueBox')
              ? `
            <div class="dr-tab ${scriptLineTab === 'dialogueBox' ? 'active' : ''}"
                 onclick="switchScriptLineTab('dialogueBox')">
              ${window.icon('message')} Box Style
            </div>
          `
              : ''
          }

          ${
            availableTabs.includes('highlighting')
              ? `
            <div class="dr-tab ${scriptLineTab === 'highlighting' ? 'active' : ''}"
                 onclick="switchScriptLineTab('highlighting')">
              ${window.icon('highlight')} Highlighting
            </div>
          `
              : ''
          }

          ${
            availableTabs.includes('cameraMotion')
              ? `
            <div class="dr-tab ${scriptLineTab === 'cameraMotion' ? 'active' : ''}"
                 onclick="switchScriptLineTab('cameraMotion')">
              ${window.icon('camera')} Camera
            </div>
          `
              : ''
          }

          ${
            availableTabs.includes('specialEffects')
              ? `
            <div class="dr-tab ${scriptLineTab === 'specialEffects' ? 'active' : ''}"
                 onclick="switchScriptLineTab('specialEffects')">
              ${window.icon('sparkles')} Effects
            </div>
          `
              : ''
          }
        </div>

        <div class="dr-modal-content">
          ${tabContent}
        </div>

        ${scriptLineModalErr ? `<div class="dr-err">${scriptLineModalErr}</div>` : ''}
        ${scriptLineModalMsg ? `<div class="dr-success">${scriptLineModalMsg}</div>` : ''}

        <div class="dr-btn-row">
          <button class="btn btn-secondary" onclick="closeScriptLineModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveScriptLineAdvanced()">Save Changes</button>
        </div>
      </div>
    </div>
  `;
}

export function switchScriptLineTab(tab) {
  scriptLineTab = tab;
  scriptLineModalErr = '';
  scriptLineModalMsg = '';
  renderScriptLineModal();

  // Initialize drag selection if switching to highlighting tab
  if (tab === 'highlighting') {
    setTimeout(() => initializeDragSelection(), 0);
  }
}

// Tab rendering functions
export function renderSpriteSelectionTab(character) {
  if (!character.sprites || character.sprites.length === 0) {
    return `
      <div class="dr-form">
        <p>This character has no sprites uploaded yet.</p>
        <p>Please edit the character in the Cast view to add sprites.</p>
      </div>
    `;
  }

  let spriteSlots = character.sprites
    .map((spr, idx) => {
      if (!spr) {
        return `
        <div class="dr-sprslot empty">
          <span>No Sprite</span>
        </div>
      `;
      }

      // spriteIndex is 1-based — it maps directly to sprite_NN.png on disk and
      // to what the engine reads. The sprites array itself is 0-based.
      const isSelected = scriptLineFields.spriteIndex === idx + 1;
      return `
      <div class="dr-sprslot ${isSelected ? 'selected-sprite' : ''}"
           onclick="selectSprite(${idx + 1})"
           title="Sprite ${idx + 1}">
        <img src="${spr.dataURL}" alt="Sprite ${idx + 1}">
        ${isSelected ? `<div class="sprite-check">${window.icon('check', { size: 16 })}</div>` : ''}
      </div>
    `;
    })
    .join('');

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

export function selectSprite(index) {
  const spriteIndex = parseInt(index, 10);

  // Validate sprite index is a valid positive integer
  if (!Number.isFinite(spriteIndex) || spriteIndex < 1) {
    scriptLineModalErr = 'Invalid sprite selection';
    renderScriptLineModal();
    return;
  }

  scriptLineFields.spriteIndex = spriteIndex;
  scriptLineModalErr = '';
  renderScriptLineModal();
}

export function renderAudioUploadTab(line) {
  const hasAudio = scriptLineFields.audioFile !== null;

  return `
    <div class="dr-form">
      <h3>Audio Playback</h3>
      <p style="color: var(--text-tertiary); margin-bottom: 1rem;">
        Upload an audio file for this dialogue line (optional).
      </p>

      ${
        hasAudio
          ? `
        <div class="audio-preview">
          <div class="audio-info">
            <span class="audio-icon">${window.icon('music', { size: 16 })}</span>
            <span class="audio-filename">${escapeHtml(scriptLineFields.audioFile || 'audio.mp3')}</span>
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
            <button class="btn btn-secondary" id="audio-play-btn" onclick="playAudioPreview()">${isAudioPreviewPlaying(AUDIO_PREVIEW_KEY) ? `${window.icon('pause')} Pause` : `${window.icon('play')} Play`}</button>
            <button class="btn btn-secondary" onclick="clearAudio()">${window.icon('trash')} Remove</button>
          </div>
        </div>
      `
          : `
        <div class="audio-empty">
          <p>No audio file uploaded</p>
        </div>
      `
      }

      <input type="file" accept="audio/*" id="audioFileInput"
             onchange="handleAudioUpload(event)" style="display: none;">
      <button class="btn btn-primary" onclick="triggerAudioInput()">
        ${window.icon('upload')} ${hasAudio ? 'Replace' : 'Upload'} Audio
      </button>
    </div>
  `;
}

export function triggerAudioInput() {
  document.getElementById('audioFileInput').click();
}

export function handleAudioUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('audio/')) {
    scriptLineModalErr = 'Please select a valid audio file (mp3, wav, ogg, etc.)';
    renderScriptLineModal();
    return;
  }

  // Validate file size (max 50MB)
  const MAX_AUDIO_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_AUDIO_SIZE) {
    scriptLineModalErr = `Audio file is too large. Maximum size is ${MAX_AUDIO_SIZE / (1024 * 1024)}MB.`;
    renderScriptLineModal();
    return;
  }

  scriptLineFields.audioFile = file.name;
  scriptLineFields.audioBlob = file;
  scriptLineModalErr = '';
  scriptLineModalMsg = `Loaded audio: ${escapeHtml(file.name)} (${(file.size / 1024).toFixed(2)} KB)`;
  renderScriptLineModal();
}

export function clearAudio() {
  scriptLineFields.audioFile = null;
  scriptLineFields.audioBlob = null;
  renderScriptLineModal();
}

export function renderDialogueBoxTab(line) {
  const box = scriptLineFields.dialogueBoxStyle;

  const boxStyles = [
    { value: 'default', label: 'Default', desc: 'Standard rectangular box' },
    { value: 'slant_left', label: 'Slant Left', desc: 'Box tilted to the left' },
    { value: 'slant_right', label: 'Slant Right', desc: 'Box tilted to the right' },
    { value: 'spiky', label: 'Spiky', desc: 'Sharp pointed edges' },
    { value: 'bubbly', label: 'Bubbly', desc: 'Rounded speech bubble style' },
    { value: 'rounded', label: 'Rounded', desc: 'Soft rounded corners' },
    { value: 'sharp', label: 'Sharp', desc: 'Hard angular edges' },
  ];

  const styleOptions = boxStyles
    .map(
      (style) =>
        `<option value="${style.value}" ${box.style === style.value ? 'selected' : ''} title="${style.desc}">
      ${style.label}
    </option>`
    )
    .join('');

  const selectedStyle = boxStyles.find((s) => s.value === box.style);

  return `
    <div class="dr-form">
      <h3>Dialogue Box Style</h3>
      <p style="color: var(--text-tertiary); margin-bottom: 1rem;">
        Customize the appearance of the dialogue box for this line.
      </p>

      <div class="dialoguebox-preview-box">
        <div class="dialoguebox-preview-icon">${window.icon('message', { size: 28 })}</div>
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

export function updateDialogueBoxStyle(field, value) {
  // Validate color input if it's a border color
  if (field === 'borderColor' && !COLOR_REGEX.test(value)) {
    scriptLineModalErr = 'Border color must be a valid hex color (e.g., #FFFFFF)';
    renderScriptLineModal();
    return;
  }

  // Validate opacity is between 0 and 1
  if (field === 'bgOpacity') {
    const opacity = parseFloat(value);
    if (isNaN(opacity) || opacity < 0 || opacity > 1) {
      scriptLineModalErr = 'Opacity must be between 0 and 1';
      renderScriptLineModal();
      return;
    }
  }

  // Validate border thickness
  if (field === 'borderThickness') {
    const thickness = parseInt(value, 10);
    if (isNaN(thickness) || thickness < 0 || thickness > 10) {
      scriptLineModalErr = 'Border thickness must be between 0 and 10 pixels';
      renderScriptLineModal();
      return;
    }
  }

  scriptLineModalErr = '';
  scriptLineFields.dialogueBoxStyle[field] = value;

  // Update only the dialogue box tab content
  const tabContent = document.querySelector('.dr-modal-content');
  if (tabContent && scriptLineTab === 'dialogueBox') {
    const line = state.scriptLines.find((l) => l.id === activeLineId);
    tabContent.innerHTML = renderDialogueBoxTab(line);
  }
}

export async function loadAudioFileFromDisk(filename) {
  try {
    const audioDir = await state.dirHandle.getDirectoryHandle('Audio', { create: false });
    const fileHandle = await audioDir.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return file;
  } catch (error) {
    console.error('Error loading audio file:', error);
    return null;
  }
}

export async function playAudioPreview() {
  await toggleAudioPreview(AUDIO_PREVIEW_KEY, {
    buttonId: 'audio-play-btn',
    seekBarId: 'audio-seek-bar',
    timeCurrentId: 'audio-time-current',
    timeTotalId: 'audio-time-total',
    onError: (msg) => {
      scriptLineModalErr = msg;
      renderScriptLineModal();
    },
    getBlob: async () => {
      if (!scriptLineFields.audioBlob && scriptLineFields.audioFile) {
        scriptLineFields.audioBlob = await loadAudioFileFromDisk(scriptLineFields.audioFile);
      }
      return scriptLineFields.audioBlob;
    },
  });
}

export function seekAudio(value) {
  seekAudioPreview(AUDIO_PREVIEW_KEY, value);
}

export function renderCameraMotionTab(line) {
  const cam = scriptLineFields.cameraMotion;

  const cameraTypes = [
    { value: 'none', label: 'None', desc: 'No camera movement' },
    { value: 'pan_left', label: 'Pan Left', desc: 'Camera pans to the left' },
    { value: 'pan_right', label: 'Pan Right', desc: 'Camera pans to the right' },
    { value: 'pan_up', label: 'Pan Up', desc: 'Camera pans upward' },
    { value: 'pan_down', label: 'Pan Down', desc: 'Camera pans downward' },
    { value: 'zoom_in', label: 'Zoom In', desc: 'Camera zooms closer' },
    { value: 'zoom_out', label: 'Zoom Out', desc: 'Camera zooms out' },
    { value: 'rotate_cw', label: 'Rotate Clockwise', desc: 'Camera rotates clockwise' },
    {
      value: 'rotate_ccw',
      label: 'Rotate Counter-Clockwise',
      desc: 'Camera rotates counter-clockwise',
    },
    { value: 'tilt_up', label: 'Tilt Up', desc: 'Camera tilts upward' },
    { value: 'tilt_down', label: 'Tilt Down', desc: 'Camera tilts downward' },
    { value: 'dolly_in', label: 'Dolly In', desc: 'Camera moves forward on track' },
    { value: 'dolly_out', label: 'Dolly Out', desc: 'Camera moves backward on track' },
    { value: 'truck_left', label: 'Truck Left', desc: 'Camera moves left on track' },
    { value: 'truck_right', label: 'Truck Right', desc: 'Camera moves right on track' },
    { value: 'pedestal_up', label: 'Pedestal Up', desc: 'Camera moves up vertically' },
    { value: 'pedestal_down', label: 'Pedestal Down', desc: 'Camera moves down vertically' },
    { value: 'pan', label: 'Pan to Speaker', desc: 'Smooth pan to the speaking character' },
    { value: 'shake', label: 'Camera Shake', desc: 'Quick handheld-style shake' },
    { value: 'dramatic_zoom', label: 'Dramatic Zoom', desc: 'Punch-in zoom with shake' },
    { value: 'spin', label: 'Spin', desc: 'Full 360 spin around the room' },
    { value: 'overhead', label: 'Overhead', desc: "Bird's-eye view from above" },
    { value: 'low_angle', label: 'Low Angle', desc: 'Drops low looking up at the speaker' },
    { value: 'dutch_tilt', label: 'Dutch Tilt', desc: 'Tilts sideways then rights itself' },
    { value: 'cross_dissolve', label: 'Cross Dissolve', desc: 'Fade through black transition' },
    { value: 'tracking', label: 'Tracking', desc: 'Smooth tracking move to the speaker' },
    { value: 'reset', label: 'Reset', desc: 'Return FOV and roll to defaults' },
  ];

  const easingTypes = [
    { value: 'linear', label: 'Linear' },
    { value: 'ease-in', label: 'Ease In' },
    { value: 'ease-out', label: 'Ease Out' },
    { value: 'ease-in-out', label: 'Ease In-Out' },
  ];

  const cameraOptions = cameraTypes
    .map(
      (type) =>
        `<option value="${type.value}" ${cam.type === type.value ? 'selected' : ''} title="${type.desc}">
      ${type.label}
    </option>`
    )
    .join('');

  const easingOptions = easingTypes
    .map(
      (easing) =>
        `<option value="${easing.value}" ${cam.easing === easing.value ? 'selected' : ''}>
      ${easing.label}
    </option>`
    )
    .join('');

  const selectedType = cameraTypes.find((t) => t.value === cam.type);

  return `
    <div class="dr-form">
      <h3>Camera Motion</h3>
      <p style="color: var(--text-tertiary); margin-bottom: 1rem;">
        Configure camera animation during this dialogue line.
      </p>

      <div class="camera-preview-box">
        <div class="camera-preview-icon">${window.icon('camera', { size: 28 })}</div>
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

      ${
        cam.type !== 'none'
          ? `
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
      `
          : ''
      }
    </div>
  `;
}

export function updateCameraMotion(field, value) {
  // Validate duration is positive
  if (field === 'duration') {
    const duration = parseFloat(value);
    if (isNaN(duration) || duration < 0.1 || duration > 10) {
      scriptLineModalErr = 'Duration must be between 0.1 and 10 seconds';
      renderScriptLineModal();
      return;
    }
  }

  scriptLineModalErr = '';
  scriptLineFields.cameraMotion[field] = value;

  // Update only the camera tab content
  const tabContent = document.querySelector('.dr-modal-content');
  if (tabContent && scriptLineTab === 'cameraMotion') {
    const line = state.scriptLines.find((l) => l.id === activeLineId);
    tabContent.innerHTML = renderCameraMotionTab(line);
  }
}

export function renderSpecialEffectsTab(line) {
  const effects = scriptLineFields.specialEffects.effects;

  // `icon` is an icon-set name (see js/ui/icons.js), rendered via window.icon().
  const availableEffects = [
    { type: 'shake', label: 'Screen Shake', icon: 'vibrate', hasIntensity: true },
    { type: 'flash', label: 'Flash', icon: 'zap', hasColor: true },
    { type: 'pulse', label: 'Pulse', icon: 'pulse', hasIntensity: true },
    { type: 'fade_black', label: 'Fade to Black', icon: 'square' },
    { type: 'fade_white', label: 'Fade to White', icon: 'square' },
    { type: 'blur', label: 'Background Blur', icon: 'wind', hasIntensity: true },
    { type: 'distortion', label: 'Distortion/Ripple', icon: 'swirl', hasIntensity: true },
    { type: 'sepia', label: 'Sepia Filter', icon: 'droplet' },
    { type: 'grayscale', label: 'Grayscale', icon: 'contrast' },
    { type: 'invert', label: 'Color Invert', icon: 'contrast' },
    { type: 'vignette', label: 'Vignette', icon: 'target', hasIntensity: true },
    { type: 'scanlines', label: 'Scanlines', icon: 'tv', hasIntensity: true },
    { type: 'objection', label: 'Objection Overlay', icon: 'alert' },
    { type: 'blood_splatter', label: 'Blood Splatter', icon: 'droplet' },
    { type: 'evidence_popup', label: 'Evidence Popup', icon: 'search' },
    { type: 'glitch', label: 'Glitch', icon: 'burst' },
    { type: 'chromatic_aberration', label: 'Chromatic Aberration', icon: 'layers' },
    { type: 'impact_frame', label: 'Impact Frame', icon: 'burst' },
  ];

  // Render active effects list
  const activeEffectsList = effects
    .map((effect, idx) => {
      const effectDef = availableEffects.find((e) => e.type === effect.type);
      return `
      <div class="effect-active-item">
        <span class="effect-icon">${window.icon(effectDef ? effectDef.icon : 'sparkles', { size: 18 })}</span>
        <div class="effect-details">
          <strong>${effectDef ? effectDef.label : effect.type}</strong>
          <div class="effect-params">
            ${effect.intensity !== undefined ? `Intensity: ${effect.intensity}` : ''}
            ${effect.color !== undefined ? `Color: ${effect.color}` : ''}
            ${effect.duration ? `Duration: ${effect.duration}s` : ''}
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="removeEffect(${idx})">
          ${window.icon('trash', { size: 15 })}
        </button>
      </div>
    `;
    })
    .join('');

  // Render available effects grid
  const effectsGrid = availableEffects
    .map((effect) => {
      const isActive = effects.some((e) => e.type === effect.type);
      return `
      <div class="effect-option ${isActive ? 'effect-active' : ''}"
           onclick="toggleEffect('${effect.type}')">
        <div class="effect-option-icon">${window.icon(effect.icon, { size: 22 })}</div>
        <div class="effect-option-label">${effect.label}</div>
        ${isActive ? `<div class="effect-checkmark">${window.icon('check', { size: 14 })}</div>` : ''}
      </div>
    `;
    })
    .join('');

  return `
    <div class="dr-form">
      <h3>Special Effects</h3>
      <p style="color: var(--text-tertiary); margin-bottom: 1rem;">
        Add visual effects that trigger during this dialogue line.
      </p>

      ${
        effects.length > 0
          ? `
        <div class="active-effects-list">
          <h4>Active Effects:</h4>
          ${activeEffectsList}
        </div>
      `
          : ''
      }

      <div class="effects-grid">
        <h4>Available Effects:</h4>
        <div class="effects-grid-container">
          ${effectsGrid}
        </div>
      </div>

      <div class="effects-help">
        <small>${window.icon('bulb', { size: 15 })} Click an effect to add/remove it. Effects will trigger when this dialogue line appears.</small>
      </div>
    </div>
  `;
}

export function toggleEffect(effectType) {
  const effects = scriptLineFields.specialEffects.effects;
  const existingIndex = effects.findIndex((e) => e.type === effectType);

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
    const line = state.scriptLines.find((l) => l.id === activeLineId);
    tabContent.innerHTML = renderSpecialEffectsTab(line);
  }
}

export function removeEffect(index) {
  scriptLineFields.specialEffects.effects.splice(index, 1);

  // Update only the effects tab content
  const tabContent = document.querySelector('.dr-modal-content');
  if (tabContent && scriptLineTab === 'specialEffects') {
    const line = state.scriptLines.find((l) => l.id === activeLineId);
    tabContent.innerHTML = renderSpecialEffectsTab(line);
  }
}

export function renderHighlightingTab(line) {
  const dialogue = line.dialogue || line.text || '';

  // Repair any stale/overlapping ranges (e.g. dialogue edited after
  // highlighting) before they are shown or re-saved.
  scriptLineFields.highlights = normalizeHighlights(scriptLineFields.highlights, dialogue.length);

  // Render the dialogue with highlights applied
  const highlightedText = renderHighlightedDialogue(dialogue, scriptLineFields.highlights);

  // Render existing highlights list
  const highlightsList = scriptLineFields.highlights
    .map((h, idx) => {
      const excerpt = escapeHtml(dialogue.substring(h.startChar, h.endChar));
      return `
      <div class="highlight-item" style="border-left: 4px solid ${h.color};">
        <div class="highlight-info">
          <span class="highlight-text">"${excerpt}"</span>
          <span class="highlight-range">(chars ${h.startChar}-${h.endChar})</span>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="removeHighlight(${idx})">
          ${window.icon('trash', { size: 15 })}
        </button>
      </div>
    `;
    })
    .join('');

  // Render dialogue as individual character spans for selection
  const selectableDialogue = dialogue
    .split('')
    .map(
      (char, idx) =>
        `<span class="char-selectable" data-char-index="${idx}">${char === ' ' ? '&nbsp;' : escapeHtml(char)}</span>`
    )
    .join('');

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
      ${
        scriptLineFields.highlights.length > 0
          ? `
        <div class="highlights-list">
          <h4>Current Highlights:</h4>
          ${highlightsList}
        </div>
      `
          : ''
      }

      <!-- Drag-to-select controls -->
      <div class="highlight-controls">
        <h4>Add New Highlight:</h4>

        <!-- Selectable dialogue text -->
        <div class="dialogue-selector" id="dialogue-selector">
          <div class="dialogue-text">
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
            ${window.icon('plus')} Add Highlight
          </button>
          <button class="btn btn-secondary" onclick="clearHighlightSelection()">
            ${window.icon('close')} Clear Selection
          </button>
        </div>
      </div>
    </div>
  `;
}

// Initialize drag selection after rendering highlighting tab
export function initializeDragSelection() {
  const dialogueSelector = document.getElementById('dialogue-selector');
  if (!dialogueSelector) return;

  const dialogueText = dialogueSelector.querySelector('.dialogue-text');
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
    dialogueText.querySelectorAll('.char-selectable').forEach((span) => {
      span.classList.remove('char-selected');
    });
  }

  function updateSelectionDisplay() {
    const line = state.scriptLines.find((l) => l.id === activeLineId);
    const dialogue = line.dialogue || '';

    // Highlight selected characters in the selectable text
    const spans = dialogueText.querySelectorAll('.char-selectable');
    for (let i = highlightingState.startChar; i < highlightingState.endChar; i++) {
      if (spans[i]) {
        spans[i].classList.add('char-selected');
      }
    }

    // Update selection info
    const selectedText = dialogue.substring(highlightingState.startChar, highlightingState.endChar);
    selectionRange.innerHTML =
      highlightingState.endChar > highlightingState.startChar
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
          isTemp: true, // Mark as temporary
        });
      }
      unifiedPreview.innerHTML = renderHighlightedDialogue(dialogue, tempHighlights);
    }
  }
}

// Render dialogue with all highlights applied
export function renderHighlightedDialogue(dialogue, highlights) {
  if (!dialogue) return '<em>No dialogue text</em>';

  // normalizeHighlights guarantees sorted, disjoint, in-bounds ranges, so
  // this preview renders exactly what the engine will — including data that
  // arrives overlapping or stale from older trial files.
  const normalized = normalizeHighlights(highlights, dialogue.length);
  if (normalized.length === 0) return escapeHtml(dialogue);

  let result = '';
  let lastIndex = 0;
  normalized.forEach((h) => {
    result += escapeHtml(dialogue.substring(lastIndex, h.startChar));
    result += `<span style="color: ${h.color}; font-weight: 600;">`;
    result += escapeHtml(dialogue.substring(h.startChar, h.endChar));
    result += '</span>';
    lastIndex = h.endChar;
  });
  result += escapeHtml(dialogue.substring(lastIndex));

  return result;
}

// Clear the highlight drag-selection.
// Named distinctly from app.js's clearSelection (script line multi-select):
// both files share the global namespace, and the previous shared name meant
// whichever file loaded last silently won.
export function clearHighlightSelection() {
  highlightingState.startChar = 0;
  highlightingState.endChar = 0;

  const dialogueText = document.querySelector('.dialogue-text');
  if (dialogueText) {
    dialogueText.querySelectorAll('.char-selectable').forEach((span) => {
      span.classList.remove('char-selected');
    });
  }

  const selectionRange = document.getElementById('selection-range');
  if (selectionRange) {
    selectionRange.innerHTML = 'None';
  }

  const addButton = document.getElementById('add-highlight-btn');
  if (addButton) {
    addButton.disabled = true;
  }
}

// Select color (updated to avoid full re-render)
export function selectHighlightColor(color) {
  // Validate color is a valid hex value
  if (!COLOR_REGEX.test(color)) {
    scriptLineModalErr = 'Invalid color. Please use a valid hex color (e.g., #FF0000)';
    renderScriptLineModal();
    return;
  }

  scriptLineModalErr = '';
  highlightingState.currentColor = color;

  // Update color preview without full re-render
  const colorPreview = document.querySelector('.current-color-preview');
  if (colorPreview) {
    colorPreview.style.background = color;
    colorPreview.querySelector('span').textContent = color;
  }

  // Update color preset active states
  document.querySelectorAll('.color-preset').forEach((btn) => {
    const btnColor = normalizeColorFormat(btn.style.background);
    const targetColor = normalizeColorFormat(color);
    if (btnColor && targetColor && btnColor.toLowerCase() === targetColor.toLowerCase()) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Repaint the unified preview so an in-progress selection reflects the
  // newly chosen color.
  const line = state.scriptLines.find((l) => l.id === activeLineId);
  const unifiedPreview = document.getElementById('highlight-unified-preview');
  if (unifiedPreview && line && highlightingState.endChar > highlightingState.startChar) {
    const dialogue = line.dialogue || line.text || '';
    const tempHighlights = [
      ...scriptLineFields.highlights,
      {
        startChar: highlightingState.startChar,
        endChar: highlightingState.endChar,
        color: highlightingState.currentColor,
      },
    ];
    unifiedPreview.innerHTML = renderHighlightedDialogue(dialogue, tempHighlights);
  }
}

// Normalize color to hex format for consistent comparison
function normalizeColorFormat(color) {
  if (!color || typeof color !== 'string') return null;
  color = color.trim();
  if (color.startsWith('#')) return color;
  const match = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (!match) return null;
  const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
  const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
  const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

// Helper function to convert RGB to hex for color comparison (deprecated, use normalizeColorFormat)
export function rgbToHex(rgb) {
  return normalizeColorFormat(rgb);
}

// Add highlight from drag selection
export function addHighlightFromSelection() {
  const line = state.scriptLines.find((l) => l.id === activeLineId);
  const dialogue = line.dialogue || '';

  // Validate selection exists
  if (highlightingState.startChar >= highlightingState.endChar) {
    scriptLineModalErr = 'Please select text to highlight.';
    renderScriptLineModal();
    return;
  }

  // Validate ranges are in bounds
  if (!Number.isFinite(highlightingState.startChar) || !Number.isFinite(highlightingState.endChar) ||
      highlightingState.startChar < 0 || highlightingState.endChar > dialogue.length) {
    scriptLineModalErr = 'Invalid selection range. Please select within the dialogue text.';
    renderScriptLineModal();
    return;
  }

  // Validate color
  if (!COLOR_REGEX.test(highlightingState.currentColor)) {
    scriptLineModalErr = 'Invalid highlight color.';
    renderScriptLineModal();
    return;
  }

  // Add highlight, then normalize so a selection over existing highlights
  // repaints them (highlighter semantics) instead of stacking overlapping
  // ranges that older versions corrupted at render time.
  scriptLineFields.highlights.push({
    startChar: highlightingState.startChar,
    endChar: highlightingState.endChar,
    color: highlightingState.currentColor,
  });
  scriptLineFields.highlights = normalizeHighlights(scriptLineFields.highlights, dialogue.length);

  // Reset state
  highlightingState.startChar = 0;
  highlightingState.endChar = 0;
  scriptLineModalErr = '';
  scriptLineModalMsg = 'Highlight added successfully';

  // Re-render to show updated highlights
  renderScriptLineModal();

  // Re-initialize drag selection after re-render
  setTimeout(() => initializeDragSelection(), 0);
}

// Remove highlight
export function removeHighlight(index) {
  scriptLineFields.highlights.splice(index, 1);
  renderScriptLineModal();

  // Re-initialize drag selection after re-render
  setTimeout(() => initializeDragSelection(), 0);
}

/** Close and clean up the script line modal */
export function closeScriptLineModal() {
  stopAudioPreview(AUDIO_PREVIEW_KEY);
  const modalRoot = document.getElementById('modalroot');
  if (modalRoot) modalRoot.innerHTML = '';
  activeLineId = null;
  scriptLineTab = 'sprite';
  scriptLineModalErr = '';
  scriptLineModalMsg = '';
}

// ==================== Script Line Advanced Editing ====================

export async function saveScriptLineAdvanced() {
  const line = state.scriptLines.find((l) => l.id === activeLineId);
  if (!line) {
    scriptLineModalErr = 'Script line not found. Please close and reopen the modal.';
    renderScriptLineModal();
    return;
  }

  // Validate state before saving
  const dialogue = line.dialogue || line.text || '';
  const validationError = validateScriptLineFields(dialogue);
  if (validationError) {
    scriptLineModalErr = validationError;
    renderScriptLineModal();
    return;
  }

  try {
    showLoader(true);

    // Update line data based on type
    if (line.type === 'speaking') {
      line.spriteIndex = scriptLineFields.spriteIndex;
      line.cameraMotion = scriptLineFields.cameraMotion;
    }

    // Common fields for both narrator and speaking.
    // Highlights are normalized against the line's current text so stale or
    // overlapping ranges can never be persisted to trial.json.
    line.highlights = normalizeHighlights(
      scriptLineFields.highlights,
      dialogue.length
    );
    line.specialEffects = scriptLineFields.specialEffects;
    line.dialogueBoxStyle = scriptLineFields.dialogueBoxStyle;

    // Handle audio file upload
    if (scriptLineFields.audioBlob) {
      if (!state.dirHandle) {
        throw new Error('No trial folder selected. Please choose a folder first.');
      }

      // Create Audio directory if it doesn't exist
      const audioDir = await state.dirHandle.getDirectoryHandle('Audio', { create: true });

      // Generate filename based on line ID, extract extension safely
      const ext = scriptLineFields.audioBlob.name.includes('.')
        ? scriptLineFields.audioBlob.name.split('.').pop()
        : 'mp3';
      const audioFileName = `${line.id}.${ext}`;

      // Write audio file
      const audioFileHandle = await audioDir.getFileHandle(audioFileName, { create: true });
      const writable = await audioFileHandle.createWritable();
      await writable.write(scriptLineFields.audioBlob);
      await writable.close();

      line.audioFile = audioFileName;
    } else if (scriptLineFields.audioFile === null && line.audioFile) {
      // Audio was cleared, remove the file
      try {
        if (state.dirHandle) {
          const audioDir = await state.dirHandle.getDirectoryHandle('Audio', { create: false });
          await audioDir.removeEntry(line.audioFile);
        }
      } catch (e) {
        console.warn('Could not remove audio file:', e);
        // Don't fail the save operation if we can't delete the old file
      }
      line.audioFile = null;
    }

    // Save trial data
    await autoSaveTrial();

    showLoader(false);
    scriptLineModalErr = '';
    scriptLineModalMsg = 'Changes saved successfully';
    closeModal();
    renderScriptEditor();
  } catch (error) {
    console.error('Error saving script line:', error);
    showLoader(false);
    scriptLineModalErr = `Failed to save: ${error.message || 'Unknown error'}`;
    renderScriptLineModal();
  }
}

// Validate all fields in scriptLineFields before saving
function validateScriptLineFields(dialogue) {
  // Validate highlights are in bounds
  if (Array.isArray(scriptLineFields.highlights)) {
    for (const h of scriptLineFields.highlights) {
      if (h.startChar < 0 || h.endChar > dialogue.length || h.startChar >= h.endChar) {
        return 'Invalid highlight range detected.';
      }
      if (!COLOR_REGEX.test(h.color || '')) {
        return 'Invalid highlight color detected.';
      }
    }
  }

  // Validate camera motion if present
  if (scriptLineFields.cameraMotion) {
    const duration = scriptLineFields.cameraMotion.duration;
    if (duration !== undefined && (duration < 0.1 || duration > 10)) {
      return 'Camera duration must be between 0.1 and 10 seconds.';
    }
  }

  // Validate dialogue box style
  if (scriptLineFields.dialogueBoxStyle) {
    const opacity = scriptLineFields.dialogueBoxStyle.bgOpacity;
    if (opacity !== undefined && (opacity < 0 || opacity > 1)) {
      return 'Background opacity must be between 0 and 1.';
    }
    const thickness = scriptLineFields.dialogueBoxStyle.borderThickness;
    if (thickness !== undefined && (thickness < 0 || thickness > 10)) {
      return 'Border thickness must be between 0 and 10 pixels.';
    }
    const color = scriptLineFields.dialogueBoxStyle.borderColor;
    if (color && !COLOR_REGEX.test(color)) {
      return 'Border color must be a valid hex color.';
    }
  }

  return null;
}
