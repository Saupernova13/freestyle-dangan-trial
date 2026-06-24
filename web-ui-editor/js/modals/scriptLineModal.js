// Script line modal: coordinates the per-line "advanced properties" editor.
//
// This module owns the modal shell (tab bar, footer, open/close lifecycle and
// save), and delegates each tab's body and handlers to a focused module under
// ./scriptLine/. Those tab handlers are re-exported here so the single
// `import * as scriptLineModal` in main.js still bridges every inline onclick
// handler onto window, and existing import paths keep resolving.
import { stopAudioPreview } from '../components/audioPreview.js';
import { renderScriptEditor } from '../app.js';
import { state } from '../core/state.js';
import { autoSaveTrial, loadRemainingSprites } from '../core/storage.js';
import { appSettings } from '../settings.js';
import { showToast } from '../ui/dialogs.js';
import { focusFirstField } from '../ui/modalBehaviors.js';
import { normalizeHighlights, showLoader } from '../utils.js';
import { closeModal } from './modalCoordinator.js';
import { AUDIO_PREVIEW_KEY, COLOR_REGEX, activeLine, resetFields, sl } from './scriptLine/state.js';
import { renderSpriteSelectionTab } from './scriptLine/spriteTab.js';
import { renderAudioUploadTab } from './scriptLine/audioTab.js';
import { renderDialogueBoxTab } from './scriptLine/dialogueBoxTab.js';
import { renderCameraMotionTab } from './scriptLine/cameraTab.js';
import { renderSpecialEffectsTab } from './scriptLine/effectsTab.js';
import {
  initializeDragSelection,
  renderHighlightingTab,
  teardownDragSelection,
} from './scriptLine/highlightingTab.js';

// Re-export every tab's handlers so they reach window via main.js's bridge.
export * from './scriptLine/spriteTab.js';
export * from './scriptLine/audioTab.js';
export * from './scriptLine/dialogueBoxTab.js';
export * from './scriptLine/cameraTab.js';
export * from './scriptLine/effectsTab.js';
export * from './scriptLine/highlightingTab.js';

/** Tabs available for a script line, in display order, keyed by line type. */
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
 * Open the advanced editor for a script line, loading its sprites/audio/etc.
 * @param {string} lineId - The ID of the script line to edit.
 */
export async function openScriptLineModal(lineId) {
  if (!state.dirHandle) {
    showToast('Choose a trial folder first.', { type: 'warning' });
    return;
  }

  if (!lineId || typeof lineId !== 'string') {
    showToast('Invalid script line.', { type: 'error' });
    return;
  }

  sl.activeLineId = lineId;
  sl.err = '';
  sl.msg = '';

  const line = state.scriptLines.find((l) => l.id === lineId);
  if (!line || typeof line !== 'object') {
    showToast('Script line not found.', { type: 'error' });
    return;
  }

  // Speaking lines need every sprite loaded for the picker; the cast grid only
  // loads the first one eagerly.
  if (line.type === 'speaking') {
    const character = state.cast.find((c) => c && c.id === line.characterId);
    if (character && character.id && character._folderHandle) {
      if (!character.sprites || character.sprites.length < appSettings.maxSprites) {
        showLoader(true, 'Loading sprites…');
        const charIndex = state.cast.indexOf(character);
        await loadRemainingSprites(charIndex);
        showLoader(false);
      }
    }
  }

  // Narrator lines have no sprite tab, so open on audio.
  sl.tab = line.type === 'narrator' ? 'audio' : 'sprite';
  resetFields(line);

  renderScriptLineModal();
  focusFirstField();
}

export function renderScriptLineModal() {
  const root = document.getElementById('modalroot');
  const line = activeLine();

  // Speaking lines require a character; bail rather than render a broken tab.
  if (line.type === 'speaking') {
    const character = state.cast.find((c) => c && c.id === line.characterId);
    if (!character) {
      showToast('Select a character for this line first.', { type: 'warning' });
      closeModal();
      return;
    }
  }

  const availableTabs = getAvailableTabs(line);

  // Fall back to the first available tab if the current one no longer applies.
  if (!availableTabs.includes(sl.tab)) {
    sl.tab = availableTabs[0] || 'audio';
  }

  let tabContent = '';
  if (sl.tab === 'sprite' && line.type === 'speaking') {
    const character = state.cast.find((c) => c && c.id === line.characterId);
    tabContent = renderSpriteSelectionTab(character);
  } else if (sl.tab === 'audio') {
    tabContent = renderAudioUploadTab();
  } else if (sl.tab === 'dialogueBox') {
    tabContent = renderDialogueBoxTab();
  } else if (sl.tab === 'highlighting') {
    tabContent = renderHighlightingTab(line);
  } else if (sl.tab === 'cameraMotion' && line.type === 'speaking') {
    tabContent = renderCameraMotionTab();
  } else if (sl.tab === 'specialEffects') {
    tabContent = renderSpecialEffectsTab();
  }

  const tab = (name, iconName, label) =>
    availableTabs.includes(name)
      ? `<div class="dr-tab ${sl.tab === name ? 'active' : ''}" onclick="switchScriptLineTab('${name}')">
           ${window.icon(iconName)} ${label}
         </div>`
      : '';

  root.innerHTML = `
    <div class="dr-modal-bg">
      <div class="dr-modal">
        <button class="dr-close" onclick="closeScriptLineModal()">&times;</button>

        <div class="dr-tabs">
          ${tab('sprite', 'sprite', 'Sprite')}
          ${tab('audio', 'volume', 'Audio')}
          ${tab('dialogueBox', 'message', 'Box Style')}
          ${tab('highlighting', 'highlight', 'Highlighting')}
          ${tab('cameraMotion', 'camera', 'Camera')}
          ${tab('specialEffects', 'sparkles', 'Effects')}
        </div>

        <div class="dr-modal-content">
          ${tabContent}
        </div>

        ${sl.err ? `<div class="dr-err">${sl.err}</div>` : ''}
        ${sl.msg ? `<div class="dr-success">${sl.msg}</div>` : ''}

        <div class="dr-btn-row">
          <button class="btn btn-secondary" onclick="closeScriptLineModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveScriptLineAdvanced()">Save Changes</button>
        </div>
      </div>
    </div>
  `;
}

