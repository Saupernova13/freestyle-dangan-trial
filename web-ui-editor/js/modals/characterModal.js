// Create/edit modal for a state.cast member.
import { state } from '../core/state.js';
import { uniqueDirectoryName } from '../core/opfs.js';
import { markFileDeleted } from '../core/history.js';
import { detachCharacter } from '../core/references.js';
import { autoSaveTrial, loadRemainingSprites } from '../core/storage.js';
import {
  getCharacterType,
  isHeadmaster,
  missingCharacterFields,
} from '../models/characterModel.js';
import { CHARACTER_FORMAT_VERSION } from '../core/constants.js';
import { appSettings } from '../settings.js';
import { confirmDialog, showToast } from '../ui/dialogs.js';
import { focusFirstField } from '../ui/modalBehaviors.js';
import { escapeHtml, showLoader } from '../utils.js';
import { renderCastGrid } from '../views/castView.js';

import { setHtml } from '../ui/dom.js';
let activeIdx = null;
let charFields = {
  name: '',
  surname: '',
  heightM: 1,
  heightCM: 50,
  weight: '',
  chest: '',
  blood: 'A',
  dob: '',
  likes: '',
  dislikes: '',
  notes: '',
};
let charSprites = [];
let modalTab = 'details';
let modalErr = '';
let modalMsg = '';
// Turns empty required fields red. The "needed" markers show regardless.
let saveAttempted = false;

function hasAnySprite() {
  return charSprites.some((s) => s && (s.blob || s.dataURL));
}

// Human-readable and collision-resistant: initials, DOB, random suffix.
export function generateCharacterId(name, surname, dob) {
  const cleanName =
    name
      .charAt(0)
      .toUpperCase()
      .replace(/[^A-Za-z0-9]/g, '') || 'X';
  const cleanSurname =
    surname
      .charAt(0)
      .toUpperCase()
      .replace(/[^A-Za-z0-9]/g, '') || 'Y';
  const dobFormatted = dob.replace(/-/g, ''); // YYYYMMDD
  const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `${cleanSurname}${cleanName}_${dobFormatted}_${randomString}`;
}

export async function openCharModal(idx) {
  if (!state.dirHandle) {
    showToast('Choose a trial folder first.', { type: 'warning' });
    return;
  }

  // Editing a slot whose character.json could not be read would save the empty
  // form over a file that may still be recoverable.
  if (state.cast[idx] && state.cast[idx]._loadFailed) {
    showToast('This character could not be read from disk. Repair the folder first.', {
      type: 'warning',
    });
    return;
  }

  activeIdx = idx;
  modalTab = 'details';
  modalErr = '';
  modalMsg = '';
  saveAttempted = false;

  let c = state.cast[idx] || {};
  charFields = {
    name: c.name || '',
    surname: c.surname || '',
    heightM: c.heightM || 1,
    heightCM: c.heightCM || 50,
    weight: c.weight || '',
    chest: c.chest || '',
    blood: c.blood || 'A',
    dob: c.dob || '',
    likes: c.likes || '',
    dislikes: c.dislikes || '',
    notes: c.notes || '',
  };

  if (c.id && c._folderHandle) {
    showLoader(true, 'Loading sprites…');
    await loadRemainingSprites(idx);
    c = state.cast[idx]; // loadRemainingSprites replaced the slot
    showLoader(false);
  }

  if (c.sprites) {
    charSprites = [...c.sprites];
  } else {
    charSprites = Array(appSettings.maxSprites).fill(null);
  }

  renderCharacterModal();
  focusFirstField();
}

export function renderCharacterModal() {
  let root = document.getElementById('modalroot');
  const characterType = getCharacterType(activeIdx);
  const isHeadmasterChar = isHeadmaster(activeIdx);

  setHtml(
    root,
    `
    <div class="dr-modal-bg">
      <div class="dr-modal">
        <button class="dr-close" onclick="closeCharModal()">&times;</button>
        <div class="dr-tabs">
          <button class="dr-tab${modalTab === 'details' ? ' active' : ''}" onclick="switchCharModalTab('details')">
            ${isHeadmasterChar ? window.icon('crown') : window.icon('cap')} Character Details (${characterType.charAt(0).toUpperCase() + characterType.slice(1)})
          </button>
          <button class="dr-tab${modalTab === 'sprites' ? ' active' : ''}" onclick="switchCharModalTab('sprites')">Sprites</button>
        </div>
        <div class="dr-modal-content">
          <div id="dr-tab-content">${modalTab === 'details' ? renderCharDetailsTab() : renderCharSpritesTab()}</div>
          ${modalErr ? `<div class="dr-err">${escapeHtml(modalErr)}</div>` : ''}
          ${modalMsg ? `<div class="dr-success">${modalMsg}</div>` : ''}
        </div>
        <div class="dr-btn-row">
          ${state.cast[activeIdx] ? `<button class="btn btn-danger dr-btn-remove" onclick="removeCharacter()">${window.icon('trash')} Remove</button>` : ''}
          <button class="btn btn-secondary" onclick="closeCharModal()">Cancel</button>
          <button class="btn btn-primary" onclick="trySaveChar()" ${!state.dirHandle ? 'disabled' : ''}>Save ${isHeadmasterChar ? 'Headmaster' : 'Student'}</button>
        </div>
      </div>
    </div>
  `
  );
}

