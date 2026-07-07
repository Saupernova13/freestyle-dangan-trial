// Export module - handles packaging trial files into .drtrial format
import JSZip from 'jszip';
import { state } from './core/state.js';
import { FORMAT_VERSION, MINIGAME_TYPE_LABELS } from './core/constants.js';
import { validateTrialData } from './core/trialSchema.js';
import { buildTrialJson } from './core/trialSerialize.js';
import { isCharacterComplete, missingCharacterFields } from './models/characterModel.js';
import { alertDialog, confirmDialog, showToast } from './ui/dialogs.js';
import { normalizeHighlights, showLoader } from './utils.js';

// Does a minigame instance have any authored content for its type?
function minigameIsEmpty(mg) {
  const ts = mg.typeSpecific || {};
  switch (mg.gameType) {
    case 'nonstop_debate':
      return !ts.dialogueLines || ts.dialogueLines.length === 0;
    case 'mass_panic_debate':
      return !ts.lineGroups || ts.lineGroups.length === 0;
    case 'debate_scrum':
      return !ts.arguments || ts.arguments.length === 0;
    case 'logic_dive':
      return !ts.questions || ts.questions.length === 0;
    case 'hangmans_gambit':
      return !ts.answerKey || String(ts.answerKey).trim() === '';
    default:
      return false;
  }
}

// Scan the in-memory trial for problems that would make the exported file
// broken or unplayable. Returns an array of human-readable issue strings.
export function validateTrialForExport() {
  const issues = [];
  const minigameIds = new Set(state.minigames.map((mg) => mg.gameId));

  if (state.scriptLines.length === 0) {
    issues.push('The trial has no script lines.');
  }

  state.scriptLines.forEach((line, i) => {
    const n = i + 1;
    if (line.type === 'speaking') {
      if (!line.characterId) issues.push(`Line ${n}: speaking line has no character selected.`);
      if (!line.dialogue || !line.dialogue.trim()) issues.push(`Line ${n}: dialogue is empty.`);
    } else if (line.type === 'narrator') {
      if (!line.text || !line.text.trim()) issues.push(`Line ${n}: narration text is empty.`);
    } else if (line.type === 'minigame') {
      if (!line.minigameId) issues.push(`Line ${n}: minigame trigger has no minigame selected.`);
      else if (!minigameIds.has(line.minigameId))
        issues.push(`Line ${n}: references a minigame that no longer exists.`);
    }
  });

  state.cast.forEach((c) => {
    if (c && !isCharacterComplete(c)) {
      const missing = missingCharacterFields(
        c,
        Array.isArray(c.sprites) && c.sprites.some(Boolean)
      );
      const name = `${c.name || ''} ${c.surname || ''}`.trim() || 'Unnamed character';
      issues.push(`Character "${name}" is a draft (missing: ${missing.join(', ')}).`);
    }
  });

  state.minigames.forEach((mg) => {
    const label = MINIGAME_TYPE_LABELS[mg.gameType] || mg.gameType;
    const name = mg.name && mg.name.trim() ? mg.name : `Unnamed ${label}`;
    if (!mg.name || !mg.name.trim()) issues.push(`Minigame "${label}" has no question/name.`);
    if (minigameIsEmpty(mg)) issues.push(`Minigame "${name}" has no content configured.`);
  });

  state.truthBullets.forEach((b, i) => {
    if (!b.name || !b.name.trim()) issues.push(`Truth bullet ${i + 1} has no name.`);
  });

  return issues;
}

/**
 * Final data gate before packaging: normalize every script line's highlight
 * ranges against that line's text. Older trial.json files (or hand edits)
 * may carry overlapping or stale ranges; this guarantees the shipped file
 * only ever contains sorted, disjoint, in-bounds highlights.
 * Returns the original content untouched if it isn't parseable JSON.
 */
export function sanitizeTrialJson(content) {
  try {
    const trial = JSON.parse(content);
    const lines = trial?.script?.lines;
    if (Array.isArray(lines)) {
      for (const line of lines) {
        if (line && Array.isArray(line.highlights)) {
          const text = line.dialogue || line.text || '';
          line.highlights = normalizeHighlights(line.highlights, text.length);
        }
      }
    }
    return JSON.stringify(trial, null, 2);
  } catch (e) {
    console.warn('sanitizeTrialJson: could not parse trial.json, exporting as-is', e);
    return content;
  }
}

/**
 * Export the current trial to a playable .drtrial file (ZIP format)
 */
