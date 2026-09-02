// Deleting a file, with the outcome the caller needs to tell the truth about.
//
// Every delete in the editor used to be `try { removeEntry } catch { warn }`,
// and every caller then nulled the reference and carried on - one of them
// finishing with a green "success" toast. The reference went, the file stayed,
// and since addDirectoryToZip walks the real directory tree, the orphan
// shipped in every .drtrial from then on. The save pill read "All changes
// saved" over a trial.json that no longer matched the folder.
import { showToast } from '../ui/dialogs.js';

// A file that is already gone is not a failure: the caller wanted it absent
// and it is. Anything else is a real failure the caller must not paper over.
export async function removeEntry(dirHandle, name, opts = {}) {
  if (!dirHandle || !name) return { failed: false };
  try {
    await dirHandle.removeEntry(name, opts);
    return { failed: false };
  } catch (err) {
    if (err && (err.name === 'NotFoundError' || err.name === 'NotFound')) {
      return { failed: false };
    }
    console.warn(`Could not remove ${name}:`, err);
    return { failed: true, error: err };
  }
}

// Names the file that is still there. A delete that half-worked is worth one
// line of the author's attention, not a silent console.warn they will never
// see and an export that quietly grows.
export function reportFailedRemoval(name, result) {
  if (!result || !result.failed) return false;
  showToast(`Could not delete ${name}; it is still in the trial folder.`, { type: 'error' });
  return true;
}
