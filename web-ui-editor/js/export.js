// Export module - handles packaging trial files into .drtrial format

/**
 * Export the current trial to a playable .drtrial file (ZIP format)
 */
async function exportToPlayableFile() {
  if (!dirHandle) {
    alert("Please choose a trial folder first!");
    return;
  }

  if (!trialName || trialName.trim() === "") {
    alert("Please enter a trial name before exporting!");
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
    totalFiles = await countFilesInDirectory(dirHandle);
    console.log(`Preparing to package ${totalFiles} files...`);

    // Add trial.json
    try {
      const trialJsonHandle = await dirHandle.getFileHandle("trial.json");
      const trialJsonFile = await trialJsonHandle.getFile();
      const trialJsonContent = await trialJsonFile.text();
      zip.file("trial.json", trialJsonContent);
      filesAdded++;
      console.log(`Added trial.json (${filesAdded}/${totalFiles})`);
    } catch (error) {
      console.warn("trial.json not found, creating minimal version");
      // Create minimal trial.json if it doesn't exist
      const minimalTrial = {
        trialName: trialName,
        characters: cast.map(c => c ? c.id : null),
        truthBullets: truthBullets || [],
        minigames: minigames || [],
        script: { lines: scriptLines || [] },
        metadata: {
          version: "4.0",
          lastModified: new Date().toISOString(),
          scriptLineCount: (scriptLines || []).length,
          minigameCount: (minigames || []).length,
          truthBulletCount: (truthBullets || []).length
        }
      };
      zip.file("trial.json", JSON.stringify(minimalTrial, null, 2));
      filesAdded++;
    }

    // Add all other files and directories
    await addDirectoryToZip(zip, dirHandle, "", (current, total) => {
      filesAdded = current;
      console.log(`Packaging... ${current}/${total} files`);
    });

    // Generate ZIP file
    console.log("Generating ZIP archive...");
    const blob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6  // Balanced compression (1-9, 9=max)
      }
    }, (metadata) => {
      // Progress callback
      if (metadata.percent) {
        console.log(`Compressing... ${Math.round(metadata.percent)}%`);
      }
    });

    // Create filename and trigger download
    const sanitizedTrialName = trialName.replace(/[^a-z0-9_\-]/gi, '_');
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
    alert(`✅ Trial exported successfully!\n\nFile: ${filename}\nSize: ${fileSizeMB} MB\nFiles packaged: ${filesAdded}`);

  } catch (error) {
    console.error("Export failed:", error);
    showLoader(false);
    alert(`❌ Export failed: ${error.message}`);
  }
}

/**
 * Recursively add directory contents to ZIP archive
 * @param {JSZip} zip - The JSZip instance
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle to process
 * @param {string} zipPath - Path within the ZIP file
 * @param {Function} progressCallback - Optional callback for progress updates
 * @param {Object} state - State object to track progress
 */
async function addDirectoryToZip(zip, dirHandle, zipPath, progressCallback, state = { count: 1, total: 0 }) {
  // Skip trial.json as it's already added
  if (zipPath === "trial.json") {
    return;
  }

  for await (const entry of dirHandle.values()) {
    const entryPath = zipPath ? `${zipPath}/${entry.name}` : entry.name;

    // Skip trial.json at root level (already added)
    if (entryPath === "trial.json") {
      continue;
    }

    if (entry.kind === 'file') {
      // Add file to ZIP
      try {
        const fileHandle = await dirHandle.getFileHandle(entry.name);
        const file = await fileHandle.getFile();
        const fileData = await file.arrayBuffer();
        zip.file(entryPath, fileData);

        state.count++;
        if (progressCallback) {
          progressCallback(state.count, state.total);
        }
      } catch (error) {
        console.warn(`Failed to add file ${entryPath}:`, error);
      }
    } else if (entry.kind === 'directory') {
      // Recursively add directory
      const subDirHandle = await dirHandle.getDirectoryHandle(entry.name);
      await addDirectoryToZip(zip, subDirHandle, entryPath, progressCallback, state);
    }
  }
}

/**
 * Count total files in directory (for progress tracking)
 * @param {FileSystemDirectoryHandle} dirHandle - Directory to count
 * @returns {Promise<number>} Total number of files
 */
async function countFilesInDirectory(dirHandle) {
  let count = 0;

  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      count++;
    } else if (entry.kind === 'directory') {
      const subDirHandle = await dirHandle.getDirectoryHandle(entry.name);
      count += await countFilesInDirectory(subDirHandle);
    }
  }

  return count;
}

/**
 * Enable/disable export button based on trial state
 */
function updateExportButtonState() {
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    // Enable if we have a directory handle and a trial name
    exportBtn.disabled = !dirHandle || !trialName || trialName.trim() === "";
  }
}

// Update export button state when trial name changes
document.addEventListener('DOMContentLoaded', () => {
  const trialNameInput = document.getElementById('trialNameInput');
  if (trialNameInput) {
    trialNameInput.addEventListener('input', updateExportButtonState);
  }
});

// Also expose this function to be called when directory is chosen
window.updateExportButtonState = updateExportButtonState;
