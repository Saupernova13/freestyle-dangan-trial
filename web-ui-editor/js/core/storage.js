// File I/O and trial persistence.
//
// A trial lives in state.dirHandle: an on-disk folder from showDirectoryPicker
// or an OPFS subfolder (core/opfs.js). Both share an interface, so everything
// below works on either.
import JSZip from 'jszip';
import { BLOCK_COUNT } from './constants.js';
import { recordChange, resetHistory } from './history.js';
import { state } from './state.js';
import { checkFormatVersion, findUnsafeIds, validateTrialData } from './trialSchema.js';
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

function resetEmptyTrial() {
  state.trialName = '';
  document.getElementById('trialNameInput').value = '';
  state.cast = Array(BLOCK_COUNT).fill(null);
  state.scriptLines = [];
  state.minigames = [];
  state.truthBullets = [];
}

// Assumes state.dirHandle is set.
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

    // Warn but never block: the author needs the editor to fix a broken trial.
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
    // A gate, not a warning. Ids reach inline event handlers, so rendering a
    // trial with a malformed one executes whatever it contains - refusing to
    // open is the only safe answer, and the author can repair trial.json in a
    // text editor.
    const unsafeIds = findUnsafeIds(data);
    if (unsafeIds.length > 0) {
      resetEmptyTrial();
      state.dirHandle = null;
      await alertDialog({
        title: 'Trial refused',
        type: 'error',
        message: describeUnsafeIds(unsafeIds),
      });
      return;
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
    // Warn first: auto-saving over an empty editor would destroy the file.
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

export async function openTrialFromHandle(dirHandle) {
  // Same hole as openTrialHub: replacing the handle abandons whatever the
  // debounce is still holding for the trial being left.
  await flushAutoSave();
  try {
    showLoader(true, 'Loading trial…');
    state.dirHandle = dirHandle;
    await loadTrialIntoState();
    // Undo history never crosses from one trial into another.
    resetHistory();
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
    // AbortError = the user cancelled the picker.
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

// Flushes first. "Already auto-saved" was false for the whole 600 ms debounce
// window: clearing state.dirHandle turned the pending timer into a no-op, so
// the last edit was silently dropped while the trial bar still read "Saving...".
export async function openTrialHub() {
  await flushAutoSave();
  state.dirHandle = null;
  renderDirDisplay(null);
  updateExportButtonState();
  renderActiveView();
}

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

// `folder` is the OPFS folder slug, not the display name.
export async function openOpfsTrialByName(folder) {
  try {
    const dir = await getOpfsTrial(folder, { create: false });
    await openTrialFromHandle(dir);
  } catch (err) {
    console.error('Failed to open trial:', err);
    await alertDialog({ title: 'Could not open trial', type: 'error', message: err.message });
  }
}

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
  await openTrialHub();
}

// Shown by both gates. findUnsafeIds has already quoted and clipped the
// offending values, and alertDialog renders text, so they cannot execute here.
function describeUnsafeIds(unsafeIds) {
  const shown = unsafeIds.slice(0, 8);
  const extra = unsafeIds.length - shown.length;
  return (
    'This trial contains ids that are not safe to display:\n\n' +
    shown.map((m) => '- ' + m).join('\n') +
    (extra > 0 ? '\n- ...and ' + extra + ' more' : '') +
    '\n\nIds may contain only letters, digits, underscores and hyphens. ' +
    'Only open trials from a source you trust.'
  );
}

// A .drtrial is a ZIP; it lands in a new browser-storage trial.
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

    // Checked before anything is written, so a hostile archive never reaches
    // the library at all - the open-time gate is the backstop for trials that
    // arrive some other way.
    if (trialJsonEntry) {
      let parsed = null;
      try {
        parsed = JSON.parse(await trialJsonEntry.async('string'));
      } catch {
        /* an unparseable trial.json is reported on open */
      }
      const unsafeIds = parsed ? findUnsafeIds(parsed) : [];
      if (unsafeIds.length > 0) {
        showLoader(false);
        await alertDialog({
          title: 'Import refused',
          type: 'error',
          message: describeUnsafeIds(unsafeIds),
        });
        return;
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

// Creates intermediate subdirectories for a nested zip path.
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

export async function loadCharactersFromIds(characterIds) {
  state.cast = Array(BLOCK_COUNT).fill(null);

  let charsDir = await state.dirHandle
    .getDirectoryHandle('Characters', { create: false })
    .catch(() => null);
  if (!charsDir) return;

  // One pass over Characters/, indexed by id, not a walk per cast slot.
  const charactersById = new Map();
  for await (const [, folderHandle] of charsDir.entries()) {
    if (folderHandle.kind !== 'directory') continue;
    try {
      const charFile = await folderHandle.getFileHandle('character.json');
      const charData = JSON.parse(await (await charFile.getFile()).text());
      if (charData && charData.id) {
        // Kept for lazy-loading the remaining sprites.
        charData._folderHandle = folderHandle;
        charactersById.set(charData.id, charData);
      }
    } catch {
      continue; // not a character folder, or unreadable
    }
  }

  for (let i = 0; i < characterIds.length; i++) {
    const charData = characterIds[i] ? charactersById.get(characterIds[i]) : null;
    if (!charData) continue;

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

        if (mg.gameType === 'mass_panic_debate' && mg.typeSpecific && mg.typeSpecific.lineGroups) {
          for (let group of mg.typeSpecific.lineGroups) {
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
// True from the moment an edit is scheduled until a write for it succeeds, so
// "nothing outstanding" is distinguishable from "a write never happened".
let hasUnsavedChanges = false;

// Debounced save for keystroke-frequency callers, and the undo choke point:
// every mutation reaches this or autoSaveTrial.
export function scheduleAutoSave(delayMs = 600) {
  hasUnsavedChanges = true;
  if (state.dirHandle) setSaveStatus('saving');
  recordChange(delayMs);
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => autoSaveTrial({ skipHistory: true }), delayMs);
}

// True while an edit is still inside the debounce window, or the last save
// failed. Either way there is work that is not on disk.
export function hasPendingWrites() {
  return autoSaveTimer !== null || hasUnsavedChanges;
}

// Writes whatever the debounce is still holding, so a caller about to change
// or drop state.dirHandle does not strand it.
export async function flushAutoSave() {
  if (autoSaveTimer === null) return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer = null;
  await autoSaveTrial({ skipHistory: true });
}

export async function autoSaveTrial(opts = {}) {
  if (!state.dirHandle) {
    // Not "nothing to do". A scheduled write whose folder has since gone is an
    // edit that will never reach disk, and this used to return as though the
    // save had been unnecessary.
    if (hasUnsavedChanges) {
      hasUnsavedChanges = false;
      console.error('Auto-save dropped: no trial folder is open.');
      setSaveStatus('error');
    }
    return;
  }
  if (!opts.skipHistory) recordChange(0);
  setSaveStatus('saving');
  try {
    await writeTrialJson();
    autoSaveFailureNotified = false;
    hasUnsavedChanges = false;
    setSaveStatus('saved');
  } catch (err) {
    // Alert once, not on every subsequent keystroke, until a save succeeds.
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

  // Warn only: blocking auto-save over a validation bug would lose work.
  const issues = validateTrialData(trialJs);
  if (issues.length > 0) {
    console.warn('trial.json being saved does not match the schema:', issues);
  }

  let fHandle = await state.dirHandle.getFileHandle('trial.json', { create: true });
  let wr = await fHandle.createWritable();
  await wr.write(JSON.stringify(trialJs, null, 2));
  await wr.close();
}
