import JSZip from 'jszip';
import type { TrialAPI } from '../api/trial-api.js';
import type { FileSystemAdapter } from './filesystem.js';

export interface ExportProgress {
  phase: 'counting' | 'adding' | 'compressing' | 'done';
  current: number;
  total: number;
  percent: number;
}

export type ProgressCallback = (progress: ExportProgress) => void;

/**
 * ExportService — packages a trial into a .drtrial file (ZIP format).
 *
 * Fixes from the old export.js:
 * - Progress tracking actually works (total is set before reporting)
 * - trial.json is read from API state, not from disk (avoids stale data)
 */
export class ExportService {
  constructor(
    private fs: FileSystemAdapter,
    private api: TrialAPI,
  ) {}

  async exportTrial(onProgress?: ProgressCallback): Promise<Blob> {
    const zip = new JSZip();

    // Phase 1: Add trial.json from API state (always fresh)
    const trialData = this.api.toJSON();
    zip.file('trial.json', JSON.stringify(trialData, null, 2));

    // Phase 2: Count files for progress
    onProgress?.({ phase: 'counting', current: 0, total: 0, percent: 0 });
    const totalFiles = await this.countFiles('');

    // Phase 3: Add all other files
    let added = 0;
    await this.addDirectory(zip, '', (current) => {
      added = current;
      onProgress?.({
        phase: 'adding',
        current,
        total: totalFiles,
        percent: totalFiles > 0 ? Math.round((current / totalFiles) * 50) : 0,
      });
    });

    // Phase 4: Generate ZIP
    const blob = await zip.generateAsync(
      { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
      (metadata) => {
        onProgress?.({
          phase: 'compressing',
          current: added,
          total: totalFiles,
          percent: 50 + Math.round((metadata.percent ?? 0) / 2),
        });
      },
    );

    onProgress?.({ phase: 'done', current: totalFiles, total: totalFiles, percent: 100 });
    return blob;
  }

  /** Get a sanitized filename for the export */
  getExportFilename(): string {
    const name = this.api.getTrialName() || 'untitled_trial';
    return name.replace(/[^a-z0-9_\-]/gi, '_') + '.drtrial';
  }

  private async countFiles(path: string): Promise<number> {
    let count = 0;
    try {
      const entries = await this.fs.listDirectory(path);
      for (const entry of entries) {
        const fullPath = path ? `${path}/${entry}` : entry;
        // Try as directory first
        try {
          const subEntries = await this.fs.listDirectory(fullPath);
          if (subEntries.length >= 0) {
            count += await this.countFiles(fullPath);
            continue;
          }
        } catch {
          // Not a directory — it's a file
        }
        count++;
      }
    } catch {
      // Directory doesn't exist
    }
    return count;
  }

  private async addDirectory(
    zip: JSZip,
    path: string,
    onFileAdded: (count: number) => void,
    state = { count: 0 },
  ): Promise<void> {
    let entries: string[];
    try {
      entries = await this.fs.listDirectory(path);
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path ? `${path}/${entry}` : entry;

      // Skip trial.json (already added from API state)
      if (fullPath === 'trial.json') continue;

      // Try as directory
      try {
        const subEntries = await this.fs.listDirectory(fullPath);
        if (subEntries.length >= 0) {
          await this.addDirectory(zip, fullPath, onFileAdded, state);
          continue;
        }
      } catch {
        // Not a directory — add as file
      }

      try {
        const file = await this.fs.readFile(fullPath);
        const buffer = await file.arrayBuffer();
        zip.file(fullPath, buffer);
        state.count++;
        onFileAdded(state.count);
      } catch {
        // Skip files that can't be read
      }
    }
  }
}

/** Trigger a browser download for a blob */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
