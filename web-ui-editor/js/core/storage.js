// Storage layer - handles file I/O and trial data persistence
import { BLOCK_COUNT, blockTypes } from './constants.js';
import { state } from './state.js';
import { updateExportButtonState } from '../export.js';
import { appSettings } from '../settings.js';
import { alertDialog } from '../ui/dialogs.js';
import { setSaveStatus } from '../ui/saveStatus.js';
import { fileToDataUrl, renderDirDisplay, showLoader } from '../utils.js';
import { renderActiveView } from '../views/viewManager.js';

export async function chooseTrialDir() {
  if (!window.showDirectoryPicker) {
    await alertDialog({
      title: 'Unsupported browser',
      type: 'error',
      message:
        'This browser cannot open trial folders. Please use a Chromium browser ' +
        '(Chrome, Edge, or Opera).',
    });
    return;
  }
  try {
    let dH = await window.showDirectoryPicker({ id: 'dr-trial-dir', mode: 'readwrite' });
    showLoader(true, 'Loading trial…');
    state.dirHandle = dH;
    renderDirDisplay(state.dirHandle);

    let files = [];
    for await (const entry of state.dirHandle.values()) files.push(entry.name);

    if (files.includes('trial.json')) {
      try {
        const file = await state.dirHandle.getFileHandle('trial.json').then((fh) => fh.getFile());
        const data = JSON.parse(await file.text());
        state.trialName = data.trialName || '';
        document.getElementById('trialNameInput').value = state.trialName;

        // Load characters from ID references
        await loadCharactersFromIds(data.characters || []);

        // Load script lines
        if (data.script && data.script.lines) {
          state.scriptLines = data.script.lines;
        } else {
          state.scriptLines = [];
        }

        // Load minigames
        if (data.minigames && Array.isArray(data.minigames)) {
          state.minigames = data.minigames;
          await loadMinigameAudio();
        } else {
          state.minigames = [];
        }

        // Load truth bullets
        if (data.truthBullets && Array.isArray(data.truthBullets)) {
          state.truthBullets = data.truthBullets;
          await loadTruthBulletImages();
        } else {
          state.truthBullets = [];
        }
      } catch (error) {
        console.error('Failed to parse trial.json:', error);
        // Warn the user before presenting an empty editor — continuing to
        // edit and auto-save would overwrite the (possibly recoverable) file.
        await alertDialog({
          title: 'Could not read trial.json',
          type: 'warning',
          message:
            'trial.json in this folder could not be read (' +
            error.message +
            ').\n\n' +
            'The editor will open empty. If this trial matters to you, back up ' +
            'the folder before making changes, since saving will overwrite trial.json.',
        });
        // Initialize with empty trial if corrupted
        state.trialName = '';
        document.getElementById('trialNameInput').value = '';
        state.cast = Array(BLOCK_COUNT).fill(null);
        state.scriptLines = [];
        state.minigames = [];
        state.truthBullets = [];
      }
    } else {
      state.trialName = '';
      document.getElementById('trialNameInput').value = '';
      state.cast = Array(BLOCK_COUNT).fill(null);
      state.scriptLines = [];
      state.minigames = [];
      state.truthBullets = [];
      await state.dirHandle.getDirectoryHandle('Characters', { create: true });
    }

    showLoader(false);
    renderActiveView();

    // Enable export button now that we have a directory
    updateExportButtonState();
  } catch (err) {
    showLoader(false);
    // AbortError means the user cancelled the directory picker — not an error.
    if (err && err.name === 'AbortError') return;
    console.error('Failed to open trial folder:', err);
    await alertDialog({
      title: 'Could not open folder',
      type: 'error',
      message: `Failed to open trial folder: ${err.message}`,
    });
  }
}

