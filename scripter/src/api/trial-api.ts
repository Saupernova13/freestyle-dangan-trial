import { CAST_SLOTS, STUDENT_COUNT, TRIAL_FORMAT_VERSION } from '../domain/constants.js';
import type {
  Character,
  ScriptLine,
  TruthBullet,
  TrialData,
  SerializedMinigame,
} from '../domain/types.js';
import type { Minigame } from '../domain/minigame-types.js';
import { EventBus, type TrialEventType, type EventHandler, type Unsubscribe } from './events.js';
import { setCharacter, removeCharacter, type CastState } from './commands/cast-commands.js';
import {
  addScriptLine as addLine,
  updateScriptLine as updateLine,
  deleteScriptLines,
  reorderScriptLines as reorderLines,
  type ScriptState,
} from './commands/script-commands.js';
import {
  addTruthBullet as addBullet,
  updateTruthBullet as updateBullet,
  deleteTruthBullet as deleteBulletCmd,
  type BulletState,
} from './commands/bullet-commands.js';
import {
  addMinigame as addMg,
  updateMinigame as updateMg,
  deleteMinigame as deleteMgCmd,
  type MinigameState,
} from './commands/minigame-commands.js';

// ============================================================
// Internal state shape
// ============================================================

interface TrialState extends CastState, ScriptState, BulletState, MinigameState {
  trialName: string;
}

// ============================================================
// TrialAPI — the public programmatic surface
// ============================================================

export class TrialAPI {
  private state: TrialState;
  private events: EventBus;

  constructor() {
    this.state = {
      trialName: '',
      cast: new Array<Character | null>(CAST_SLOTS).fill(null),
      scriptLines: [],
      truthBullets: [],
      minigames: [],
    };
    this.events = new EventBus();
  }

  // ---- Events ----

  on(eventType: TrialEventType, handler: EventHandler): Unsubscribe {
    return this.events.on(eventType, handler);
  }

  onAny(handler: EventHandler): Unsubscribe {
    return this.events.onAny(handler);
  }

  // ---- Trial Name ----

  getTrialName(): string {
    return this.state.trialName;
  }

  setTrialName(name: string): void {
    this.state.trialName = name;
    this.events.emit({ type: 'trial:name-changed', name });
  }

  // ---- Cast ----

  getCast(): ReadonlyArray<Character | null> {
    return this.state.cast;
  }

  getCharacter(id: string): Character | null {
    return this.state.cast.find(c => c?.id === id) ?? null;
  }

  getCharacterAtPosition(position: number): Character | null {
    return this.state.cast[position] ?? null;
  }

  setCharacter(position: number, character: Character): void {
    setCharacter(this.state, position, character);
    this.events.emit({ type: 'cast:set', position, character: this.state.cast[position]! });
  }

  removeCharacter(position: number): void {
    removeCharacter(this.state, position);
    this.events.emit({ type: 'cast:removed', position });
  }

  // ---- Script Lines ----

  getScriptLines(): ReadonlyArray<ScriptLine> {
    return this.state.scriptLines;
  }

  getScriptLine(id: string): ScriptLine | null {
    return this.state.scriptLines.find(l => l.id === id) ?? null;
  }

  addScriptLine(line: Omit<ScriptLine, 'id' | 'order'>): ScriptLine {
    const newLine = addLine(this.state, line);
    this.events.emit({ type: 'script:added', line: newLine });
    return newLine;
  }

  updateScriptLine(id: string, updates: Partial<ScriptLine>): ScriptLine {
    const updated = updateLine(this.state, id, updates);
    this.events.emit({ type: 'script:updated', id, line: updated });
    return updated;
  }

  deleteScriptLines(ids: string[]): void {
    deleteScriptLines(this.state, ids);
    this.events.emit({ type: 'script:deleted', ids });
  }

  reorderScriptLines(ids: string[], insertBefore: number): void {
    reorderLines(this.state, ids, insertBefore);
    this.events.emit({ type: 'script:reordered' });
  }

  // ---- Truth Bullets ----

