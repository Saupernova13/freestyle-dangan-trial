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
  OPFS_ERROR,
  OPFS_QUOTA,
  checkOpfsWritable,
  createOpfsTrial,
  deleteOpfsTrial,
  getOpfsTrial,
  supportsFsPicker,
} from './opfs.js';
import { checkCharacterFormatVersion, validateCharacterData } from './characterSchema.js';
import { ensureAllTypeSpecific } from './minigameDefaults.js';
import { reindexOrder } from './listOps.js';
import { safeZipPathParts, zipRootPrefix } from './zipPaths.js';
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

  // Only the read and the parse. The try used to span sixty lines - the asset
  // loaders, two alertDialog awaits and DOM writes - and its catch reported
  // "trial.json could not be read" for every one of them, then reset the
  // editor to empty while leaving dirHandle set and pointing at a
  // fully-populated file. A NotAllowedError from the Characters/ scan, a
  // TypeError from a loader bug, a missing #trialNameInput: all of them
  // accused a trial.json that had parsed perfectly, one keystroke from an
  // autosave overwriting it.
  let data;
  try {
    const file = await state.dirHandle.getFileHandle('trial.json').then((fh) => fh.getFile());
    data = JSON.parse(await file.text());
  } catch (error) {
    await reportUnreadableTrialJson(error);
    resetEmptyTrial();
    return;
  }

  try {
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

    const characters = await loadCharactersFromIds(data.characters || []);
    const unresolvedCharacters = characters.unresolved;
    const characterProblems = characters.problems;
    if (characterProblems.length > 0) {
      // character.json had no schema and no validator at all until now, so
      // these went unreported however wrong they were.
      const shown = characterProblems.slice(0, 8);
      const extra = characterProblems.length - shown.length;
      await alertDialog({
        title: 'Some character files have problems',
        type: 'warning',
        message:
          shown.map((m) => '- ' + m).join('\n') +
          (extra > 0 ? '\n- ...and ' + extra + ' more' : '') +
          '\n\nThe editor will still open this trial; fix these before exporting.',
      });
    }
    if (characters.duplicated.length > 0) {
      await alertDialog({
        title: 'The cast lists a character more than once',
        type: 'warning',
        message:
          'These ids appear more than once in trial.json:\n\n' +
          [...new Set(characters.duplicated)].map((id) => '- ' + id).join('\n') +
          '\n\nA character can only sit at one bench, so the first slot keeps ' +
          'them and the others are now empty. Saving writes that back.',
      });
    }
    if (characters.overflow.length > 0) {
      await alertDialog({
        title: 'The cast is longer than the bench',
        type: 'warning',
        message:
          'trial.json lists ' +
          (data.characters || []).length +
          ' cast slots but there are only ' +
          BLOCK_COUNT +
          '. These were past the end and could never be seen or edited:\n\n' +
          characters.overflow.map((id) => '- ' + id).join('\n') +
          '\n\nThey have been dropped. Saving writes that back, so restore ' +
          'trial.json from a backup first if you need them.',
      });
    }
    if (unresolvedCharacters.length > 0) {
      // Silent until now: the slot simply appeared empty, and one keystroke
      // made it permanent.
      await alertDialog({
        title: 'Some characters could not be loaded',
        type: 'warning',
        message:
          'These cast members are listed in trial.json but their character.json ' +
          'could not be read:\n\n' +
          unresolvedCharacters.map((id) => '- ' + id).join('\n') +
          '\n\nTheir slots are kept so saving cannot drop them, but they will ' +
          'show as incomplete. Repair or restore the folders under Characters/ ' +
          'before editing those slots.',
      });
    }
    state.scriptLines = data.script && data.script.lines ? data.script.lines : [];
    // Numbered here, once, for the same reason the minigame lists are. The
    // engine plays lines in `order` only when every line has one, so a legacy
    // trial loaded and saved unchanged would otherwise keep a partial order
    // the engine has to ignore. The editor already renumbers on every
    // reorder; this covers what it loads.
    reindexOrder(state.scriptLines);

    if (Array.isArray(data.minigames)) {
      // Seeded once, here, rather than by whichever editor happened to render
      // first - and the ordered lists numbered, so the sort comparator is
      // total.
      state.minigames = ensureAllTypeSpecific(data.minigames);
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
    // trial.json parsed, so the trial is not empty and must not be reset.
    // Whatever failed here cost its own assets - character sprites, minigame
    // audio, bullet images - and the trial opens without them.
    console.error('Failed while loading trial assets:', error);
    await alertDialog({
      title: 'Some of this trial could not be loaded',
      type: 'warning',
      message:
        'trial.json was read successfully, but loading its assets failed (' +
        error.message +
        ').\n\n' +
        'The trial is open and your script is intact. Sprites, audio or bullet ' +
        'images may be missing until the cause is fixed.',
    });
  }
}

