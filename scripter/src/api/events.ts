import type { Character, ScriptLine, TruthBullet } from '../domain/types.js';
import type { Minigame } from '../domain/minigame-types.js';

// ============================================================
// Event types — discriminated union
// ============================================================

export type TrialEvent =
  | { type: 'cast:set'; position: number; character: Character }
  | { type: 'cast:removed'; position: number }
  | { type: 'script:added'; line: ScriptLine }
  | { type: 'script:updated'; id: string; line: ScriptLine }
  | { type: 'script:deleted'; ids: string[] }
  | { type: 'script:reordered' }
  | { type: 'bullets:added'; bullet: TruthBullet }
  | { type: 'bullets:updated'; id: string; bullet: TruthBullet }
  | { type: 'bullets:deleted'; id: string }
  | { type: 'minigames:added'; minigame: Minigame }
  | { type: 'minigames:updated'; id: string; minigame: Minigame }
  | { type: 'minigames:deleted'; id: string }
  | { type: 'trial:loaded' }
  | { type: 'trial:name-changed'; name: string };

export type TrialEventType = TrialEvent['type'];

// ============================================================
// Event emitter
// ============================================================

export type EventHandler = (event: TrialEvent) => void;
export type Unsubscribe = () => void;

export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>();
  private wildcardListeners = new Set<EventHandler>();

  /** Subscribe to a specific event type */
  on(eventType: TrialEventType, handler: EventHandler): Unsubscribe {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);
    return () => this.listeners.get(eventType)?.delete(handler);
  }

  /** Subscribe to all events */
  onAny(handler: EventHandler): Unsubscribe {
    this.wildcardListeners.add(handler);
    return () => this.wildcardListeners.delete(handler);
  }

  /** Emit an event to all matching listeners */
  emit(event: TrialEvent): void {
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      for (const handler of typeListeners) {
        handler(event);
      }
    }
    for (const handler of this.wildcardListeners) {
      handler(event);
    }
  }

  /** Remove all listeners */
  clear(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
  }
}
