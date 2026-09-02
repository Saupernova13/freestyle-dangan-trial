// Undo/redo history: snapshots of the trial-data slice of state.
//
// Recording piggybacks on storage.js's persistence choke points, so history
// needs no per-feature wiring. Restores go the other way: app.js injects a
// callback via initHistory, since importing render/storage here would cycle.
// Keep this module DOM-free for the node tests.
import { state } from './state.js';

const MAX_SNAPSHOTS = 50;
const FIELDS = ['trialName', 'cast', 'scriptLines', 'minigames', 'truthBullets'];

let past = [];
let present = null;
let future = [];
let recordTimer = null;
let restoring = false;
let onRestore = null;
// Set by an operation that deleted a file; consumed by the next flush.
let barrierPending = false;

// Deep-copies arrays and plain objects; primitives, Blobs and Files go by
// reference. Blobs are immutable, so sharing keeps snapshots cheap and
// preserves Blob identity for audio previews across an undo.
function cloneValue(v) {
  if (Array.isArray(v)) return v.map(cloneValue);
  if (v && typeof v === 'object' && v.constructor === Object) {
    const out = {};
    for (const k of Object.keys(v)) out[k] = cloneValue(v[k]);
    return out;
  }
  return v;
}

function takeSnapshot() {
  const snap = {};
  for (const f of FIELDS) snap[f] = cloneValue(state[f]);
  return snap;
}

// restoreCallback runs after a snapshot is applied to state.
export function initHistory(restoreCallback) {
  onRestore = restoreCallback;
}

// Called on open/create, so undo can never cross from one trial into another.
export function resetHistory() {
  clearTimeout(recordTimer);
  recordTimer = null;
  barrierPending = false;
  past = [];
  future = [];
  present = takeSnapshot();
}

// Records that something was deleted from disk, not just from state.
//
// A snapshot holds trial data only, and cloneValue passes Blobs by reference,
// so undoing past a deletion repainted a cast member whose folder was gone or
// a line whose audio file was gone. Everything looked right - the sprites
// still rendered from memory - and the export packaged nothing for them, so
// the trial shipped broken with no indication anywhere.
//
// Restoring the bytes instead would mean a redo-safe write path at every
// delete site, and a half-written restore is a worse failure than a shortened
// undo stack. So undo does not cross a deletion: the past is dropped at the
// barrier, and everything after it stays undoable.
//
// Deferred to the next flush rather than applied immediately, so the caller
// can delete, mutate state and save in any order without the barrier landing
// mid-sequence.
export function markFileDeleted() {
  barrierPending = true;
}

// Trailing-debounced, so a keystroke storm yields one settled snapshot.
export function recordChange(delayMs = 500) {
  if (restoring || present === null) return;
  clearTimeout(recordTimer);
  recordTimer = setTimeout(flushRecord, delayMs);
}

function flushRecord() {
  clearTimeout(recordTimer);
  recordTimer = null;
  if (barrierPending) {
    barrierPending = false;
    past = [];
    future = [];
    present = takeSnapshot();
    return;
  }
  past.push(present);
  if (past.length > MAX_SNAPSHOTS) past.shift();
  present = takeSnapshot();
  future = [];
}

export function canUndo() {
  // A pending barrier will empty the past on the next flush, so there is
  // nothing reachable behind it.
  if (barrierPending) return false;
  return recordTimer !== null || past.length > 0;
}

export function canRedo() {
  return !barrierPending && future.length > 0;
}

export function undo() {
  // A pending barrier is applied here too, not only on the next save: the
  // keyboard shortcut calls this directly, so Ctrl+Z between a deletion and
  // the save that follows it would otherwise still cross the barrier.
  if (recordTimer || barrierPending) flushRecord();
  if (past.length === 0 || present === null) return false;
  future.push(present);
  present = past.pop();
  applyPresent();
  return true;
}

export function redo() {
  if (recordTimer || barrierPending) flushRecord();
  if (future.length === 0 || present === null) return false;
  past.push(present);
  present = future.pop();
  applyPresent();
  return true;
}

function applyPresent() {
  restoring = true;
  try {
    for (const f of FIELDS) state[f] = cloneValue(present[f]);
    // Transient UI state can point at data that no longer exists.
    state.selectedLineIds.clear();
    state.draggedLineIds = [];
    if (!state.truthBullets.some((b) => b.bulletId === state.selectedTruthBulletId)) {
      state.selectedTruthBulletId = null;
    }
    if (onRestore) onRestore();
  } finally {
    restoring = false;
  }
}

// True while a restore's side effects run, so the persistence hooks don't
// record it as a fresh edit.
export function isRestoring() {
  return restoring;
}