  getTruthBullets(): ReadonlyArray<TruthBullet> {
    return this.state.truthBullets;
  }

  getTruthBullet(id: string): TruthBullet | null {
    return this.state.truthBullets.find(b => b.bulletId === id) ?? null;
  }

  addTruthBullet(bullet: Omit<TruthBullet, 'bulletId'>): TruthBullet {
    const newBullet = addBullet(this.state, bullet);
    this.events.emit({ type: 'bullets:added', bullet: newBullet });
    return newBullet;
  }

  updateTruthBullet(id: string, updates: Partial<TruthBullet>): TruthBullet {
    const updated = updateBullet(this.state, id, updates);
    this.events.emit({ type: 'bullets:updated', id, bullet: updated });
    return updated;
  }

  deleteTruthBullet(id: string): void {
    deleteBulletCmd(this.state, id);
    this.events.emit({ type: 'bullets:deleted', id });
  }

  // ---- Minigames ----

  getMinigames(): ReadonlyArray<Minigame> {
    return this.state.minigames;
  }

  getMinigame(id: string): Minigame | null {
    return this.state.minigames.find(m => m.gameId === id) ?? null;
  }

  addMinigame(minigame: Omit<Minigame, 'gameId'>): Minigame {
    const newMg = addMg(this.state, minigame);
    this.events.emit({ type: 'minigames:added', minigame: newMg });
    return newMg;
  }

  updateMinigame(id: string, updates: Partial<Minigame>): Minigame {
    const updated = updateMg(this.state, id, updates);
    this.events.emit({ type: 'minigames:updated', id, minigame: updated });
    return updated;
  }

  deleteMinigame(id: string): void {
    deleteMgCmd(this.state, id);
    this.events.emit({ type: 'minigames:deleted', id });
  }

  // ---- Serialization ----

  /** Serialize to trial.json format (compatible with existing web-ui-editor) */
  toJSON(): TrialData {
    const characterIds = this.state.cast.map(c => c?.id ?? null);
    const now = new Date().toISOString();

    return {
      trialName: this.state.trialName,
      characters: characterIds,
      truthBullets: this.state.truthBullets.map(b => ({
        bulletId: b.bulletId,
        name: b.name,
        description: b.description,
        imageFile: b.imageFile,
        inversedLieBulletName: b.inversedLieBulletName,
      })),
      minigames: this.state.minigames as unknown as SerializedMinigame[],
      script: {
        lines: this.state.scriptLines,
        lastModified: now,
      },
      metadata: {
        version: TRIAL_FORMAT_VERSION,
        lastModified: now,
        studentCount: STUDENT_COUNT,
        headmasterCount: CAST_SLOTS - STUDENT_COUNT,
        totalCharacters: characterIds.filter(id => id !== null).length,
        scriptLineCount: this.state.scriptLines.length,
        minigameCount: this.state.minigames.length,
        truthBulletCount: this.state.truthBullets.length,
      },
    };
  }

  /** Load from trial.json format */
  static fromJSON(
    data: TrialData,
    characters: (Character | null)[] = new Array(CAST_SLOTS).fill(null),
  ): TrialAPI {
    const api = new TrialAPI();
    api.state.trialName = data.trialName || '';

    // Characters are loaded separately (they come from Character/ folders)
    api.state.cast = characters.length === CAST_SLOTS
      ? [...characters]
      : new Array<Character | null>(CAST_SLOTS).fill(null);

    api.state.scriptLines = data.script?.lines ?? [];
    api.state.truthBullets = data.truthBullets ?? [];
    api.state.minigames = (data.minigames ?? []) as unknown as Minigame[];

    api.events.emit({ type: 'trial:loaded' });
    return api;
  }

  /** Reset to empty state */
  reset(): void {
    this.state.trialName = '';
    this.state.cast = new Array<Character | null>(CAST_SLOTS).fill(null);
    this.state.scriptLines = [];
    this.state.truthBullets = [];
    this.state.minigames = [];
    this.events.emit({ type: 'trial:loaded' });
  }

  /** Destroy: remove all event listeners */
  destroy(): void {
    this.events.clear();
  }
}
