// Central mutable application state.
//
// Every module reads and writes trial data through this single object, which
// makes data flow explicit (`state.scriptLines`, not an ambient global) and
// keeps cross-module mutation auditable. UI-local state (open modal, active
// dropdown, drag-in-progress) stays module-local in the file that owns it.
import { BLOCK_COUNT } from './constants.js';

export const state = {
  // Trial data
  cast: Array(BLOCK_COUNT).fill(null),
  trialName: '',
  dirHandle: null, // FileSystemDirectoryHandle of the open trial folder

  // View management
  activeView: 'cast', // "cast" | "script" | "truthBullets" | "minigames"
  scriptLines: [],
  minigames: [],
  truthBullets: [],
  selectedTruthBulletId: null,

  // Script editor drag-and-drop
  draggedLineIds: [],
  selectedLineIds: new Set(),
  dragGhostElement: null,
};
