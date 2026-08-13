// Helpers for reading and rendering cast members.
import { blockTypes } from '../core/constants.js';
import { state } from '../core/state.js';
import { escapeHtml } from '../utils.js';

export function getCharacterType(index) {
  return blockTypes[index] ? 'headmaster' : 'student';
}

export function isHeadmaster(index) {
  return blockTypes[index] === true;
}

// Required fields for a "complete" character profile, with display labels.
const REQUIRED_FIELDS = [
  ['name', 'First name'],
  ['surname', 'Last name'],
  ['dob', 'Date of birth'],
  ['weight', 'Weight'],
  ['chest', 'Chest'],
  ['likes', 'Likes'],
  ['dislikes', 'Dislikes'],
  ['notes', 'Notes'],
];

// `fields` is the modal's edit buffer or a saved character. Returns the
// display labels of what is still missing.
export function missingCharacterFields(fields, hasSprite) {
  const missing = REQUIRED_FIELDS.filter(([key]) => {
    const v = fields[key];
    return v === undefined || v === null || String(v).trim() === '';
  }).map(([, label]) => label);

  const heightOk = !isNaN(parseFloat(fields.heightM)) && !isNaN(parseInt(fields.heightCM, 10));
  if (!heightOk) missing.push('Height');
  if (!hasSprite) missing.push('At least one sprite');
  return missing;
}

// A saved cast member is complete when it has every required field and a sprite.
export function isCharacterComplete(char) {
  if (!char) return false;
  const hasSprite = Array.isArray(char.sprites) && char.sprites.some(Boolean);
  return missingCharacterFields(char, hasSprite).length === 0;
}

// `disabledIds` are shown greyed with an "(already selected)" note, for the
// editors where one character cannot fill two roles.
export function renderCharacterOptions(selectedId, disabledIds = []) {
  const options = state.cast
    .filter((c) => c)
    .map((c) => {
      const isDisabled = disabledIds.includes(c.id);
      return `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}>
        ${escapeHtml(`${c.name} ${c.surname}`)}${isDisabled ? ' (already selected)' : ''}
      </option>`;
    })
    .join('');
  return `<option value="">None</option>${options}`;
}
