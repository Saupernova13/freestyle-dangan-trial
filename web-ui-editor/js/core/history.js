// Undo/redo history: snapshots of the trial-data slice of state.
//
// Recording piggybacks on storage.js's persistence choke points, so history
// needs no per-feature wiring. Restores go the other way: app.js injects a
// callback via initHistory, because importing the render/storage modules
// here would create a cycle. Keep this module DOM-free for the node tests.
import { state } from './state.js';

const MAX_SNAPSHOTS = 50;
const FIELDS = ['trialName', 'cast', 'scriptLines', 'minigames', 'truthBullets'];

let past = [];
let present = null;
let future = [];
let recordTimer = null;
let restoring = false;
let onRestore = null;

// Deep-copies arrays and plain objects; primitives, Blobs and Files go by
// reference. Blobs are immutable, so sharing them keeps 50 snapshots cheap
// and preserves Blob identity for audio previews across an undo.
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
  past = [];
  future = [];
  present = takeSnapshot();
}

// Trailing-debounced, so a keystroke storm yields one snapshot of the
// settled text rather than fifty intermediates.
export function recordChange(delayMs = 500) {
  if (restoring || present === null) return;
  clearTimeout(recordTimer);
  recordTimer = setTimeout(flushRecord, delayMs);
}

function flushRecord() {
  clearTimeout(recordTimer);
  recordTimer = null;
  past.push(present);
  if (past.length > MAX_SNAPSHOTS) past.shift();
  present = takeSnapshot();
  future = [];
}

export function canUndo() {
  return recordTimer !== null || past.length > 0;
}

export function canRedo() {
  return future.length > 0;
}

export function undo() {
  if (recordTimer) flushRecord();
  if (past.length === 0 || present === null) return false;
  future.push(present);
  present = past.pop();
  applyPresent();
  return true;
}

export function redo() {
  if (recordTimer) flushRecord();
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
// record the restore as a fresh edit.
export function isRestoring() {
  return restoring;
}