export function switchScriptLineTab(tab) {
  sl.tab = tab;
  sl.err = '';
  sl.msg = '';
  renderScriptLineModal();

  // The highlighting tab wires up drag selection against the freshly
  // rendered character spans.
  if (tab === 'highlighting') {
    setTimeout(() => initializeDragSelection(), 0);
  }
}

/** Close and reset the modal. Safe to call when nothing is open. */
export function closeScriptLineModal() {
  stopAudioPreview(AUDIO_PREVIEW_KEY);
  teardownDragSelection();
  const modalRoot = document.getElementById('modalroot');
  if (modalRoot) modalRoot.innerHTML = '';
  sl.activeLineId = null;
  sl.tab = 'sprite';
  sl.err = '';
  sl.msg = '';
}

export async function saveScriptLineAdvanced() {
  const line = activeLine();
  if (!line) {
    sl.err = 'Script line not found. Please close and reopen the modal.';
    renderScriptLineModal();
    return;
  }

  const dialogue = line.dialogue || line.text || '';
  const validationError = validateScriptLineFields(dialogue);
  if (validationError) {
    sl.err = validationError;
    renderScriptLineModal();
    return;
  }

  try {
    showLoader(true, 'Saving…');

    if (line.type === 'speaking') {
      line.spriteIndex = sl.fields.spriteIndex;
      line.cameraMotion = sl.fields.cameraMotion;
    }

    // Common to narrator and speaking. Highlights are normalized against the
    // line's current text so stale or overlapping ranges never reach trial.json.
    line.highlights = normalizeHighlights(sl.fields.highlights, dialogue.length);
    line.specialEffects = sl.fields.specialEffects;
    line.dialogueBoxStyle = sl.fields.dialogueBoxStyle;

    if (sl.fields.audioBlob) {
      if (!state.dirHandle) {
        throw new Error('No trial folder selected. Please choose a folder first.');
      }

      const audioDir = await state.dirHandle.getDirectoryHandle('Audio', { create: true });

      // Name the file after the line id; default to mp3 when the source has no
      // extension.
      const ext = sl.fields.audioBlob.name.includes('.')
        ? sl.fields.audioBlob.name.split('.').pop()
        : 'mp3';
      const audioFileName = `${line.id}.${ext}`;

      const audioFileHandle = await audioDir.getFileHandle(audioFileName, { create: true });
      const writable = await audioFileHandle.createWritable();
      await writable.write(sl.fields.audioBlob);
      await writable.close();

      line.audioFile = audioFileName;
    } else if (sl.fields.audioFile === null && line.audioFile) {
      // Audio was cleared — remove the file, but don't fail the save if it's
      // already gone.
      try {
        if (state.dirHandle) {
          const audioDir = await state.dirHandle.getDirectoryHandle('Audio', { create: false });
          await audioDir.removeEntry(line.audioFile);
        }
      } catch (e) {
        console.warn('Could not remove audio file:', e);
      }
      line.audioFile = null;
    }

    await autoSaveTrial();

    showLoader(false);
    sl.err = '';
    sl.msg = 'Changes saved successfully';
    closeModal();
    renderScriptEditor();
  } catch (error) {
    console.error('Error saving script line:', error);
    showLoader(false);
    sl.err = `Failed to save: ${error.message || 'Unknown error'}`;
    renderScriptLineModal();
  }
}

// Validate the edit buffer before saving so corrupt data never reaches disk.
function validateScriptLineFields(dialogue) {
  if (Array.isArray(sl.fields.highlights)) {
    for (const h of sl.fields.highlights) {
      if (h.startChar < 0 || h.endChar > dialogue.length || h.startChar >= h.endChar) {
        return 'Invalid highlight range detected.';
      }
      if (!COLOR_REGEX.test(h.color || '')) {
        return 'Invalid highlight color detected.';
      }
    }
  }

  if (sl.fields.cameraMotion) {
    const duration = sl.fields.cameraMotion.duration;
    if (duration !== undefined && (duration < 0.1 || duration > 10)) {
      return 'Camera duration must be between 0.1 and 10 seconds.';
    }
  }

  if (sl.fields.dialogueBoxStyle) {
    const opacity = sl.fields.dialogueBoxStyle.bgOpacity;
    if (opacity !== undefined && (opacity < 0 || opacity > 1)) {
      return 'Background opacity must be between 0 and 1.';
    }
    const thickness = sl.fields.dialogueBoxStyle.borderThickness;
    if (thickness !== undefined && (thickness < 0 || thickness > 10)) {
      return 'Border thickness must be between 0 and 10 pixels.';
    }
    const color = sl.fields.dialogueBoxStyle.borderColor;
    if (color && !COLOR_REGEX.test(color)) {
      return 'Border color must be a valid hex color.';
    }
  }

  return null;
}
