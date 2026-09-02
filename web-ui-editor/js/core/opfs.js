// Origin Private File System (OPFS) backend, for browsers without
// showDirectoryPicker. OPFS exposes the same FileSystemDirectoryHandle
// interface, so passing an OPFS subdirectory as state.dirHandle leaves the
// read/write code unchanged. One subfolder per trial under trials/.
//
// OPFS is invisible to the OS file manager: trials move in and out only via
// Import / Export .drtrial.

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

// Suffixes `preferred` (_2, _3, ...) until no subdirectory of `parent` has
// that name. Any directory keyed on a display name needs this: two entities
// can share a name, and the second one taking the first one's folder silently
// overwrites its contents.
export async function uniqueDirectoryName(parent, preferred) {
  const existing = [];
  for await (const [name, handle] of parent.entries()) {
    if (handle.kind === 'directory') existing.push(name);
  }
  if (!existing.includes(preferred)) return preferred;
  let i = 2;
  while (existing.includes(`${preferred}_${i}`)) i++;
  return `${preferred}_${i}`;
}

export async function createOpfsTrial(name) {
  const root = await opfsTrialsRoot();
  const folder = await uniqueDirectoryName(root, slugify(name));
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

// Why a write probe failed. 'unsupported' is a capability gap and cannot
// change within a session; 'quota' and 'error' can, and the user is usually
// the one who can change them.
export const OPFS_UNSUPPORTED = 'unsupported';
export const OPFS_QUOTA = 'quota';
export const OPFS_ERROR = 'error';

// Only a genuine capability gap, or a success, is remembered. Caching a
// rejection cost the user the whole session: a QuotaExceededError on the probe
// is likely in an app that stores sprite PNGs and audio in OPFS, and "New
// trial" and "Import" stayed blocked even after they deleted a trial to free
// space.
let writeProbe = null;

// { ok, reason, error }. reason is meaningless when ok.
export async function checkOpfsWritable() {
  if (writeProbe) return writeProbe;

  const result = await (async () => {
    if (!supportsOpfs()) return { ok: false, reason: OPFS_UNSUPPORTED };
    let root;
    try {
      root = await navigator.storage.getDirectory();
      const probeDir = await root.getDirectoryHandle('.write-probe', { create: true });
      const fh = await probeDir.getFileHandle('probe', { create: true });
      if (typeof fh.createWritable !== 'function') {
        await root.removeEntry('.write-probe', { recursive: true });
        return { ok: false, reason: OPFS_UNSUPPORTED };
      }
      const w = await fh.createWritable();
      await w.write('ok');
      await w.close();
      await root.removeEntry('.write-probe', { recursive: true });
      return { ok: true, reason: '' };
    } catch (error) {
      // The probe writes a real file, so this is where a full disk shows up.
      // Reporting it as an unsupported browser told the user to update an
      // already-current one and never mentioned the thing they could fix.
      const reason = error && error.name === 'QuotaExceededError' ? OPFS_QUOTA : OPFS_ERROR;
      try {
        if (root) await root.removeEntry('.write-probe', { recursive: true });
      } catch {
        /* the probe folder is disposable */
      }
      return { ok: false, reason, error };
    }
  })();

  if (result.ok || result.reason === OPFS_UNSUPPORTED) writeProbe = Promise.resolve(result);
  return result;
}

// Kept for callers that only need the verdict.
export async function opfsCanWrite() {
  return (await checkOpfsWritable()).ok;
}
