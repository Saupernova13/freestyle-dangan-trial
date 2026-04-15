import type { TrialStore } from './trial-store.js';
import type { PersistenceService } from '../services/persistence.js';
import type { Unsubscribe } from '../api/events.js';

/**
 * AutoSave — debounced persistence on store changes.
 *
 * Fixes the old codebase's problem of calling autoSaveTrial() on every keystroke
 * with no debouncing, causing I/O thrashing.
 */
export class AutoSave {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private unsub: Unsubscribe | null = null;
  private saving = false;

  constructor(
    private store: TrialStore,
    private persistence: PersistenceService,
    private delayMs = 500,
  ) {}

  /** Start watching for changes */
  start(): void {
    this.unsub = this.store.api.onAny(() => {
      this.scheduleSave();
    });
  }

  /** Stop watching and cancel pending saves */
  stop(): void {
    this.unsub?.();
    this.unsub = null;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /** Force an immediate save */
  async saveNow(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.doSave();
  }

  /** Check if a save is in progress */
  isSaving(): boolean {
    return this.saving;
  }

  private scheduleSave(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      this.doSave();
    }, this.delayMs);
  }

  private async doSave(): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    try {
      await this.persistence.saveTrial(this.store.api);
    } catch (error) {
      console.error('AutoSave failed:', error);
    } finally {
      this.saving = false;
    }
  }

  destroy(): void {
    this.stop();
  }
}
