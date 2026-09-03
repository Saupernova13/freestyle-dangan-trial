// Helpers for reading and rendering cast members.
import { blockTypes } from '../core/constants.js';
import { state } from '../core/state.js';
import { renderOptions } from '../ui/options.js';

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

// The blood types the profile offers. They are their own labels.
export const BLOOD_TYPES = ['A', 'B', 'O', 'AB', 'Unknown'];

// blood is an optional free string, so a character can hold no blood type at
// all or one this list does not name - an imported profile saying "AB-", say.
// With only the five fixed entries the control showed "A" selected in both
// cases while the file said otherwise, and the next edit to any other field
// on the form saved that "A" over it.
export function renderBloodTypeOptions(selected) {
  const items = [{ value: '', label: 'Not set' }].concat(
    BLOOD_TYPES.map((type) => ({ value: type, label: type }))
  );
  if (selected && !BLOOD_TYPES.includes(selected)) {
    items.push({ value: selected, label: selected, suffix: ' (from the file)' });
  }
  return renderOptions(items, selected || '');
}

// `disabledIds` are shown greyed with an "(already selected)" note, for the
// editors where one character cannot fill two roles.
export function renderCharacterOptions(selectedId, disabledIds = []) {
  const items = state.cast
    .filter((c) => c)
    .map((c) => {
      const isDisabled = disabledIds.includes(c.id);
      return {
        value: c.id,
        label: `${c.name} ${c.surname}`,
        disabled: isDisabled,
        suffix: isDisabled ? ' (already selected)' : '',
      };
    });
  return renderOptions([{ value: '', label: 'None' }, ...items], selectedId);
}