export function closeCharModal() {
  setHtml(document.getElementById('modalroot'), '');
  activeIdx = null;
}

export function switchCharModalTab(tab) {
  modalTab = tab;
  modalErr = '';
  modalMsg = '';
  renderCharacterModal();
}

export function fieldUpdate(field, val) {
  charFields[field] = val;
}

function invalidClass(key) {
  return saveAttempted && !String(charFields[key] ?? '').trim() ? ' is-invalid' : '';
}

function neededMark(key) {
  return !String(charFields[key] ?? '').trim() ? ' <span class="req-flag">needed</span>' : '';
}

export function renderCharDetailsTab() {
  const isHeadmasterChar = isHeadmaster(activeIdx);

  return `<form class="dr-form" onsubmit="event.preventDefault();">
    <div class="dr-role-banner${isHeadmasterChar ? ' dr-role-banner--headmaster' : ''}">
      ${isHeadmasterChar ? `${window.icon('crown')} HEADMASTER CHARACTER` : `${window.icon('cap')} STUDENT CHARACTER`}
    </div>
    <div class="dr-fg-row">
      <div class="dr-fg-field">
          <label>First Name${neededMark('name')}</label>
          <input class="${invalidClass('name')}" value="${escapeHtml(charFields.name || '')}" onchange="fieldUpdate('name',this.value)" oninput="fieldUpdate('name',this.value)">
      </div>
      <div class="dr-fg-field">
          <label>Last Name${neededMark('surname')}</label>
          <input class="${invalidClass('surname')}" value="${escapeHtml(charFields.surname || '')}" onchange="fieldUpdate('surname',this.value)" oninput="fieldUpdate('surname',this.value)">
      </div>
    </div>
    <div class="dr-fg-row">
      <div class="dr-fg-field">
          <label>Date of Birth${neededMark('dob')}</label>
          <input type="date" class="${invalidClass('dob')}" value="${charFields.dob || ''}" onchange="fieldUpdate('dob',this.value)" oninput="fieldUpdate('dob',this.value)">
      </div>
      <div class="dr-fg-field">
        <label>Blood Type</label>
        <select required onchange="fieldUpdate('blood',this.value)">
          <option${charFields.blood === 'A' ? ' selected' : ''}>A</option>
          <option${charFields.blood === 'B' ? ' selected' : ''}>B</option>
          <option${charFields.blood === 'O' ? ' selected' : ''}>O</option>
          <option${charFields.blood === 'AB' ? ' selected' : ''}>AB</option>
          <option${charFields.blood === 'Unknown' ? ' selected' : ''}>Unknown</option>
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
        <label>Weight (kg)${neededMark('weight')}</label>
        <input type="number" min="0" max="300" class="${invalidClass('weight')}" value="${charFields.weight || ''}" onchange="fieldUpdate('weight',this.value)" oninput="fieldUpdate('weight',this.value)">
      </div>
    </div>
    <div class="dr-fg-row">
      <div class="dr-fg-field">
        <label>Chest (cm)${neededMark('chest')}</label>
        <input type="number" min="0" max="200" class="${invalidClass('chest')}" value="${charFields.chest || ''}" onchange="fieldUpdate('chest',this.value)" oninput="fieldUpdate('chest',this.value)">
      </div>
      <div class="dr-fg-field"></div>
    </div>
    <div class="dr-fg-row">
      <div class="dr-fg-field">
        <label>Likes${neededMark('likes')}</label>
        <textarea class="${invalidClass('likes')}" onchange="fieldUpdate('likes',this.value)" oninput="fieldUpdate('likes',this.value)" placeholder="${isHeadmasterChar ? 'What does this headmaster enjoy?' : 'What does this student like?'}">${escapeHtml(charFields.likes || '')}</textarea>
      </div>
      <div class="dr-fg-field">
        <label>Dislikes${neededMark('dislikes')}</label>
        <textarea class="${invalidClass('dislikes')}" onchange="fieldUpdate('dislikes',this.value)" oninput="fieldUpdate('dislikes',this.value)" placeholder="${isHeadmasterChar ? 'What does this headmaster dislike?' : 'What does this student dislike?'}">${escapeHtml(charFields.dislikes || '')}</textarea>
      </div>
    </div>
    <div class="dr-fg-row single">
      <div class="dr-fg-field">
        <label>Notes${neededMark('notes')}</label>
        <textarea class="${invalidClass('notes')}" onchange="fieldUpdate('notes',this.value)" oninput="fieldUpdate('notes',this.value)" placeholder="${isHeadmasterChar ? 'Additional notes about this headmaster...' : 'Additional notes about this student...'}">${escapeHtml(charFields.notes || '')}</textarea>
      </div>
    </div>
  </form>`;
}

