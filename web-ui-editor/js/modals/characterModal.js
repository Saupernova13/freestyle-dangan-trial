// Create/edit modal for a state.cast member.
import { state } from '../core/state.js';
import { uniqueDirectoryName } from '../core/opfs.js';
import { markFileDeleted } from '../core/history.js';
import { removeEntry } from '../core/fileOps.js';
import { detachCharacter } from '../core/references.js';
import { autoSaveTrial } from '../core/storage.js';
import { loadRemainingSprites } from '../core/trialAssets.js';
import {
  getCharacterType,
  isHeadmaster,
  missingCharacterFields,
} from '../models/characterModel.js';
import { CHARACTER_FORMAT_VERSION } from '../core/constants.js';
import {
  CHARACTER_FIELDS_BY_KEY,
  characterFieldsFrom,
  characterJsonFields,
  emptyCharacterFields,
} from '../models/characterFields.js';
import { renderBloodTypeOptions } from '../models/characterModel.js';
import { appSettings } from '../settings.js';
import { confirmDialog, showToast } from '../ui/dialogs.js';
import { focusFirstField } from '../ui/modalBehaviors.js';
import { escapeHtml, showLoader } from '../utils.js';
import { renderCastGrid } from '../views/castView.js';

import { setHtml } from '../ui/dom.js';
import { registerActions } from '../ui/actions.js';

registerActions('click', {
  closeCharModal: () => closeCharModal(),
  switchCharModalTab: (el) => switchCharModalTab(el.dataset.tab),
  removeCharacter: () => removeCharacter(),
  trySaveChar: () => trySaveChar(),
  bulkImportSprites: () => bulkImportSprites(),
  triggerSpriteInput: (el) => triggerSpriteInput(Number(el.dataset.index)),
});

registerActions('input', { fieldUpdate: (el) => fieldUpdate(el.dataset.field, el.value) });

registerActions('change', {
  // The blood type control is a <select>, which reports `change`.
  fieldUpdate: (el) => fieldUpdate(el.dataset.field, el.value),
  spriteUpload: (el, event) => spriteUpload(event, Number(el.dataset.index)),
});

// The form has no submit button, but Enter in a text field submits one anyway,
// which would reload the page and lose the edit.
registerActions('submit', { preventDefault: (el, event) => event.preventDefault() });
let activeIdx = null;
let charFields = emptyCharacterFields();
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
  charFields = characterFieldsFrom(c);

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
        <button class="dr-close" data-on-click="closeCharModal">&times;</button>
        <div class="dr-tabs">
          <button class="dr-tab${modalTab === 'details' ? ' active' : ''}" data-tab="details" data-on-click="switchCharModalTab">
            ${isHeadmasterChar ? window.icon('crown') : window.icon('cap')} Character Details (${characterType.charAt(0).toUpperCase() + characterType.slice(1)})
          </button>
          <button class="dr-tab${modalTab === 'sprites' ? ' active' : ''}" data-tab="sprites" data-on-click="switchCharModalTab">Sprites</button>
        </div>
        <div class="dr-modal-content">
          <div id="dr-tab-content">${modalTab === 'details' ? renderCharDetailsTab() : renderCharSpritesTab()}</div>
          ${modalErr ? `<div class="dr-err">${escapeHtml(modalErr)}</div>` : ''}
          ${modalMsg ? `<div class="dr-success">${modalMsg}</div>` : ''}
        </div>
        <div class="dr-btn-row">
          ${state.cast[activeIdx] ? `<button class="btn btn-danger dr-btn-remove" data-on-click="removeCharacter">${window.icon('trash')} Remove</button>` : ''}
          <button class="btn btn-secondary" data-on-click="closeCharModal">Cancel</button>
          <button class="btn btn-primary" data-on-click="trySaveChar" ${!state.dirHandle ? 'disabled' : ''}>Save ${isHeadmasterChar ? 'Headmaster' : 'Student'}</button>
        </div>
      </div>
    </div>
  `
  );
}

export function closeCharModal() {
  // Revoke only what the cast did not take. trySaveChar puts the very same
  // sprite objects into state.cast, so after a save every blob: URL is still
  // being rendered by the cast grid; after a cancel none of them are.
  const kept = new Set(
    (activeIdx !== null && state.cast[activeIdx] && state.cast[activeIdx].sprites) || []
  );
  charSprites.forEach((sprite) => {
    if (!kept.has(sprite)) releaseSpriteUrl(sprite);
  });
  charSprites = [];

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

// The form's row layout. Each entry is a row of one or two cells; a cell is a
// field key, `height` for the bespoke two-input Height control, or null for a
// spacer. Everything else about a field - its label, its type, its bounds,
// whether it is required - comes from CHARACTER_FIELDS.
const FORM_ROWS = [
  ['name', 'surname'],
  ['dob', 'blood'],
  ['height', 'weight'],
  ['chest', null],
  ['likes', 'dislikes'],
  ['notes'],
];

function heightCell() {
  // A real two-input special case: one label over two bounded numbers with
  // their units. The table drives the bounds; the row itself is hand-written
  // rather than contorting the table to swallow it.
  const m = CHARACTER_FIELDS_BY_KEY.heightM;
  const cm = CHARACTER_FIELDS_BY_KEY.heightCM;
  return `<label>Height</label>
        <div class="dr-fg-field input2">
          ${numberInput(m)}
          <span>m</span>
          ${numberInput(cm)}
          <span>cm</span>
        </div>`;
}

function numberInput(field, extraClass = '') {
  return `<input type="number" min="${field.min}" max="${field.max}"${
    field.step ? ` step="${field.step}"` : ''
  } class="${extraClass}" value="${escapeHtml(charFields[field.key] ?? '')}" data-field="${field.key}" data-on-input="fieldUpdate">`;
}

// One field's label and control. `oninput` alone: it fires for every control
// type used here, type=date included, so the onchange that used to sit beside
// each of these was a second attribute doing the same work.
function renderCharacterField(key, isHeadmasterChar) {
  const field = CHARACTER_FIELDS_BY_KEY[key];
  const label = `<label>${field.label}${field.required ? neededMark(key) : ''}</label>`;
  const invalid = field.required ? invalidClass(key) : '';
  const value = charFields[key] ?? '';
  // The field name travels as data, so the markup carries no expression.
  const update = `data-field="${key}" data-on-input="fieldUpdate"`;

  switch (field.type) {
    case 'select':
      return `${label}
        <select required data-field="${key}" data-on-change="fieldUpdate">
          ${renderBloodTypeOptions(charFields.blood)}
        </select>`;
    case 'number':
      return `${label}
        ${numberInput(field, invalid)}`;
    case 'textarea':
      return `${label}
        <textarea class="${invalid}" ${update} placeholder="${escapeHtml(
          field.placeholder(isHeadmasterChar)
        )}">${escapeHtml(value)}</textarea>`;
    case 'date':
      return `${label}
        <input type="date" class="${invalid}" value="${escapeHtml(value)}" ${update}>`;
    default:
      return `${label}
        <input class="${invalid}" value="${escapeHtml(value)}" ${update}>`;
  }
}

