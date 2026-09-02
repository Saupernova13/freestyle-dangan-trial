// Audio storage for minigame voice lines. Owns the
// Audio/Minigames/<gameId>/ layout so no editor re-implements the walk.
import { markFileDeleted } from './history.js';
import { removeEntry, reportFailedRemoval } from './fileOps.js';
import { state } from './state.js';
import { showToast } from '../ui/dialogs.js';

async function getMinigameAudioDir(gameId, create) {
  const audioDir = await state.dirHandle.getDirectoryHandle('Audio', { create });
  const minigamesDir = await audioDir.getDirectoryHandle('Minigames', { create });
  return minigamesDir.getDirectoryHandle(gameId, { create });
}

// Throws on failure; callers report it.
export async function saveMinigameAudioFile(gameId, fileName, file) {
  const dir = await getMinigameAudioDir(gameId, true);
  const handle = await dir.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  await writable.write(file);
  await writable.close();
}

// A missing file is not an error worth surfacing; a failed delete is - it
// stays in the folder and ships in every export.
export async function deleteMinigameAudioFile(gameId, fileName) {
  if (!fileName) return;
  const dir = await getMinigameAudioDir(gameId, false).catch(() => null);
  reportFailedRemoval(fileName, await removeEntry(dir, fileName));
  // Undo cannot bring the bytes back, so it must not step past this.
  markFileDeleted();
}

// File, or null if it can't be read.
export async function loadMinigameAudioFile(gameId, fileName) {
  try {
    const dir = await getMinigameAudioDir(gameId, false);
    const handle = await dir.getFileHandle(fileName);
    return await handle.getFile();
  } catch (error) {
    console.error('Error loading minigame audio:', error);
    return null;
  }
}

// The File, or null after warning and clearing the input.
export function validateAudioUpload(event) {
  const file = event.target.files[0];
  if (!file) return null;
  if (!file.type.startsWith('audio/')) {
    showToast('Please select an audio file.', { type: 'warning' });
    event.target.value = '';
    return null;
  }
  return file;
}
