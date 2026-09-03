// Script line modal: the per-line "advanced properties" editor.
//
// Owns the modal shell — tab bar, footer, open/close, save — and delegates each
// tab to a module under ./scriptLine/. The tabs are re-exported here so
// main.js's single `import * as scriptLineModal` still bridges every handler.
import { stopAudioPreview } from '../components/audioPreview.js';
import { renderScriptEditor } from '../app.js';
import { markFileDeleted } from '../core/history.js';
import { state } from '../core/state.js';
import { autoSaveTrial } from '../core/storage.js';
import { loadRemainingSprites } from '../core/trialAssets.js';
import { appSettings } from '../settings.js';
import { showToast } from '../ui/dialogs.js';
import { focusFirstField } from '../ui/modalBehaviors.js';
import { hasCameraMotion, hasCustomBoxStyle } from '../core/scriptLineFields.js';
import { escapeHtml, normalizeHighlights, showLoader } from '../utils.js';
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

import { setHtml } from '../ui/dom.js';
// Re-export every tab's handlers so they reach window via main.js's bridge.
export * from './scriptLine/spriteTab.js';
export * from './scriptLine/audioTab.js';
export * from './scriptLine/dialogueBoxTab.js';
export * from './scriptLine/cameraTab.js';
export * from './scriptLine/effectsTab.js';
export * from './scriptLine/highlightingTab.js';

// In display order; which tabs apply depends on the line type.
export function getAvailableTabs(line) {
  if (!line || typeof line !== 'object') return [];
  if (line.type === 'narrator') {
    return ['audio', 'dialogueBox', 'highlighting', 'specialEffects'];
  } else if (line.type === 'speaking') {
    return ['sprite', 'audio', 'dialogueBox', 'highlighting', 'cameraMotion', 'specialEffects'];
  }
  return [];
}

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

  // The picker needs every sprite; the cast grid only loaded the first.
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

// The `sl.err = '...'; renderScriptLineModal(); return;` idiom appears a
// dozen times across the tab modules. Collapsed here so the message has one
// place to be set - and, since sl.err reaches modal markup, one place to be
// escaped. Lives in this module rather than scriptLine/state.js to avoid an
// import cycle with the tabs.
export function failField(message) {
  sl.err = String(message == null ? '' : message);
  renderScriptLineModal();
}

export function renderScriptLineModal() {
  const root = document.getElementById('modalroot');
  const line = activeLine();

  // Bail rather than render a sprite tab with no character behind it.
  if (line.type === 'speaking') {
    const character = state.cast.find((c) => c && c.id === line.characterId);
    if (!character) {
      showToast('Select a character for this line first.', { type: 'warning' });
      closeModal();
      return;
    }
  }

  const availableTabs = getAvailableTabs(line);

  // Fall back to the first available tab when the current one doesn't apply.
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

  setHtml(
    root,
    `
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

        ${sl.err ? `<div class="dr-err">${escapeHtml(sl.err)}</div>` : ''}
        ${sl.msg ? `<div class="dr-success">${sl.msg}</div>` : ''}

        <div class="dr-btn-row">
          <button class="btn btn-secondary" onclick="closeScriptLineModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveScriptLineAdvanced()">Save Changes</button>
        </div>
      </div>
    </div>
  `
  );
}

export function switchScriptLineTab(tab) {
  sl.tab = tab;
  sl.err = '';
  sl.msg = '';
  renderScriptLineModal();

  // Deferred so drag selection binds to the freshly rendered char spans.
  if (tab === 'highlighting') {
    setTimeout(() => initializeDragSelection(), 0);
  }
}

// Safe to call when nothing is open.
export function closeScriptLineModal() {
  stopAudioPreview(AUDIO_PREVIEW_KEY);
  teardownDragSelection();
  const modalRoot = document.getElementById('modalroot');
  if (modalRoot) setHtml(modalRoot, '');
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

    // Cloned on the way out as well as in, so the buffer never aliases the
    // line in either direction and a later tab edit cannot reach a saved line.
    //
    // Defaults are dropped rather than written: assigning unconditionally made
    // opening the modal and pressing Save enough to paint a "Camera motion"
    // badge on a line whose camera type is 'none', and put the same dead
    // object into trial.json.
    if (line.type === 'speaking') {
      line.spriteIndex = sl.fields.spriteIndex;
      const motion = structuredClone(sl.fields.cameraMotion);
      if (hasCameraMotion({ cameraMotion: motion })) line.cameraMotion = motion;
      else delete line.cameraMotion;
    }

    // Normalized against the line's current text, so no stale or overlapping
    // range reaches trial.json.
    line.highlights = normalizeHighlights(sl.fields.highlights, dialogue.length);
    line.specialEffects = structuredClone(sl.fields.specialEffects);
    const boxStyle = structuredClone(sl.fields.dialogueBoxStyle);
    if (hasCustomBoxStyle({ dialogueBoxStyle: boxStyle })) line.dialogueBoxStyle = boxStyle;
    else delete line.dialogueBoxStyle;

    if (sl.fields.audioBlob) {
      if (!state.dirHandle) {
        throw new Error('No trial folder selected. Please choose a folder first.');
      }

      const audioDir = await state.dirHandle.getDirectoryHandle('Audio', { create: true });

      // Named after the line id; mp3 when the source has no extension.
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
      // Cleared: delete the file, but don't fail the save if it is already gone.
      try {
        if (state.dirHandle) {
          const audioDir = await state.dirHandle.getDirectoryHandle('Audio', { create: false });
          await audioDir.removeEntry(line.audioFile);
        }
      } catch (e) {
        console.warn('Could not remove audio file:', e);
      }
      // Undo cannot bring the bytes back, so it must not step past this.
      markFileDeleted();
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

// Guards the edit buffer so corrupt data never reaches disk.
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