export function renderCharSpritesTab() {
  const isHeadmasterChar = isHeadmaster(activeIdx);

  return `
    <div class="dr-form">
      <button class="btn btn-primary dr-sprslot-bulk" type="button" onclick="bulkImportSprites()">${window.icon('folder')} Bulk Import ${isHeadmasterChar ? 'Headmaster' : 'Student'} Sprites</button>
      <div class="dr-sprgrid">
        ${charSprites
          .map(
            (spr, i) =>
              `<div class="dr-sprslot" onclick="triggerSpriteInput(${i})">
            <input type="file" accept="image/*" id="sprite_inp_${i}" onchange="spriteUpload(event,${i})">
            ${
              spr
                ? `<img src="${spr.dataURL}" alt="Sprite ${i + 1}"><span class="dr-sprslot-num">#${i + 1}</span>`
                : `<span style="color: var(--text-tertiary);">+<br><small>Sprite #${i + 1}</small></span>`
            }
          </div>`
          )
          .join('')}
      </div>
      <p style="font-size: 0.875rem; color: var(--text-tertiary); margin-top: 1rem;">
        Upload images in any format — they are saved as PNG. Bulk import fills the
        slots in order, so you can add as many or as few as you have ready.
        ${isHeadmasterChar ? '<br><strong>Note:</strong> This is for the Headmaster character.' : ''}
      </p>
    </div>
  `;
}

export function spriteUpload(e, idx) {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  charSprites[idx] = { dataURL: url, fname: file.name, blob: file };
  renderCharacterModal();
}

export function triggerSpriteInput(i) {
  document.getElementById(`sprite_inp_${i}`).click();
}

export function bulkImportSprites() {
  let inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.multiple = true;

  inp.onchange = () => {
    const files = Array.from(inp.files);
    if (files.length === 0) return;

    // Extra files are dropped with a heads-up, not rejected wholesale.
    const slots = Math.max(charSprites.length, appSettings.maxSprites);
    const usable = files.slice(0, slots);
    usable.forEach((f, idx) => {
      const url = URL.createObjectURL(f);
      charSprites[idx] = { dataURL: url, fname: f.name, blob: f };
    });

    if (files.length > slots) {
      showToast(`Imported the first ${slots} of ${files.length} images.`, { type: 'warning' });
    }
    renderCharacterModal();
  };

  inp.click();
}

