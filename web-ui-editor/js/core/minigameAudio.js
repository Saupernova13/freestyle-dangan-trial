// Audio file storage for minigame voice lines.
//
// Every minigame editor stores its audio under Audio/Minigames/<gameId>/ in
// the trial folder; this module owns that layout so editors don't each
// re-implement the directory walk, write, delete, and lazy-load logic.
import { state } from './state.js';

async function getMinigameAudioDir(gameId, create) {
  const audioDir = await state.dirHandle.getDirectoryHandle('Audio', { create });
  const minigamesDir = await audioDir.getDirectoryHandle('Minigames', { create });
  return minigamesDir.getDirectoryHandle(gameId, { create });
}

// Write an uploaded audio file. Throws on failure (callers report to user).
export async function saveMinigameAudioFile(gameId, fileName, file) {
  const dir = await getMinigameAudioDir(gameId, true);
  const handle = await dir.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  await writable.write(file);
  await writable.close();
}

// Best-effort delete; a missing file is not an error worth surfacing.
export async function deleteMinigameAudioFile(gameId, fileName) {
  if (!fileName) return;
  try {
    const dir = await getMinigameAudioDir(gameId, false);
    await dir.removeEntry(fileName);
  } catch (e) {
    console.warn('Could not remove audio file:', e);
  }
}

// Load an audio file from disk for preview playback. Returns File or null.
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

// Validate an <input type="file"> change event holds an audio file.
// Returns the File, or null after alerting and resetting the input.
export function validateAudioUpload(event) {
  const file = event.target.files[0];
  if (!file) return null;
  if (!file.type.startsWith('audio/')) {
    alert('Please select an audio file');
    event.target.value = '';
    return null;
  }
  return file;
}
