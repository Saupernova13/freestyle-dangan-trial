// Origin Private File System (OPFS) backend.
//
// Firefox and Safari ship no showDirectoryPicker but do ship OPFS, which
// exposes the same FileSystemDirectoryHandle interface — so handing the app
// an OPFS subdirectory as state.dirHandle makes all the read/write code work
// unchanged. The trade-off is that OPFS is invisible to the OS file manager,
// so trials only move in and out via Import / Export .drtrial. One subfolder
// per trial under trials/.

const TRIALS_DIR = 'trials';

export function supportsFsPicker() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export function supportsOpfs() {
  return !!(navigator.storage && typeof navigator.storage.getDirectory === 'function');
}

async function opfsTrialsRoot() {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(TRIALS_DIR, { create: true });
}

function slugify(name) {
  return (name || 'trial').replace(/[^a-zA-Z0-9_\- ]/g, '_').trim() || 'trial';
}

// Folder slugs, not display names.
export async function listOpfsTrialFolders() {
  if (!supportsOpfs()) return [];
  const root = await opfsTrialsRoot();
  const names = [];
  for await (const [name, handle] of root.entries()) {
    if (handle.kind === 'directory') names.push(name);
  }
  names.sort((a, b) => a.localeCompare(b));
  return names;
}

export async function getOpfsTrial(folder, { create = false } = {}) {
  const root = await opfsTrialsRoot();
  return root.getDirectoryHandle(folder, { create });
}

// Suffixes the slug (_2, _3, ...) until it is unique.
export async function createOpfsTrial(name) {
  const root = await opfsTrialsRoot();
  const existing = await listOpfsTrialFolders();
  let folder = slugify(name);
  if (existing.includes(folder)) {
    let i = 2;
    while (existing.includes(`${folder}_${i}`)) i++;
    folder = `${folder}_${i}`;
  }
  return root.getDirectoryHandle(folder, { create: true });
}

export async function deleteOpfsTrial(folder) {
  const root = await opfsTrialsRoot();
  await root.removeEntry(folder, { recursive: true });
}

// Null if absent or unreadable.
export async function readOpfsFileText(folder, fileName) {
  try {
    const dir = await getOpfsTrial(folder, { create: false });
    const file = await (await dir.getFileHandle(fileName)).getFile();
    return await file.text();
  } catch {
    return null;
  }
}

// Does this browser's OPFS support createWritable()? Cached: it can't change
// within a session.
let writeProbe = null;
export function opfsCanWrite() {
  if (writeProbe) return writeProbe;
  writeProbe = (async () => {
    if (!supportsOpfs()) return false;
    try {
      const root = await navigator.storage.getDirectory();
      const probeDir = await root.getDirectoryHandle('.write-probe', { create: true });
      const fh = await probeDir.getFileHandle('probe', { create: true });
      if (typeof fh.createWritable !== 'function') {
        await root.removeEntry('.write-probe', { recursive: true });
        return false;
      }
      const w = await fh.createWritable();
      await w.write('ok');
      await w.close();
      await root.removeEntry('.write-probe', { recursive: true });
      return true;
    } catch {
      return false;
    }
  })();
  return writeProbe;
}
