/**
 * FileSystemAdapter — abstracts browser File System Access API.
 * The BrowserFileSystemAdapter uses the real API.
 * The InMemoryFileSystemAdapter is used for tests.
 */

export interface FileSystemAdapter {
  chooseDirectory(): Promise<void>;
  hasDirectory(): boolean;

  readJSON<T>(path: string): Promise<T>;
  writeJSON(path: string, data: unknown): Promise<void>;
  readFile(path: string): Promise<File>;
  writeFile(path: string, blob: Blob, name?: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  listDirectory(path: string): Promise<string[]>;
  ensureDirectory(path: string): Promise<void>;
  getDirectoryHandle(): FileSystemDirectoryHandle | null;
}

// ============================================================
// Browser implementation
// ============================================================

export class BrowserFileSystemAdapter implements FileSystemAdapter {
  private dirHandle: FileSystemDirectoryHandle | null = null;

  async chooseDirectory(): Promise<void> {
    this.dirHandle = await (window as unknown as { showDirectoryPicker: (opts: object) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({
      id: 'dr-trial-dir',
      mode: 'readwrite',
    });
  }

  hasDirectory(): boolean {
    return this.dirHandle !== null;
  }

  getDirectoryHandle(): FileSystemDirectoryHandle | null {
    return this.dirHandle;
  }

  private assertDir(): FileSystemDirectoryHandle {
    if (!this.dirHandle) throw new Error('No directory selected');
    return this.dirHandle;
  }

  private async resolve(path: string): Promise<{ dir: FileSystemDirectoryHandle; name: string }> {
    const parts = path.split('/').filter(Boolean);
    const name = parts.pop()!;
    let dir = this.assertDir();
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: false });
    }
    return { dir, name };
  }

  async readJSON<T>(path: string): Promise<T> {
    const { dir, name } = await this.resolve(path);
    const handle = await dir.getFileHandle(name);
    const file = await handle.getFile();
    return JSON.parse(await file.text()) as T;
  }

  async writeJSON(path: string, data: unknown): Promise<void> {
    const { dir, name } = await this.resolve(path);
    const handle = await dir.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  }

  async readFile(path: string): Promise<File> {
    const { dir, name } = await this.resolve(path);
    const handle = await dir.getFileHandle(name);
    return handle.getFile();
  }

  async writeFile(path: string, blob: Blob, _name?: string): Promise<void> {
    const { dir, name } = await this.resolve(path);
    const handle = await dir.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  async deleteFile(path: string): Promise<void> {
    const { dir, name } = await this.resolve(path);
    await dir.removeEntry(name);
  }

  async listDirectory(path: string): Promise<string[]> {
    let dir = this.assertDir();
    if (path) {
      const parts = path.split('/').filter(Boolean);
      for (const part of parts) {
        dir = await dir.getDirectoryHandle(part, { create: false });
      }
    }
    const entries: string[] = [];
    for await (const entry of dir.values()) {
      entries.push(entry.name);
    }
    return entries;
  }

  async ensureDirectory(path: string): Promise<void> {
    let dir = this.assertDir();
    const parts = path.split('/').filter(Boolean);
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: true });
    }
  }
}

// ============================================================
// In-memory implementation (for testing)
// ============================================================

export class InMemoryFileSystemAdapter implements FileSystemAdapter {
  private files = new Map<string, string | Blob>();
  private opened = false;

  constructor(initialFiles?: Record<string, string | Blob>) {
    if (initialFiles) {
      for (const [path, content] of Object.entries(initialFiles)) {
        this.files.set(this.normalize(path), content);
      }
    }
  }

  private normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\/+/, '');
  }

  async chooseDirectory(): Promise<void> {
    this.opened = true;
  }

  hasDirectory(): boolean {
    return this.opened;
  }

  getDirectoryHandle(): FileSystemDirectoryHandle | null {
    return null;
  }

  async readJSON<T>(path: string): Promise<T> {
    const content = this.files.get(this.normalize(path));
    if (content === undefined) throw new Error(`File not found: ${path}`);
    if (typeof content !== 'string') throw new Error(`${path} is not a text file`);
    return JSON.parse(content) as T;
  }

  async writeJSON(path: string, data: unknown): Promise<void> {
    this.files.set(this.normalize(path), JSON.stringify(data, null, 2));
  }

  async readFile(path: string): Promise<File> {
    const content = this.files.get(this.normalize(path));
    if (content === undefined) throw new Error(`File not found: ${path}`);
    const blob = typeof content === 'string' ? new Blob([content]) : content;
    const name = path.split('/').pop() || 'file';
    return new File([blob], name);
  }

  async writeFile(path: string, blob: Blob): Promise<void> {
    this.files.set(this.normalize(path), blob);
  }

  async deleteFile(path: string): Promise<void> {
    this.files.delete(this.normalize(path));
  }

  async listDirectory(path: string): Promise<string[]> {
    const prefix = path ? this.normalize(path) + '/' : '';
    const entries = new Set<string>();
    for (const key of this.files.keys()) {
      if (key.startsWith(prefix)) {
        const rest = key.substring(prefix.length);
        const firstPart = rest.split('/')[0];
        entries.add(firstPart);
      }
    }
    return [...entries];
  }

  async ensureDirectory(_path: string): Promise<void> {
    // No-op for in-memory
  }

  /** Test helper: get raw content */
  getRaw(path: string): string | Blob | undefined {
    return this.files.get(this.normalize(path));
  }

  /** Test helper: check if file exists */
  has(path: string): boolean {
    return this.files.has(this.normalize(path));
  }
}
