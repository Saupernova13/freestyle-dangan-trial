// Drag-to-reorder for the ordered lists inside a minigame editor: nonstop
// debate's dialogue lines, debate scrum's arguments, logic dive's questions.
//
// The three editors held character-for-character identical copies of these
// five handlers. They had to invent three prefixes because main.js bridges
// every module export onto `window` for the inline handler attributes and
// console.errors on a collision - so the names implied a difference the
// bodies did not have, and two of the five took no entity-specific argument
// at all.
//
// The drop site names the list it belongs to and a drop is ignored unless it
// matches the list the drag started in. The three separate handler names used
// to provide that guarantee by accident; here it is stated.
import { dropAtGap } from '../../core/listOps.js';
import { autoSaveTrial } from '../../core/storage.js';
import { findMinigame, renderMinigameDetails } from '../minigameView.js';
import { registerActions } from '../../ui/actions.js';

// The three lists render the same attributes; only the data differs.
registerActions('dragstart', {
  listDragStart: (el, event) =>
    handleListDragStart(event, el.dataset.listKey, el.dataset.idKey, el.dataset.itemId),
});
registerActions('dragend', { listDragEnd: (el, event) => handleListDragEnd(event) });
registerActions('dragover', { listGapDragOver: (el, event) => handleListGapDragOver(event) });
registerActions('dragleave', { listGapDragLeave: (el, event) => handleListGapDragLeave(event) });
registerActions('drop', {
  listDropInGap: (el, event) =>
    handleListDropInGap(
      event,
      el.dataset.gameId,
      el.dataset.listKey,
      Number(el.dataset.insertPosition)
    ),
});

// { listKey, idKey, itemId } for the drag in flight, or null.
let dragged = null;

export function handleListDragStart(event, listKey, idKey, itemId) {
  dragged = { listKey, idKey, itemId };
  event.target.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
}

export function handleListDragEnd(event) {
  event.target.classList.remove('dragging');
  dragged = null;
  document.querySelectorAll('.drag-over-gap').forEach((el) => {
    el.classList.remove('drag-over-gap');
  });
}

export function handleListDropInGap(event, gameId, listKey, insertPosition) {
  event.preventDefault();
  event.stopPropagation();

  if (!dragged || dragged.listKey !== listKey) return;
  const mg = findMinigame(gameId);
  const list = mg && mg.typeSpecific ? mg.typeSpecific[listKey] : null;
  if (!Array.isArray(list)) return;

  const changed = dropAtGap(list, dragged.idKey, [dragged.itemId], insertPosition);
  dragged = null;
  renderMinigameDetails();
  if (changed) autoSaveTrial();
}

export function handleListGapDragOver(event) {
  event.preventDefault(); // required to allow the drop
  event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('drag-over-gap');
}

export function handleListGapDragLeave(event) {
  event.currentTarget.classList.remove('drag-over-gap');
}

// Test seam: the drag state is module-local so a suite can reset it between
// cases, the way a fresh page load would.
export function resetDragState() {
  dragged = null;
}
