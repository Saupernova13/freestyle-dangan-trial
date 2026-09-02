// Entry-path handling for imported .drtrial archives.
//
// Sharing .drtrial files is the format's whole purpose, so every entry name is
// attacker-controlled. DOM-free, so the tests can run it under node.

const TRIAL_JSON = 'trial.json';

// The folder an archive wraps its trial in, or '' when trial.json is at the
// root. A .drtrial from another tool can hold "MyTrial/trial.json"; written
// verbatim there is no root trial.json, so loadTrialIntoState resets to empty,
// the toast still says the import succeeded, and the next edit saves over it.
// Self-exported files round-trip fine, so this only bites hand-zipped and
// third-party archives - exactly the sharing case the format exists for.
export function zipRootPrefix(paths) {
  const candidates = (paths || []).filter((p) => p === TRIAL_JSON || p.endsWith('/' + TRIAL_JSON));
  if (candidates.length === 0) return '';
  // The shallowest wins; anything deeper is a nested copy, not the root.
  candidates.sort((a, b) => a.split('/').length - b.split('/').length);
  return candidates[0].slice(0, -TRIAL_JSON.length);
}

// The path components to write, or null when the entry must be refused. OPFS
// resolves ".." like any other path, so an unguarded segment escapes the trial
// folder entirely.
export function safeZipPathParts(path) {
  if (typeof path !== 'string' || path === '') return null;
  // A trailing separator names a directory, not a file. JSZip flags real
  // directory entries, but a malformed archive can carry one that is not
  // flagged - and without this it would be written as a file named after the
  // folder.
  if (path.endsWith('/')) return null;
  // ZIP names are specified to use "/" only, but the Windows API also treats
  // "\" as a separator, so allowing it reopens traversal through the back door.
  if (path.includes('\\')) return null;
  if (path.startsWith('/')) return null;
  // A drive letter or a "res://"-style scheme.
  if (path.includes(':')) return null;

  const parts = path.split('/').filter((p) => p !== '' && p !== '.');
  if (parts.some((p) => p === '..')) return null;
  return parts;
}