export async function trySaveChar() {
  if (!state.dirHandle) {
    showToast('Choose a trial folder first.', { type: 'warning' });
    return;
  }

  // Drafts are allowed; `missing` only drives the grid flag and the toast.
  saveAttempted = true;
  const missing = missingCharacterFields(charFields, hasAnySprite());

  try {
    showLoader(true, 'Saving character…');

    const existingChar = state.cast[activeIdx];
    const characterId = existingChar
      ? existingChar.id
      : generateCharacterId(charFields.name, charFields.surname, charFields.dob);

    // Falling back to the id keeps unnamed drafts off a shared "_" directory.
    const nameBased = (charFields.name + '_' + charFields.surname)
      .replace(/[^a-zA-Z0-9_\- ]/g, '_')
      .replace(/^[_\s]+|[_\s]+$/g, '');
    let charsDir = await state.dirHandle.getDirectoryHandle('Characters', { create: true });

    // An existing character keeps the folder it already owns. A new one has to
    // be given a free name: identity is the character id, but the directory is
    // keyed on the display name, so a second "John Smith" - twins, or a typo -
    // used to land in the first one's folder and overwrite their
    // character.json and every sprite. trial.json still listed both ids, so on
    // reopen the first slot came back empty with its sprites gone, and nothing
    // warned at any point.
    const charDirname =
      existingChar?._folderHandle?.name ||
      (await uniqueDirectoryName(charsDir, nameBased || characterId));
    let charDir = await charsDir.getDirectoryHandle(charDirname, { create: true });

    let charJson = {
      // Written from now on, so a reader can tell which shape it is looking at.
      // Absent in older files, which are treated as the current major.
      formatVersion: CHARACTER_FORMAT_VERSION,
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
      isHeadmaster: isHeadmaster(activeIdx),
      position: activeIdx,
      lastModified: new Date().toISOString(),
    };

    let writer = await charDir
      .getFileHandle('character.json', { create: true })
      .then((fh) => fh.createWritable());
    await writer.write(JSON.stringify(charJson, null, 2));
    await writer.close();

    // Iterate the buffer, not maxSprites: lowering that setting must not drop
    // a character's existing extra sprites.
    let savedSprites = [];
    for (let k = 0; k < charSprites.length; k++) {
      let s = charSprites[k];
      if (s && s.blob) {
        try {
          let sw = await charDir
            .getFileHandle(`sprite_${String(k + 1).padStart(2, '0')}.png`, { create: true })
            .then((fh) => fh.createWritable());
          await sw.write(s.blob);
          await sw.close();
          savedSprites.push(s);
        } catch (error) {
          console.error(`Failed to save sprite ${k + 1}:`, error);
          throw new Error(`Failed to save sprite ${k + 1}: ${error.message}`, { cause: error });
        }
      } else {
        savedSprites.push(null);
      }
    }

    // The folder handle carries over, so a later edit hits the same directory.
    state.cast[activeIdx] = {
      ...charJson,
      sprites: savedSprites,
      _folderHandle: charDir,
    };

    await autoSaveTrial();

    showLoader(false);
    closeCharModal();
    renderCastGrid();

    if (missing.length > 0) {
      showToast(`Saved as draft — still needs: ${missing.join(', ')}.`, {
        type: 'warning',
        duration: 5000,
      });
    } else {
      showToast('Character saved', { type: 'success' });
    }
  } catch (error) {
    showLoader(false);
    modalErr = `Failed to save character: ${error.message}`;
    renderCharacterModal();
    console.error('Character save error:', error);
  }
}

// Also detaches the character from every speaking line and minigame that
// referenced it.
export async function removeCharacter() {
  const existing = state.cast[activeIdx];
  if (!existing) {
    closeCharModal();
    return;
  }

  const fullName = `${existing.name || ''} ${existing.surname || ''}`.trim() || 'this character';
  const confirmed = await confirmDialog({
    title: 'Remove character',
    message:
      `Remove ${fullName}? This deletes their files - which cannot be undone - ` +
      'and clears every script line and minigame that uses them.',
    confirmLabel: 'Remove',
    danger: true,
  });
  if (!confirmed) return;

  try {
    showLoader(true, 'Removing character…');

    const charsDir = await state.dirHandle
      .getDirectoryHandle('Characters', { create: false })
      .catch(() => null);
    // By the handle the character was loaded with, never by a name rebuilt
    // from the current fields: renaming someone since creation would aim
    // removeEntry at the wrong folder, or silently miss.
    const folderName = existing._folderHandle?.name;
    if (charsDir && folderName) {
      try {
        await charsDir.removeEntry(folderName, { recursive: true });
      } catch (e) {
        console.warn('Could not remove character folder:', e);
      }
    } else if (!folderName) {
      console.warn(`No folder handle for character ${existing.id}; leaving files in place.`);
    }
    // Undo cannot bring the folder back, so it must not step past this.
    if (charsDir && folderName) markFileDeleted();

    state.scriptLines.forEach((l) => {
      if (l.type === 'speaking' && l.characterId === existing.id) l.characterId = '';
    });
    // The minigames too: speaker slots, nonstop dialogue lines and scrum
    // arguments all carry character ids, and none of them were cleared.
    detachCharacter(state.minigames, existing.id);

    state.cast[activeIdx] = null;
    await autoSaveTrial();

    showLoader(false);
    closeCharModal();
    renderCastGrid();
    showToast('Character removed', { type: 'success' });
  } catch (error) {
    showLoader(false);
    console.error('Failed to remove character:', error);
    showToast(`Failed to remove character: ${error.message}`, { type: 'error' });
  }
}
