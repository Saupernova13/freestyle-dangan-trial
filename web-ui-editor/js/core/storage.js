// Storage layer - handles file I/O and trial data persistence.
//
// A trial lives in a directory handle (state.dirHandle). That handle can come
// from two backends with an identical interface:
//   - an on-disk folder picked via showDirectoryPicker (Chromium), or
//   - an OPFS subfolder (Firefox/Safari/Chromium) — see core/opfs.js.
// Everything below works the same against either.
import JSZip from 'jszip';
import { BLOCK_COUNT } from './constants.js';
import { state } from './state.js';
import { checkFormatVersion, validateTrialData } from './trialSchema.js';
import { buildTrialJson } from './trialSerialize.js';
import {
  createOpfsTrial,
  deleteOpfsTrial,
  getOpfsTrial,
  opfsCanWrite,
  supportsFsPicker,
} from './opfs.js';
import { updateExportButtonState } from '../export.js';
import { appSettings } from '../settings.js';
import { alertDialog, confirmDialog, promptDialog, showToast } from '../ui/dialogs.js';
import { setSaveStatus } from '../ui/saveStatus.js';
import { fileToDataUrl, renderDirDisplay, showLoader } from '../utils.js';
import { renderActiveView } from '../views/viewManager.js';

// Reset state to an empty trial (used for new/blank or unreadable folders).
function resetEmptyTrial() {
  state.trialName = '';
  document.getElementById('trialNameInput').value = '';
  state.cast = Array(BLOCK_COUNT).fill(null);
  state.scriptLines = [];
  state.minigames = [];
  state.truthBullets = [];
}

// Read the trial in state.dirHandle into state. Assumes state.dirHandle is set.
async function loadTrialIntoState() {
  const files = [];
  for await (const entry of state.dirHandle.values()) files.push(entry.name);

  if (!files.includes('trial.json')) {
    resetEmptyTrial();
    await state.dirHandle.getDirectoryHandle('Characters', { create: true });
    return;
  }

  try {
    const file = await state.dirHandle.getFileHandle('trial.json').then((fh) => fh.getFile());
    const data = JSON.parse(await file.text());

    // Contract checks (schema/trial.schema.json). Never block opening — the
    // author needs the editor to fix a broken trial — but say what's wrong
    // before an auto-save quietly rewrites the file.
    const versionCheck = checkFormatVersion(data);
    if (versionCheck.message) {
      await alertDialog({
        title: versionCheck.ok ? 'Trial format notice' : 'Trial from a newer editor',
        type: 'warning',
        message: versionCheck.ok
          ? versionCheck.message
          : versionCheck.message +
            '\n\nThe editor will still open it, but unknown data may be lost on save. ' +
            'Back the trial up first.',
      });
    }
    const schemaIssues = validateTrialData(data);
    if (schemaIssues.length > 0) {
      const shown = schemaIssues.slice(0, 8);
      const extra = schemaIssues.length - shown.length;
      await alertDialog({
        title: 'trial.json has problems',
        type: 'warning',
        message:
          shown.map((m) => '- ' + m).join('\n') +
          (extra > 0 ? '\n- ...and ' + extra + ' more' : '') +
          '\n\nThe editor will still open this trial; fix these before exporting.',
      });
    }

    state.trialName = data.trialName || '';
    document.getElementById('trialNameInput').value = state.trialName;

    await loadCharactersFromIds(data.characters || []);
    state.scriptLines = data.script && data.script.lines ? data.script.lines : [];

    if (Array.isArray(data.minigames)) {
      state.minigames = data.minigames;
      await loadMinigameAudio();
    } else {
      state.minigames = [];
    }

    if (Array.isArray(data.truthBullets)) {
      state.truthBullets = data.truthBullets;
      await loadTruthBulletImages();
    } else {
      state.truthBullets = [];
    }
  } catch (error) {
    console.error('Failed to parse trial.json:', error);
    // Warn before presenting an empty editor — continuing to edit and auto-save
    // would overwrite the (possibly recoverable) file.
    await alertDialog({
      title: 'Could not read trial.json',
      type: 'warning',
      message:
        'trial.json could not be read (' +
        error.message +
        ').\n\n' +
        'The editor will open empty. If this trial matters to you, back it up ' +
        'before making changes, since saving will overwrite trial.json.',
    });
    resetEmptyTrial();
  }
}

// Open a trial from any directory handle (on-disk or OPFS) into the editor.
export async function openTrialFromHandle(dirHandle) {
  try {
    showLoader(true, 'Loading trial…');
    state.dirHandle = dirHandle;
    await loadTrialIntoState();
    renderDirDisplay(state.dirHandle, state.trialName);
    showLoader(false);
    renderActiveView();
    updateExportButtonState();
  } catch (err) {
    showLoader(false);
    console.error('Failed to open trial:', err);
    await alertDialog({ title: 'Could not open trial', type: 'error', message: err.message });
  }
}

// Chromium path: pick a real folder on disk.
export async function chooseTrialDir() {
  if (!supportsFsPicker()) {
    await alertDialog({
      title: 'Not available',
      type: 'warning',
      message:
        'Opening a folder on disk needs a Chromium browser (Chrome, Edge, or Opera). ' +
        'In this browser, use browser storage or import a .drtrial instead.',
    });
    return;
  }
  let dH;
  try {
    dH = await window.showDirectoryPicker({ id: 'dr-trial-dir', mode: 'readwrite' });
  } catch (err) {
    // AbortError means the user cancelled the picker — not an error.
    if (err && err.name === 'AbortError') return;
    console.error('Failed to open trial folder:', err);
    await alertDialog({
      title: 'Could not open folder',
      type: 'error',
      message: `Failed to open trial folder: ${err.message}`,
    });
    return;
  }
  await openTrialFromHandle(dH);
}

