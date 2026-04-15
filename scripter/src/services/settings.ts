/**
 * AppSettings — persistent application settings via localStorage.
 * Replaces the settings.js from the old codebase.
 */

export interface AppSettingsData {
  maxSprites: number;
  theme: 'light' | 'dark';
  autoSaveEnabled: boolean;
  autoSaveDelayMs: number;
}

const STORAGE_KEY = 'dr-scripter-settings';

const DEFAULTS: AppSettingsData = {
  maxSprites: 25,
  theme: 'light',
  autoSaveEnabled: true,
  autoSaveDelayMs: 500,
};

export class AppSettings {
  private data: AppSettingsData;

  constructor() {
    this.data = { ...DEFAULTS };
    this.load();
  }

  get<K extends keyof AppSettingsData>(key: K): AppSettingsData[K] {
    return this.data[key];
  }

  set<K extends keyof AppSettingsData>(key: K, value: AppSettingsData[K]): void {
    this.data[key] = value;
    this.save();
  }

  getAll(): Readonly<AppSettingsData> {
    return { ...this.data };
  }

  reset(): void {
    this.data = { ...DEFAULTS };
    this.save();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = { ...DEFAULTS, ...parsed };
      }
    } catch {
      this.data = { ...DEFAULTS };
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // localStorage may be full or unavailable
    }
  }
}
