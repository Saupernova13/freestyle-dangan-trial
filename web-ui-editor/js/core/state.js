// Central mutable application state: all trial data goes through this one
// object, so cross-module mutation stays auditable. UI-local state (open
// modal, active dropdown) stays module-local in the file that owns it.
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
