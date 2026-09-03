// Reading a trial's assets off disk: sprites, cast profiles, truth bullet
// images and minigame audio.
//
// Split out of storage.js, which had grown into four modules in one file -
// trial lifecycle, asset hydration, trial.json parsing and autosave. This was
// the clean seam: these four read from directory handles into `state` and
// touch nothing else - no dialogs, no autosave, no view.
import { BLOCK_COUNT } from './constants.js';
import { state } from './state.js';
import { checkCharacterFormatVersion, validateCharacterData } from './characterSchema.js';
import { minigameAudioSlots } from './minigameAudio.js';
import { appSettings } from '../settings.js';
import { fileToDataUrl } from '../utils.js';

// Fills in the sprites the cast grid skipped; called when the modal opens.
export async function loadRemainingSprites(charIndex) {
  const char = state.cast[charIndex];
  if (!char || !char._folderHandle) return;

  if (char.sprites && char.sprites.length === appSettings.maxSprites) {
    return;
  }

  if (!char.sprites) {
    char.sprites = [];
  }

  const spriteCount = appSettings.maxSprites;
  for (let j = 1; j <= spriteCount; j++) {
    if (char.sprites[j - 1]) continue;

    try {
      let f = await char._folderHandle.getFileHandle(`sprite_${String(j).padStart(2, '0')}.png`);
      let file = await f.getFile();
      let b64 = await fileToDataUrl(file);
      char.sprites[j - 1] = { dataURL: b64, fname: file.name, blob: file };
    } catch {
      char.sprites[j - 1] = null;
    }
  }
}

// Returns { unresolved, problems }: the ids listed in trial.json that no
// readable folder provided, and the character files that parse but do not
// match schema/character.schema.json.
// buildTrialJson writes `cast.map(c => c ? c.id : null)`, so a slot left null
// here loses that id on the very next keystroke - the character disappears
// from trial.json while their folder is still sitting on disk, and the
// speaking lines that reference them render with a blank speaker.
export async function loadCharactersFromIds(characterIds) {
  state.cast = Array(BLOCK_COUNT).fill(null);

  let charsDir = await state.dirHandle
    .getDirectoryHandle('Characters', { create: false })
    .catch(() => null);

  // One pass over Characters/, indexed by id, not a walk per cast slot. A
  // missing or unreadable Characters/ falls through with an empty map rather
  // than returning early, so every listed id still gets its slot held.
  const charactersById = new Map();
  // Files that parse but do not match schema/character.schema.json.
  const characterProblems = [];
  for await (const [folderName, folderHandle] of charsDir ? charsDir.entries() : []) {
    if (folderHandle.kind !== 'directory') continue;
    let charFile;
    try {
      charFile = await folderHandle.getFileHandle('character.json');
    } catch {
      // No character.json at all: an ordinary non-character folder, not a
      // failure. Separated from the parse below, which the old single catch
      // conflated with it.
      continue;
    }
    try {
      const charData = JSON.parse(await (await charFile.getFile()).text());
      const problems = validateCharacterData(charData);
      const versionCheck = checkCharacterFormatVersion(charData);
      if (!versionCheck.ok) problems.push(versionCheck.message);
      if (problems.length > 0) {
        // Reported, not skipped: the folder is still the character's, and
        // dropping it here is what erased them from trial.json before.
        characterProblems.push(`Characters/${folderName}: ${problems.join(' ')}`);
      }
      if (charData && charData.id) {
        // Kept for lazy-loading the remaining sprites.
        charData._folderHandle = folderHandle;
        charactersById.set(charData.id, charData);
      }
    } catch (err) {
      console.warn(`Could not read Characters/${folderName}/character.json:`, err);
    }
  }

  const unresolved = [];
  const duplicated = [];
  // Slots beyond the bench count are not drawn by renderCastGrid and not
  // reachable by any control, but buildTrialJson wrote every one of them back
  // - so a file with 20 entries kept slots 18-20 permanently, invisibly and
  // uneditably. Dropped here, and named in the report, rather than carried.
  const overflow = characterIds.slice(BLOCK_COUNT).filter(Boolean);
  const seen = new Set();
  for (let i = 0; i < Math.min(characterIds.length, BLOCK_COUNT); i++) {
    const id = characterIds[i];
    if (!id) continue;
    // A character sits at one bench. The same id twice put the SAME object in
    // two slots, so editing one edited both with nothing to say they were
    // linked. First occurrence keeps the slot; the rest are left empty.
    if (seen.has(id)) {
      duplicated.push(id);
      continue;
    }
    seen.add(id);
    const charData = charactersById.get(id);
    if (!charData) {
      // A placeholder, not null: it keeps the id in the slot so autosave
      // cannot erase it, and shows in the cast grid as an incomplete slot
      // rather than an empty one.
      state.cast[i] = { id, _loadFailed: true };
      unresolved.push(id);
      continue;
    }

    // Only the first sprite; the rest load via loadRemainingSprites.
    charData.sprites = [];
    try {
      const f = await charData._folderHandle.getFileHandle('sprite_01.png');
      const file = await f.getFile();
      const b64 = await fileToDataUrl(file);
      charData.sprites[0] = { dataURL: b64, fname: file.name, blob: file };
    } catch {
      charData.sprites[0] = null;
    }

    state.cast[i] = charData;
  }
  return { unresolved, problems: characterProblems, duplicated, overflow };
}

export async function loadTruthBulletImages() {
  let bulletsDir = await state.dirHandle
    .getDirectoryHandle('TruthBullets', { create: false })
    .catch(() => null);
  if (!bulletsDir) return;

  for (let bullet of state.truthBullets) {
    if (bullet.imageFile) {
      try {
        const fileHandle = await bulletsDir.getFileHandle(bullet.imageFile);
        const file = await fileHandle.getFile();
        const dataURL = await fileToDataUrl(file);
        bullet.imageDataURL = dataURL;
      } catch (error) {
        console.warn(`Failed to load image for bullet ${bullet.bulletId}:`, error);
      }
    }
  }
}

export async function loadMinigameAudio() {
  try {
    const audioDir = await state.dirHandle.getDirectoryHandle('Audio', { create: false });
    const minigamesDir = await audioDir.getDirectoryHandle('Minigames', { create: false });

    for (const mg of state.minigames) {
      try {
        const gameAudioDir = await minigamesDir.getDirectoryHandle(mg.gameId, { create: false });

        for (const { owner, file, blob, label } of minigameAudioSlots(mg)) {
          if (!owner[file]) continue;
          try {
            const fileHandle = await gameAudioDir.getFileHandle(owner[file]);
            owner[blob] = await fileHandle.getFile();
          } catch (error) {
            console.warn(`Failed to load audio for ${label}:`, error);
          }
        }
      } catch (error) {
        console.warn(`Failed to load audio for minigame ${mg.gameId}:`, error);
      }
    }
  } catch (error) {
    console.warn('Failed to load minigame audio:', error);
  }
}