// Return to the trial picker (welcome hub). Work is already auto-saved.
export function openTrialHub() {
  state.dirHandle = null;
  renderDirDisplay(null);
  updateExportButtonState();
  renderActiveView();
}

// Create a fresh trial in browser storage (OPFS).
export async function newOpfsTrial() {
  if (!(await opfsCanWrite())) {
    await alertDialog({
      title: 'Browser storage unavailable',
      type: 'error',
      message: OPFS_WRITE_MSG,
    });
    return;
  }
  const name = await promptDialog({
    title: 'New trial',
    label: 'Trial name',
    value: 'Untitled Trial',
    placeholder: 'e.g. The Library Murder',
    confirmLabel: 'Create',
  });
  if (!name) return;

  try {
    const dir = await createOpfsTrial(name);
    await openTrialFromHandle(dir);
    state.trialName = name;
    document.getElementById('trialNameInput').value = name;
    renderDirDisplay(state.dirHandle, name);
    await autoSaveTrial();
    updateExportButtonState();
  } catch (err) {
    console.error('Failed to create trial:', err);
    await alertDialog({ title: 'Could not create trial', type: 'error', message: err.message });
  }
}

// Open an existing browser-storage trial by its folder slug.
export async function openOpfsTrialByName(folder) {
  try {
    const dir = await getOpfsTrial(folder, { create: false });
    await openTrialFromHandle(dir);
  } catch (err) {
    console.error('Failed to open trial:', err);
    await alertDialog({ title: 'Could not open trial', type: 'error', message: err.message });
  }
}

// Delete a browser-storage trial, then refresh the hub.
export async function deleteOpfsTrialAndRefresh(folder) {
  const confirmed = await confirmDialog({
    title: 'Delete trial',
    message: `Delete "${folder}" from browser storage? This can't be undone.`,
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return;
  try {
    await deleteOpfsTrial(folder);
  } catch (err) {
    console.warn('Could not delete trial:', err);
  }
  if (state.dirHandle && state.dirHandle.name === folder) {
    state.dirHandle = null;
    resetEmptyTrial();
  }
  showToast('Trial deleted', { type: 'success' });
  openTrialHub();
}

// Import a .drtrial (a ZIP) into a new browser-storage trial and open it.
export async function importTrialFromFile(file) {
  if (!(await opfsCanWrite())) {
    await alertDialog({
      title: 'Browser storage unavailable',
      type: 'error',
      message: OPFS_WRITE_MSG,
    });
    return;
  }
  try {
    showLoader(true, 'Importing trial…');
    const zip = await JSZip.loadAsync(await file.arrayBuffer());

    // Prefer the name inside trial.json; fall back to the file name.
    let trialName = file.name.replace(/\.(drtrial|zip)$/i, '');
    const trialJsonEntry = zip.file('trial.json');
    if (trialJsonEntry) {
      try {
        const j = JSON.parse(await trialJsonEntry.async('string'));
        if (j.trialName) trialName = j.trialName;
      } catch {
        /* keep the filename-derived name */
      }
    }

    const dir = await createOpfsTrial(trialName);
    const entries = Object.values(zip.files).filter((e) => !e.dir);
    for (const entry of entries) {
      const blob = await entry.async('blob');
      await writeFileToDir(dir, entry.name, blob);
    }

    showLoader(false);
    await openOpfsTrialByName(dir.name);
    showToast(`Imported "${trialName}"`, { type: 'success' });
  } catch (err) {
    showLoader(false);
    console.error('Import failed:', err);
    await alertDialog({ title: 'Import failed', type: 'error', message: err.message });
  }
}

// Open a file picker for importing a .drtrial.
export function triggerImportTrial() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.drtrial,.zip,application/zip';
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (f) importTrialFromFile(f);
  };
  inp.click();
}

// Write a (possibly nested) zip path into a directory handle, creating subdirs.
async function writeFileToDir(dir, path, blob) {
  const parts = path.split('/').filter(Boolean);
  const fileName = parts.pop();
  let cur = dir;
  for (const p of parts) cur = await cur.getDirectoryHandle(p, { create: true });
  const fh = await cur.getFileHandle(fileName, { create: true });
  const w = await fh.createWritable();
  await w.write(blob);
  await w.close();
}

const OPFS_WRITE_MSG =
  "This browser can't write to private storage. Update to a current version of " +
  'Firefox, Safari, or a Chromium browser, or use a Chromium browser to edit a ' +
  'folder on disk.';

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
  const trialJs = buildTrialJson(state);

  // Contract self-check. Only warn — blocking an auto-save over a validation
  // bug would risk losing the author's work, which is worse than persisting
  // an imperfect file.
  const issues = validateTrialData(trialJs);
  if (issues.length > 0) {
    console.warn('trial.json being saved does not match the schema:', issues);
  }

  let fHandle = await state.dirHandle.getFileHandle('trial.json', { create: true });
  let wr = await fHandle.createWritable();
  await wr.write(JSON.stringify(trialJs, null, 2));
  await wr.close();
}
