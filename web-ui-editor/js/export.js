// Export module - handles packaging trial files into .drtrial format
import JSZip from 'jszip';
import { state } from './core/state.js';
import { normalizeHighlights, showLoader } from './utils.js';

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
    alert('Please choose a trial folder first!');
    return;
  }

  if (!state.trialName || state.trialName.trim() === '') {
    alert('Please enter a trial name before exporting!');
    return;
  }

  try {
    showLoader(true);

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
          version: '4.0',
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
    await addDirectoryToZip(zip, state.dirHandle, '', (current, total) => {
      filesAdded = current;
      console.log(`Packaging... ${current}/${total} files`);
    });

    // Generate ZIP file
    console.log('Generating ZIP archive...');
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
          console.log(`Compressing... ${Math.round(metadata.percent)}%`);
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
    alert(
      `Trial exported successfully.\n\nFile: ${filename}\nSize: ${fileSizeMB} MB\nFiles packaged: ${filesAdded}`
    );
  } catch (error) {
    console.error('Export failed:', error);
    showLoader(false);
    alert(`Export failed: ${error.message}`);
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