// A timestamped copy of the bytes that would not parse, written beside the
// original. resetEmptyTrial leaves dirHandle set, so the next keystroke
// autosaves an empty trial over the file - the warning said so, but a warning
// is not a backup. Returns the filename written, or null.
async function backUpUnreadableTrialJson() {
  try {
    const original = await (await state.dirHandle.getFileHandle('trial.json')).getFile();
    const bytes = await original.arrayBuffer();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = 'trial.json.corrupt-' + stamp;
    const handle = await state.dirHandle.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(bytes);
    await writable.close();
    return name;
  } catch (err) {
    // A read-only folder cannot take the backup - but it cannot take the
    // autosave either, so nothing is at risk in that case.
    console.warn('Could not back up the unreadable trial.json:', err);
    return null;
  }
}

async function reportUnreadableTrialJson(error) {
  console.error('Failed to parse trial.json:', error);
  const backup = await backUpUnreadableTrialJson();
  await alertDialog({
    title: 'Could not read trial.json',
    type: 'warning',
    message:
      'trial.json could not be read (' +
      error.message +
      ').\n\n' +
      (backup
        ? 'The original bytes were copied to ' +
          backup +
          ' so nothing is lost.\n\n'
        : 'The original could NOT be backed up, so back it up yourself before ' +
          'making changes.\n\n') +
      'The editor will open empty, and saving will overwrite trial.json.',
  });
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
  if (await reportUnwritableStorage()) return;
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

  // Resolved before the delete, and compared by identity: matching on
  // dirHandle.name alone false-positives against an on-disk folder that
  // happens to share the slug, and would then blank an open trial that was
  // never touched.
  const target = await getOpfsTrial(folder, { create: false }).catch(() => null);
  const isOpen = await sameDirectory(state.dirHandle, target, folder);

  let deleted = true;
  try {
    await deleteOpfsTrial(folder);
  } catch (err) {
    console.warn('Could not delete trial:', err);
    deleted = false;
  }

  if (isOpen) {
    state.dirHandle = null;
    resetEmptyTrial();
    // Undo reached back into the trial that is no longer open, and its next
    // autosave would have written that data somewhere new.
    resetHistory();
  }

  if (deleted) {
    showToast('Trial deleted', { type: 'success' });
  } else {
    // It is still there, and it reappears in the hub on the next visit.
    showToast(`Could not delete "${folder}". It is still in browser storage.`, { type: 'error' });
  }
  await openTrialHub();
}

