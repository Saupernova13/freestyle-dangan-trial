// Audio storage for minigame voice lines. Owns the
// Audio/Minigames/<gameId>/ layout so no editor re-implements the walk.
import { markFileDeleted } from './history.js';
import { removeEntry, reportFailedRemoval } from './fileOps.js';
import { state } from './state.js';
import { MAX_AUDIO_SIZE } from './constants.js';
import { showToast } from '../ui/dialogs.js';

async function getMinigameAudioDir(gameId, create) {
  const audioDir = await state.dirHandle.getDirectoryHandle('Audio', { create });
  const minigamesDir = await audioDir.getDirectoryHandle('Minigames', { create });
  return minigamesDir.getDirectoryHandle(gameId, { create });
}

// Every audio slot a minigame holds: the object that owns it, the field
// naming the file on disk, the field the loaded File is cached in, and a
// label for a warning.
//
// The loader used to re-encode this per-gameType structure itself, three
// near-identical blocks deep, which put the same knowledge in two places -
// this module already owns where a trial keeps its voice clips.
//
// A list that is not a list is skipped rather than iterated: a corrupt
// trial.json can hold a string there, and a string iterates character by
// character.
function listOf(value) {
  return Array.isArray(value) ? value : [];
}

const SLOTS_BY_TYPE = {
  *nonstop_debate(ts) {
    for (const line of listOf(ts.dialogueLines)) {
      yield {
        owner: line,
        file: 'voiceLineFile',
        blob: 'voiceLineBlob',
        label: `dialogue line ${line.lineId}`,
      };
    }
  },
  *debate_scrum(ts) {
    for (const arg of listOf(ts.arguments)) {
      yield {
        owner: arg,
        file: 'oppositionAudioFile',
        blob: 'oppositionAudioBlob',
        label: `argument ${arg.argumentId} opposition`,
      };
      yield {
        owner: arg,
        file: 'defenseAudioFile',
        blob: 'defenseAudioBlob',
        label: `argument ${arg.argumentId} defense`,
      };
    }
  },
  *mass_panic_debate(ts) {
    for (const group of listOf(ts.lineGroups)) {
      for (const speakerKey of ['speaker1', 'speaker2', 'speaker3']) {
        const line = group[speakerKey];
        if (!line) continue;
        yield {
          owner: line,
          file: 'voiceLineFile',
          blob: 'voiceLineBlob',
          label: `panic line ${group.groupId}-${speakerKey}`,
        };
      }
    }
  },
};

export function* minigameAudioSlots(mg) {
  const typeSpecific = mg && mg.typeSpecific;
  if (!typeSpecific || typeof typeSpecific !== 'object') return;
  const walk = SLOTS_BY_TYPE[mg.gameType];
  if (walk) yield* walk(typeSpecific);
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
  // Every minigame voice line came through here with no size check at all,
  // while the script line's audio tab enforced the cap - so the one limit in
  // the editor covered one of the two ways to attach a clip. An oversized
  // one is written into the trial folder and then into every export.
  if (file.size > MAX_AUDIO_SIZE) {
    showToast(`Audio file is too large. Maximum size is ${MAX_AUDIO_SIZE / (1024 * 1024)}MB.`, {
      type: 'warning',
    });
    event.target.value = '';
    return null;
  }
  return file;
}