export function renderCharDetailsTab() {
  const isHeadmasterChar = isHeadmaster(activeIdx);

  const rows = FORM_ROWS.map((cells) => {
    const body = cells
      .map((cell) => {
        if (cell === null) return '<div class="dr-fg-field"></div>';
        const inner =
          cell === 'height' ? heightCell() : renderCharacterField(cell, isHeadmasterChar);
        return `<div class="dr-fg-field">${inner}</div>`;
      })
      .join('\n      ');
    return `<div class="dr-fg-row${cells.length === 1 ? ' single' : ''}">
      ${body}
    </div>`;
  }).join('\n    ');

  return `<form class="dr-form" data-on-submit="preventDefault">
    <div class="dr-role-banner${isHeadmasterChar ? ' dr-role-banner--headmaster' : ''}">
      ${isHeadmasterChar ? `${window.icon('crown')} HEADMASTER CHARACTER` : `${window.icon('cap')} STUDENT CHARACTER`}
    </div>
    ${rows}
  </form>`;
}

export function renderCharSpritesTab() {
  const isHeadmasterChar = isHeadmaster(activeIdx);

  return `
    <div class="dr-form">
      <button class="btn btn-primary dr-sprslot-bulk" type="button" data-on-click="bulkImportSprites">${window.icon('folder')} Bulk Import ${isHeadmasterChar ? 'Headmaster' : 'Student'} Sprites</button>
      <div class="dr-sprgrid">
        ${charSprites
          .map(
            (spr, i) =>
              `<div class="dr-sprslot" data-index="${i}" data-on-click="triggerSpriteInput">
            <input type="file" accept="image/*" id="sprite_inp_${i}" data-index="${i}" data-on-change="spriteUpload">
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

// Object URLs pin the whole file in memory until they are revoked. Sprite
// uploads created one per file and never revoked any, so a bulk-import session
// - 17 characters times up to 25 slots, re-imported a few times - held every
// image the author had ever selected for the life of the page.
//
// Only URLs this modal created: a sprite loaded from disk carries a data: URL
// from fileToDataUrl, which owns no resource.
function releaseSpriteUrl(sprite) {
  if (sprite && typeof sprite.dataURL === 'string' && sprite.dataURL.startsWith('blob:')) {
    URL.revokeObjectURL(sprite.dataURL);
  }
}

export function spriteUpload(e, idx) {
  const file = e.target.files[0];
  if (!file) return;

  releaseSpriteUrl(charSprites[idx]);
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
      releaseSpriteUrl(charSprites[idx]);
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
      ...characterJsonFields(charFields),
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
    let folderRemoval = { failed: false };
    if (charsDir && folderName) {
      folderRemoval = await removeEntry(charsDir, folderName, { recursive: true });
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
    // Never a green tick over a folder that is still on disk: the cast slot
    // is cleared either way, but the files are what ship in the export.
    if (folderRemoval.failed) {
      showToast(
        `Removed from the cast, but Characters/${folderName} could not be deleted.`,
        { type: 'error' }
      );
    } else {
      showToast('Character removed', { type: 'success' });
    }
  } catch (error) {
    showLoader(false);
    console.error('Failed to remove character:', error);
    showToast(`Failed to remove character: ${error.message}`, { type: 'error' });
  }
}