export async function exportToPlayableFile() {
  if (!state.dirHandle) {
    showToast('Choose a trial folder first.', { type: 'warning' });
    return;
  }

  if (!state.trialName || state.trialName.trim() === '') {
    showToast('Enter a trial name before exporting.', { type: 'warning' });
    return;
  }

  // Pre-flight check: warn about anything that would make the trial broken or
  // unplayable, and let the author decide whether to export anyway. Content
  // problems come from validateTrialForExport; contract violations against
  // schema/trial.schema.json come from validateTrialData on the exact object
  // a save would write.
  const issues = validateTrialData(buildTrialJson(state)).concat(validateTrialForExport());
  if (issues.length > 0) {
    const shown = issues.slice(0, 8);
    const extra = issues.length - shown.length;
    const list =
      shown.map((m) => `• ${m}`).join('\n') + (extra > 0 ? `\n• …and ${extra} more` : '');
    const proceed = await confirmDialog({
      title: `Export check — ${issues.length} issue${issues.length === 1 ? '' : 's'}`,
      message: `${list}\n\nExport anyway?`,
      confirmLabel: 'Export anyway',
      cancelLabel: 'Go back',
    });
    if (!proceed) return;
  }

  try {
    showLoader(true, 'Packaging trial…');

    // Create ZIP instance
    const zip = new JSZip();

    // Track progress
    let filesAdded = 0;
    let totalFiles = 0;

    // Count total files first
    totalFiles = await countFilesInDirectory(state.dirHandle);
    console.log(`Preparing to package ${totalFiles} files...`);

    // Add trial.json
    try {
      const trialJsonHandle = await state.dirHandle.getFileHandle('trial.json');
      const trialJsonFile = await trialJsonHandle.getFile();
      const trialJsonContent = await trialJsonFile.text();
      zip.file('trial.json', sanitizeTrialJson(trialJsonContent));
      filesAdded++;
      console.log(`Added trial.json (${filesAdded}/${totalFiles})`);
    } catch {
      console.warn('trial.json not found, creating minimal version');
      // Create minimal trial.json if it doesn't exist
      const minimalTrial = {
        trialName: state.trialName,
        characters: state.cast.map((c) => (c ? c.id : null)),
        truthBullets: state.truthBullets || [],
        minigames: state.minigames || [],
        script: { lines: state.scriptLines || [] },
        metadata: {
          version: FORMAT_VERSION,
          lastModified: new Date().toISOString(),
          scriptLineCount: (state.scriptLines || []).length,
          minigameCount: (state.minigames || []).length,
          truthBulletCount: (state.truthBullets || []).length,
        },
      };
      zip.file('trial.json', JSON.stringify(minimalTrial, null, 2));
      filesAdded++;
    }

    // Add all other files and directories
    await addDirectoryToZip(zip, state.dirHandle, '', (current) => {
      filesAdded = current;
      showLoader(true, `Packaging… ${current}/${totalFiles} files`);
    });

    // Generate ZIP file
    const blob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6, // Balanced compression (1-9, 9=max)
        },
      },
      (metadata) => {
        // Progress callback
        if (metadata.percent) {
          showLoader(true, `Compressing… ${Math.round(metadata.percent)}%`);
        }
      }
    );

    // Create filename and trigger download
    const sanitizedTrialName = state.trialName.replace(/[^a-z0-9_-]/gi, '_');
    const filename = `${sanitizedTrialName}.drtrial`;

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showLoader(false);

    // Show success message
    const fileSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
    showToast(`Exported ${filename} (${fileSizeMB} MB, ${filesAdded} files)`, {
      type: 'success',
      duration: 5000,
    });
  } catch (error) {
    console.error('Export failed:', error);
    showLoader(false);
    await alertDialog({ title: 'Export failed', type: 'error', message: error.message });
  }
}

/**
 * Recursively add directory contents to ZIP archive
 * @param {JSZip} zip - The JSZip instance
 * @param {FileSystemDirectoryHandle} dir - Directory handle to process
 * @param {string} zipPath - Path within the ZIP file
 * @param {Function} progressCallback - Optional callback for progress updates
 * @param {Object} progress - Mutable counter used across recursive calls
 */
export async function addDirectoryToZip(
  zip,
  dir,
  zipPath,
  progressCallback,
  progress = { count: 1, total: 0 }
) {
  // Skip trial.json as it's already added
  if (zipPath === 'trial.json') {
    return;
  }

  for await (const entry of dir.values()) {
    const entryPath = zipPath ? `${zipPath}/${entry.name}` : entry.name;

    // Skip trial.json at root level (already added)
    if (entryPath === 'trial.json') {
      continue;
    }

    if (entry.kind === 'file') {
      // Add file to ZIP
      try {
        const fileHandle = await dir.getFileHandle(entry.name);
        const file = await fileHandle.getFile();
        const fileData = await file.arrayBuffer();
        zip.file(entryPath, fileData);

        progress.count++;
        if (progressCallback) {
          progressCallback(progress.count, progress.total);
        }
      } catch (error) {
        console.warn(`Failed to add file ${entryPath}:`, error);
      }
    } else if (entry.kind === 'directory') {
      // Recursively add directory
      const subDirHandle = await dir.getDirectoryHandle(entry.name);
      await addDirectoryToZip(zip, subDirHandle, entryPath, progressCallback, progress);
    }
  }
}

/**
 * Count total files in directory (for progress tracking)
 * @param {FileSystemDirectoryHandle} dir - Directory to count
 * @returns {Promise<number>} Total number of files
 */
export async function countFilesInDirectory(dir) {
  let count = 0;

  for await (const entry of dir.values()) {
    if (entry.kind === 'file') {
      count++;
    } else if (entry.kind === 'directory') {
      const subDirHandle = await dir.getDirectoryHandle(entry.name);
      count += await countFilesInDirectory(subDirHandle);
    }
  }

  return count;
}

/**
 * Enable/disable export button based on trial state
 */
export function updateExportButtonState() {
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    // Enable if we have a directory handle and a trial name
    exportBtn.disabled = !state.dirHandle || !state.trialName || state.trialName.trim() === '';
  }
}
