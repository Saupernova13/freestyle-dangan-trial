// Packages a trial folder into a playable .drtrial (a ZIP).
import JSZip from 'jszip';
import { state } from './core/state.js';
import { MINIGAME_TYPE_LABELS } from './core/constants.js';
import { validateTrialData } from './core/trialSchema.js';
import { findIntegrityIssues } from './core/references.js';
import { buildTrialJson } from './core/trialSerialize.js';
import { isCharacterComplete, missingCharacterFields } from './models/characterModel.js';
import { alertDialog, confirmDialog, showToast } from './ui/dialogs.js';
import { normalizeHighlights, showLoader } from './utils.js';

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
      // rebuttal_showdown, psyche_taxi and closing_argument have no editor and
      // no authored payload yet, so there is nothing here to judge empty.
      // Reporting them as empty would flag every trial that uses one.
      return false;
  }
}

// Returns human-readable strings for anything that would make the export
// broken or unplayable.
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

  // Dangling minigameId is checked above; every other cross-entity reference
  // goes through one place, so a new invariant reaches this check for free.
  issues.push(...findIntegrityIssues(state));

  return issues;
}

/**
 * Last gate before packaging: older files and hand edits carry overlapping or
 * out-of-bounds highlight ranges, so renormalize against each line's text.
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

export async function exportToPlayableFile() {
  if (!state.dirHandle) {
    showToast('Choose a trial folder first.', { type: 'warning' });
    return;
  }

  if (!state.trialName || state.trialName.trim() === '') {
    showToast('Enter a trial name before exporting.', { type: 'warning' });
    return;
  }

  // Pre-flight only — the author can always export anyway. Schema violations
  // are checked against the exact object a save would write.
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

    const zip = new JSZip();

    let filesAdded = 0;
    let totalFiles = 0;

    totalFiles = await countFilesInDirectory(state.dirHandle);
    console.log(`Preparing to package ${totalFiles} files...`);

    // Built from state rather than read back from disk, so the object the
    // pre-flight validated and the bytes that ship are the same one. Reading
    // the file meant an export could pass its own check on content it did not
    // contain - and someone exporting to rescue work after a failed save got a
    // zip missing exactly that work, reported as a success.
    //
    // This also retires the "minimal version" fallback, which was a second,
    // divergent copy of buildTrialJson kept alive only for a missing file.
    zip.file('trial.json', sanitizeTrialJson(JSON.stringify(buildTrialJson(state), null, 2)));
    filesAdded++;
    console.log(`Added trial.json (${filesAdded}/${totalFiles})`);

    const packaging = { count: 1, total: totalFiles, failed: [] };
    await addDirectoryToZip(
      zip,
      state.dirHandle,
      '',
      (current) => {
        filesAdded = current;
        showLoader(true, `Packaging… ${current}/${totalFiles} files`);
      },
      packaging
    );

    // countFilesInDirectory already computed the true total; the two were
    // never compared, so a truncated export reported plain success. Reported
    // alongside any named failures rather than instead of them, since files
    // can be lost both ways in one run, and only when the shortfall exceeds
    // what has already been named.
    const unexplained = totalFiles - filesAdded - packaging.failed.length;
    if (unexplained > 0) {
      packaging.failed.push(`${unexplained} file(s) went missing between counting and packaging`);
    }
    if (packaging.failed.length > 0) {
      showLoader(false);
      const shown = packaging.failed.slice(0, 8);
      const extra = packaging.failed.length - shown.length;
      const proceed = await confirmDialog({
        title: `${packaging.failed.length} item${packaging.failed.length === 1 ? '' : 's'} could not be packaged`,
        message:
          shown.map((p) => `• ${p}`).join('\n') +
          (extra > 0 ? `\n• …and ${extra} more` : '') +
          '\n\nThe exported trial will be missing them, and the engine will fail to ' +
          'load whatever referenced them.\n\nDownload it anyway?',
        confirmLabel: 'Download anyway',
        cancelLabel: 'Cancel export',
        danger: true,
      });
      if (!proceed) return;
      showLoader(true, 'Packaging trial…');
    }

    const blob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6, // 1-9; 6 trades size against packaging time
        },
      },
      (metadata) => {
        if (metadata.percent) {
          showLoader(true, `Compressing… ${Math.round(metadata.percent)}%`);
        }
      }
    );

    const sanitizedTrialName = state.trialName.replace(/[^a-z0-9_-]/gi, '_');
    const filename = `${sanitizedTrialName}.drtrial`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showLoader(false);

    const fileSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
    const missing = packaging.failed.length;
    showToast(
      `Exported ${filename} (${fileSizeMB} MB, ${filesAdded} files` +
        (missing > 0 ? `, ${missing} missing` : '') +
        ')',
      { type: missing > 0 ? 'warning' : 'success', duration: 5000 }
    );
  } catch (error) {
    console.error('Export failed:', error);
    showLoader(false);
    await alertDialog({ title: 'Export failed', type: 'error', message: error.message });
  }
}

// `progress` is a mutable counter shared across the recursive calls.
export async function addDirectoryToZip(
  zip,
  dir,
  zipPath,
  progressCallback,
  progress = { count: 1, total: 0 }
) {
  // Anything that could not be packaged, so the caller can refuse to claim
  // success. A swallowed failure here ships a trial missing sprites or voice
  // lines, and the author finds out when the engine renders a character with
  // no sprite - one tool away from the cause.
  if (!progress.failed) progress.failed = [];

  // trial.json is sanitized and added by the caller.
  if (zipPath === 'trial.json') {
    return;
  }

  for await (const entry of dir.values()) {
    const entryPath = zipPath ? `${zipPath}/${entry.name}` : entry.name;

    if (entryPath === 'trial.json') {
      continue;
    }

    if (entry.kind === 'file') {
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
        progress.failed.push(entryPath);
      }
    } else if (entry.kind === 'directory') {
      let subDirHandle;
      try {
        subDirHandle = await dir.getDirectoryHandle(entry.name);
      } catch (error) {
        // A per-folder NotAllowedError would otherwise abort the whole export
        // from inside the recursion, with no indication of which folder.
        console.warn(`Failed to open folder ${entryPath}:`, error);
        progress.failed.push(`${entryPath}/`);
        continue;
      }
      await addDirectoryToZip(zip, subDirHandle, entryPath, progressCallback, progress);
    }
  }
}

export async function countFilesInDirectory(dir) {
  let count = 0;

  for await (const entry of dir.values()) {
    if (entry.kind === 'file') {
      count++;
    } else if (entry.kind === 'directory') {
      // A folder that cannot be opened is reported by addDirectoryToZip, which
      // packages what it can. Throwing here instead would abort the export
      // before packaging even started - the loud-but-total failure the walk
      // was changed to avoid.
      let subDirHandle;
      try {
        subDirHandle = await dir.getDirectoryHandle(entry.name);
      } catch (error) {
        console.warn(`Failed to count folder ${entry.name}:`, error);
        continue;
      }
      count += await countFilesInDirectory(subDirHandle);
    }
  }

  return count;
}

export function updateExportButtonState() {
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.disabled = !state.dirHandle || !state.trialName || state.trialName.trim() === '';
  }
}