// Lazy load remaining sprites for a character (performance optimization)
export async function loadRemainingSprites(charIndex) {
  const char = state.cast[charIndex];
  if (!char || !char._folderHandle) return;

  // Check if sprites already loaded
  if (char.sprites && char.sprites.length === appSettings.maxSprites) {
    return; // Already loaded
  }

  // Initialize sprites array if needed
  if (!char.sprites) {
    char.sprites = [];
  }

  const spriteCount = appSettings.maxSprites;
  for (let j = 1; j <= spriteCount; j++) {
    // Skip if already loaded
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

export async function loadCharactersFromIds(characterIds) {
  state.cast = Array(BLOCK_COUNT).fill(null);

  let charsDir = await state.dirHandle
    .getDirectoryHandle('Characters', { create: false })
    .catch(() => null);
  if (!charsDir) return;

  // Scan the Characters directory once, building an id -> data index.
  // (The previous version re-walked every folder for every cast slot.)
  const charactersById = new Map();
  for await (const [, folderHandle] of charsDir.entries()) {
    if (folderHandle.kind !== 'directory') continue;
    try {
      const charFile = await folderHandle.getFileHandle('character.json');
      const charData = JSON.parse(await (await charFile.getFile()).text());
      if (charData && charData.id) {
        // Store folder handle for lazy loading the remaining sprites later.
        charData._folderHandle = folderHandle;
        charactersById.set(charData.id, charData);
      }
    } catch {
      continue; // not a character folder, or unreadable - skip it
    }
  }

  for (let i = 0; i < characterIds.length; i++) {
    const charData = characterIds[i] ? charactersById.get(characterIds[i]) : null;
    if (!charData) continue;

    // Load only the first sprite for the cast grid (performance optimization);
    // the rest load lazily when the character modal opens.
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

    for (let mg of state.minigames) {
      try {
        const gameAudioDir = await minigamesDir.getDirectoryHandle(mg.gameId, { create: false });

        // Load Nonstop Debate dialogue audio
        if (mg.gameType === 'nonstop_debate' && mg.typeSpecific && mg.typeSpecific.dialogueLines) {
          for (let line of mg.typeSpecific.dialogueLines) {
            if (line.voiceLineFile) {
              try {
                const fileHandle = await gameAudioDir.getFileHandle(line.voiceLineFile);
                const file = await fileHandle.getFile();
                line.voiceLineBlob = file;
              } catch (error) {
                console.warn(`Failed to load audio for dialogue line ${line.lineId}:`, error);
              }
            }
          }
        }

        // Load Debate Scrum argument audio
        if (mg.gameType === 'debate_scrum' && mg.typeSpecific && mg.typeSpecific.arguments) {
          for (let arg of mg.typeSpecific.arguments) {
            if (arg.oppositionAudioFile) {
              try {
                const fileHandle = await gameAudioDir.getFileHandle(arg.oppositionAudioFile);
                const file = await fileHandle.getFile();
                arg.oppositionAudioBlob = file;
              } catch (error) {
                console.warn(
                  `Failed to load opposition audio for argument ${arg.argumentId}:`,
                  error
                );
              }
            }
            if (arg.defenseAudioFile) {
              try {
                const fileHandle = await gameAudioDir.getFileHandle(arg.defenseAudioFile);
                const file = await fileHandle.getFile();
                arg.defenseAudioBlob = file;
              } catch (error) {
                console.warn(`Failed to load defense audio for argument ${arg.argumentId}:`, error);
              }
            }
          }
        }

        // Load Mass Panic Debate speaker audio (line groups structure)
        if (mg.gameType === 'mass_panic_debate' && mg.typeSpecific && mg.typeSpecific.lineGroups) {
          for (let group of mg.typeSpecific.lineGroups) {
            // Each group has speaker1, speaker2, speaker3 lines
            for (let speakerKey of ['speaker1', 'speaker2', 'speaker3']) {
              const line = group[speakerKey];
              if (line && line.voiceLineFile) {
                try {
                  const fileHandle = await gameAudioDir.getFileHandle(line.voiceLineFile);
                  const file = await fileHandle.getFile();
                  line.voiceLineBlob = file;
                } catch (error) {
                  console.warn(
                    `Failed to load audio for panic line ${group.groupId}-${speakerKey}:`,
                    error
                  );
                }
              }
            }
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

let autoSaveTimer = null;
let autoSaveFailureNotified = false;

// Debounced auto-save for keystroke-frequency callers (dialogue inputs,
// trial name). Writing trial.json on every keypress hammers the disk and
// can interleave writes; one trailing save after the user pauses is enough.
export function scheduleAutoSave(delayMs = 600) {
  if (state.dirHandle) setSaveStatus('saving');
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(autoSaveTrial, delayMs);
}

export async function autoSaveTrial() {
  if (!state.dirHandle) return;
  setSaveStatus('saving');
  try {
    await writeTrialJson();
    autoSaveFailureNotified = false;
    setSaveStatus('saved');
  } catch (err) {
    // Surface the first failure loudly (revoked permission, disk full, ...)
    // but don't re-alert on every subsequent keystroke until a save succeeds.
    console.error('Auto-save failed:', err);
    setSaveStatus('error');
    if (!autoSaveFailureNotified) {
      autoSaveFailureNotified = true;
      await alertDialog({
        title: 'Auto-save failed',
        type: 'error',
        message:
          `Auto-save failed: ${err.message}\n\n` +
          'Your latest changes are NOT saved. Check folder permissions and ' +
          'free disk space, then make another edit to retry.',
      });
    }
  }
}

async function writeTrialJson() {
  // Create minimal ID-only references
  let characterIds = state.cast.map((c) => (c ? c.id : null));

  const RUNTIME_FIELDS = new Set(['voiceLineBlob', 'oppositionAudioBlob', 'defenseAudioBlob']);
  let minigamesForSave = JSON.parse(
    JSON.stringify(state.minigames, (k, v) => (RUNTIME_FIELDS.has(k) ? undefined : v))
  );

  let trialJs = {
    trialName: state.trialName,
    characters: characterIds, // Just an array of IDs or nulls
    truthBullets: state.truthBullets.map((b) => ({
      // Exclude imageDataURL
      bulletId: b.bulletId,
      name: b.name,
      description: b.description,
      imageFile: b.imageFile,
      inversedLieBulletName: b.inversedLieBulletName,
    })),
    minigames: minigamesForSave,
    script: {
      lines: state.scriptLines,
      lastModified: new Date().toISOString(),
    },
    metadata: {
      version: '4.0',
      lastModified: new Date().toISOString(),
      studentCount: blockTypes.filter((t) => !t).length,
      headmasterCount: blockTypes.filter((t) => t).length,
      totalCharacters: characterIds.filter((id) => id !== null).length,
      scriptLineCount: state.scriptLines.length,
      minigameCount: state.minigames.length,
      truthBulletCount: state.truthBullets.length,
    },
  };

  let fHandle = await state.dirHandle.getFileHandle('trial.json', { create: true });
  let wr = await fHandle.createWritable();
  await wr.write(JSON.stringify(trialJs, null, 2));
  await wr.close();
}
