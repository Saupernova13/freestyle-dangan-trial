// Character model - utility functions for working with characters
import { blockTypes } from '../core/constants.js';
import { state } from '../core/state.js';
import { escapeHtml } from '../utils.js';

export function getCharacterType(index) {
  return blockTypes[index] ? 'headmaster' : 'student';
}

export function isHeadmaster(index) {
  return blockTypes[index] === true;
}

// Render an <option> list of the current cast (with a leading "None"),
// marking `selectedId` selected. Ids in `disabledIds` are shown disabled
// with an "(already selected)" note - used by editors where the same
// character cannot fill two roles.
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