// isSameEntry is the only exact answer; the name comparison is the fallback
// for a handle that does not implement it.
async function sameDirectory(a, b, fallbackName) {
  if (!a) return false;
  if (b && typeof a.isSameEntry === 'function') {
    try {
      return await a.isSameEntry(b);
    } catch (err) {
      console.warn('isSameEntry failed; falling back to the folder name:', err);
    }
  }
  return a.name === fallbackName;
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
  if (await reportUnwritableStorage()) return;
  // Named so the catch can remove a half-written import.
  let partialFolder = null;
  try {
    showLoader(true, 'Importing trial…');
    const zip = await JSZip.loadAsync(await file.arrayBuffer());

    const entries = Object.values(zip.files).filter((e) => !e.dir);
    const prefix = zipRootPrefix(entries.map((e) => e.name));
    const trialJsonEntry = zip.file(prefix + 'trial.json');

    // Refused rather than imported empty. Without a trial.json,
    // loadTrialIntoState resets to an empty trial, so the import would land in
    // the hub looking real, open with nothing in it, and be saved over by the
    // first edit - after a success toast.
    if (!trialJsonEntry) {
      showLoader(false);
      await alertDialog({
        title: 'Not a trial archive',
        type: 'error',
        message:
          'This file contains no trial.json, so there is no trial in it to ' +
          'import.\n\nExport a trial from the editor to get a .drtrial file.',
      });
      return;
    }

    // Parsed once: the display name and the id gate below both need it. An
    // unparseable trial.json is still imported - the editor is where the
    // author repairs one - and is reported when it opens.
    let parsed = null;
    try {
      parsed = JSON.parse(await trialJsonEntry.async('string'));
    } catch {
      /* reported on open */
    }

    // Prefer the name inside trial.json; fall back to the file name.
    let trialName = file.name.replace(/\.(drtrial|zip)$/i, '');
    if (parsed && parsed.trialName) trialName = parsed.trialName;

    // Checked before anything is written, so a hostile archive never reaches
    // the library at all - the open-time gate is the backstop for trials that
    // arrive some other way.
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

    // Every path resolved and vetted up front, for the same reason: refusing
    // after the first few files have landed would leave the partial folder
    // this function is otherwise trying to avoid.
    const planned = [];
    for (const entry of entries) {
      if (!entry.name.startsWith(prefix)) continue;
      const parts = safeZipPathParts(entry.name.slice(prefix.length));
      if (parts === null) {
        showLoader(false);
        await alertDialog({
          title: 'Import refused',
          type: 'error',
          message:
            'This archive contains a file path that is not safe to write:\n\n' +
            JSON.stringify(entry.name).slice(0, 120) +
            '\n\nOnly import trials from a source you trust.',
        });
        return;
      }
      if (parts.length > 0) planned.push({ entry, parts });
    }

    const dir = await createOpfsTrial(trialName);
    partialFolder = dir.name;
    for (const { entry, parts } of planned) {
      await writeFileToDir(dir, parts, await entry.async('blob'));
    }
    partialFolder = null;

    showLoader(false);
    await openOpfsTrialByName(dir.name);
    showToast(`Imported "${trialName}"`, { type: 'success' });
  } catch (err) {
    showLoader(false);
    // Quota exhaustion is the common failure here - importing is exactly when
    // storage fills - and the folder would otherwise sit in the hub looking
    // like a normal trial, open with half its assets missing, and be saved
    // over by the next edit.
    if (partialFolder) {
      try {
        await deleteOpfsTrial(partialFolder);
      } catch (e) {
        console.warn('Could not remove the partial import:', e);
      }
    }
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

// Creates intermediate subdirectories for a nested zip path. `parts` comes
// from safeZipPathParts, so it carries no "..", no separator and no empty
// component.
async function writeFileToDir(dir, parts, blob) {
  const dirParts = parts.slice(0, -1);
  const fileName = parts[parts.length - 1];
  let cur = dir;
  for (const p of dirParts) cur = await cur.getDirectoryHandle(p, { create: true });
  const fh = await cur.getFileHandle(fileName, { create: true });
  const w = await fh.createWritable();
  await w.write(blob);
  await w.close();
}

const OPFS_WRITE_MSG =
  "This browser can't write to private storage. Update to a current version of " +
  'Firefox, Safari, or a Chromium browser, or use a Chromium browser to edit a ' +
  'folder on disk.';

// The probe writes a real file, so a full disk failed it and the user was told
// to update an already-current browser - never the one thing they could act on.
async function reportUnwritableStorage() {
  const check = await checkOpfsWritable();
  if (check.ok) return false;

  if (check.reason === OPFS_QUOTA) {
    await alertDialog({
      title: 'Browser storage is full',
      type: 'error',
      message:
        'There is no room left in this browser’s private storage.\n\n' +
        'Delete a trial you no longer need, or free up disk space, then try ' +
        'again - no reload required.',
    });
    return true;
  }

  if (check.reason === OPFS_ERROR) {
    await alertDialog({
      title: 'Browser storage is not responding',
      type: 'error',
      message:
        'Private storage could not be written to' +
        (check.error && check.error.name ? ` (${check.error.name})` : '') +
        '.\n\nYour saved trials should be unaffected. Try again, and reload the ' +
        'page if it keeps happening.',
    });
    return true;
  }

  await alertDialog({
    title: 'Browser storage unavailable',
    type: 'error',
    message: OPFS_WRITE_MSG,
  });
  return true;
}

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
// Consecutive failed writes since the last success. The old flag alerted once
// and then never again until a save succeeded - so for a persistent cause,
// which is the common one, an author deep in a script had a single dialog an
// hour ago and a small pill since.
let autoSaveFailureCount = 0;
// Alert on the first failure, then every tenth. Often enough that "nothing
// has been written for the last hour" cannot go unnoticed; rare enough not to
// make the editor unusable while the author works out what is wrong.
const AUTO_SAVE_ALERT_EVERY = 10;
// True only while a reconnect's own retry is in flight. Without it a granted
// permission that still cannot write loops forever: the retry fails, the
// failure offers a reconnect, the reconnect retries.
let reconnectInProgress = false;
// True from the moment an edit is scheduled until a write for it succeeds, so
// "nothing outstanding" is distinguishable from "a write never happened".
let hasUnsavedChanges = false;

// Bumped only where a new edit enters: scheduleAutoSave, and a direct
// autoSaveTrial call. The debounce timer and flushAutoSave pass skipHistory
// because scheduleAutoSave already counted their edit, and bumping again for a
// write-only call would make an in-flight write refuse to report "saved" for
// work that had in fact reached disk.
//
// A write captures this alongside its snapshot, so completing cannot report
// "saved" for an edit made after that snapshot was taken.
let changeSeq = 0;

// Serializes writes to trial.json. Two overlapping
// FileSystemWritableFileStreams on one handle each buffer to their own swap
// file and the last close() wins, which is not necessarily the newest state -
// and Chromium holds an exclusive lock while a writable is open, so the second
// write can reject outright.
let writeChain = Promise.resolve();
// The link that has been queued but has not started. A later caller has
// nothing to add to it: the snapshot is taken when the write runs, not when it
// was queued, so it already carries whatever that caller wanted saved.
let pendingWrite = null;

// Debounced save for keystroke-frequency callers, and the undo choke point:
// every mutation reaches this or autoSaveTrial.
export function scheduleAutoSave(delayMs = 600) {
  hasUnsavedChanges = true;
  changeSeq++;
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
  // Every call has something to write, so every call is pending work until it
  // lands. Gating this on !skipHistory left undo's restore invisible: it saves
  // with skipHistory and no preceding scheduleAutoSave, so beforeunload stayed
  // silent while its write was in flight and after one failed.
  hasUnsavedChanges = true;

  // The sequence, though, only moves for a genuine edit. Bumping it for a
  // write-only call would make an in-flight write refuse to report "saved" for
  // work that had reached disk.
  if (!opts.skipHistory) {
    recordChange(0);
    changeSeq++;
  }
  setSaveStatus('saving');
  try {
    const writtenSeq = await enqueueTrialJsonWrite();
    autoSaveFailureCount = 0;
    // Only when nothing was edited after this write took its snapshot.
    // Otherwise the pill would read "All changes saved" over an edit that is
    // still only in memory, and the queued write behind us will report it.
    if (writtenSeq === changeSeq) {
      hasUnsavedChanges = false;
      setSaveStatus('saved');
    }
  } catch (err) {
    console.error('Auto-save failed:', err);
    setSaveStatus('error');
    await reportAutoSaveFailure(err);
  }
}

// Chrome drops a showDirectoryPicker grant on tab restore, browser restart and
// session resume, and every write then throws NotAllowedError forever. The old
// advice - "check folder permissions and free disk space, then make another
// edit to retry" - is wrong for exactly that case: every retry fails, and the
// author is never told the one thing that fixes it.
async function reportAutoSaveFailure(err) {
  autoSaveFailureCount++;
  // The reconnect flow reports its own outcome.
  if (reconnectInProgress) return;
  if (autoSaveFailureCount % AUTO_SAVE_ALERT_EVERY !== 1) return;

  if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
    const reconnect = await confirmDialog({
      title: 'The editor has lost write access to this folder',
      message:
        'Your latest changes are NOT saved, and every retry will fail until ' +
        'access is restored. This usually happens after a browser restart or ' +
        'a restored tab.',
      confirmLabel: 'Reconnect folder',
      cancelLabel: 'Not now',
    });
    if (reconnect) await reconnectDirHandle();
    return;
  }

  const isQuota = err && err.name === 'QuotaExceededError';
  await alertDialog({
    title: 'Auto-save failed',
    type: 'error',
    message:
      `Auto-save failed: ${err.message}\n\n` +
      'Your latest changes are NOT saved. ' +
      (isQuota
        ? 'The disk is full, or the browser storage quota is. Free some space, ' +
          'then make another edit to retry.'
        : 'Check folder permissions and free disk space, then make another ' +
          'edit to retry.'),
  });
}

// Re-asks for the grant on the handle the editor already holds, so the author
// keeps their folder rather than re-picking it. Called from the dialog's
// button, because requestPermission needs a user gesture.
async function reconnectDirHandle() {
  let granted = 'denied';
  try {
    if (state.dirHandle && typeof state.dirHandle.requestPermission === 'function') {
      granted = await state.dirHandle.requestPermission({ mode: 'readwrite' });
    }
  } catch (err) {
    console.warn('Could not re-request folder permission:', err);
  }

  if (granted !== 'granted') {
    await alertDialog({
      title: 'Still no access',
      type: 'error',
      message:
        'The editor still cannot write to this folder. Open the trial again ' +
        'from the hub to pick it, or export a copy to keep your work.',
    });
    return;
  }

  // Retry immediately: the author asked for this, and waiting for their next
  // keystroke would leave the pill reading "Save failed" over a folder that
  // now works.
  autoSaveFailureCount = 0;
  reconnectInProgress = true;
  try {
    await autoSaveTrial({ skipHistory: true });
  } finally {
    reconnectInProgress = false;
  }

  // A success clears the counter, so anything left means the retry failed too.
  if (autoSaveFailureCount > 0) {
    await alertDialog({
      title: 'Still could not save',
      type: 'error',
      message:
        'Access was restored, but the save still failed. Export a copy to keep ' +
        'your work, then open the trial again from the hub.',
    });
  }
}

// One writer at a time, in order. Callers await their own link, so completion
// order matches queue order and a stale write can no longer land last.
function enqueueTrialJsonWrite() {
  if (pendingWrite) return pendingWrite;
  const start = () => {
    // Cleared before the write begins, not after: a caller arriving mid-write
    // may have state newer than the snapshot just taken, so it needs its own
    // link rather than this one's result.
    pendingWrite = null;
    return writeTrialJson();
  };
  // Both arms, so one failed write does not wedge the chain forever.
  const run = writeChain.then(start, start);
  pendingWrite = run;
  writeChain = run.catch(() => {});
  return run;
}

// Returns the change sequence its snapshot was taken at.
async function writeTrialJson() {
  const seq = changeSeq;
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
  return seq;
}
