// Origin Private File System (OPFS) backend.
//
// Firefox and Safari deliberately don't implement showDirectoryPicker (the
// pick-a-folder-on-disk API), but they do implement OPFS via
// navigator.storage.getDirectory(). OPFS exposes the *same*
// FileSystemDirectoryHandle interface, so once the rest of the app is handed an
// OPFS subdirectory as state.dirHandle, all the existing read/write code works
// unchanged.
//
// The trade-off: OPFS is private to the browser/origin and invisible in the OS
// file manager, so trials live "inside the browser" and move in and out via
// Import / Export .drtrial. Each trial gets its own subfolder under trials/.

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

// Turn a trial name into a safe folder slug.
function slugify(name) {
  return (name || 'trial').replace(/[^a-zA-Z0-9_\- ]/g, '_').trim() || 'trial';
}

// Folder slugs of every trial currently stored in OPFS.
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

// Create a fresh trial folder, choosing a unique slug derived from `name`.
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

// Read a single file's text from an OPFS trial folder (used to show the real
// trial name in the hub list). Returns null if absent/unreadable.
export async function readOpfsFileText(folder, fileName) {
  try {
    const dir = await getOpfsTrial(folder, { create: false });
    const file = await (await dir.getFileHandle(fileName)).getFile();
    return await file.text();
  } catch {
    return null;
  }
}

// Probe whether OPFS file handles support createWritable() in this browser.
// Cached, because the answer can't change within a session.
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
