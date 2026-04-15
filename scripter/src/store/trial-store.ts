import { TrialAPI } from '../api/trial-api.js';
import type { TrialEvent, Unsubscribe } from '../api/events.js';

export type ViewName = 'cast' | 'script' | 'truthBullets' | 'minigames';

/**
 * TrialStore — wraps TrialAPI with UI-specific state.
 * This is the single source of truth for the entire application.
 *
 * Replaces the 19+ global `let` variables from the old codebase.
 */
export class TrialStore {
  readonly api: TrialAPI;

  // UI state
  activeView: ViewName = 'cast';
  selectedTruthBulletId: string | null = null;
  expandedMinigameId: string | null = null;
  selectedLineIds = new Set<string>();

  // Listeners for UI reactivity
  private uiListeners = new Set<() => void>();

  constructor(api?: TrialAPI) {
    this.api = api ?? new TrialAPI();

    // Forward API events to UI listeners
    this.api.onAny(() => this.notifyUI());
  }

  // ---- View navigation ----

  switchView(view: ViewName): void {
    this.activeView = view;
    this.notifyUI();
  }

  // ---- Truth bullet selection ----

  selectTruthBullet(id: string | null): void {
    this.selectedTruthBulletId = id;
    this.notifyUI();
  }

  // ---- Minigame expansion ----

  toggleMinigameExpand(gameId: string): void {
    this.expandedMinigameId = this.expandedMinigameId === gameId ? null : gameId;
    this.notifyUI();
  }

  // ---- Script line selection ----

  toggleLineSelection(id: string): void {
    if (this.selectedLineIds.has(id)) {
      this.selectedLineIds.delete(id);
    } else {
      this.selectedLineIds.add(id);
    }
    this.notifyUI();
  }

  clearLineSelection(): void {
    this.selectedLineIds.clear();
    this.notifyUI();
  }

  // ---- UI reactivity ----

  /** Subscribe to UI state changes (for Lit reactive controllers) */
  subscribe(listener: () => void): Unsubscribe {
    this.uiListeners.add(listener);
    return () => this.uiListeners.delete(listener);
  }

  /** Subscribe to specific API events */
  on(eventType: TrialEvent['type'], handler: (e: TrialEvent) => void): Unsubscribe {
    return this.api.on(eventType, handler);
  }

  private notifyUI(): void {
    for (const listener of this.uiListeners) {
      listener();
    }
  }

  /** Clean up */
  destroy(): void {
    this.uiListeners.clear();
    this.api.destroy();
  }
}
