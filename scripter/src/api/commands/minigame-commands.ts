import type { Minigame } from '../../domain/minigame-types.js';
import { createDefaultTypeSpecific } from '../../domain/minigame-types.js';
import { generateId } from '../../domain/ids.js';
import type { ScriptLine } from '../../domain/types.js';

export interface MinigameState {
  minigames: Minigame[];
  scriptLines: ScriptLine[];
}

export function addMinigame(
  state: MinigameState,
  minigame: Omit<Minigame, 'gameId'>,
): Minigame {
  const newMinigame = {
    ...minigame,
    gameId: generateId('mg'),
  } as Minigame;
  state.minigames.push(newMinigame);
  return newMinigame;
}

export function updateMinigame(
  state: MinigameState,
  id: string,
  updates: Partial<Minigame>,
): Minigame {
  const index = state.minigames.findIndex(m => m.gameId === id);
  if (index === -1) {
    throw new Error(`Minigame not found: ${id}`);
  }

  const existing = state.minigames[index];

  // When gameType changes, reset typeSpecific to the new type's defaults
  if (updates.gameType && updates.gameType !== existing.gameType) {
    const newTypeSpecific = createDefaultTypeSpecific(updates.gameType);
    const updated = {
      ...existing,
      ...updates,
      typeSpecific: newTypeSpecific,
      gameId: id,
    } as Minigame;
    state.minigames[index] = updated;
    return updated;
  }

  const updated = { ...existing, ...updates, gameId: id } as Minigame;
  state.minigames[index] = updated;
  return updated;
}

export function deleteMinigame(state: MinigameState, id: string): void {
  const index = state.minigames.findIndex(m => m.gameId === id);
  if (index === -1) {
    throw new Error(`Minigame not found: ${id}`);
  }
  state.minigames.splice(index, 1);

  // Clear references from script lines
  for (const line of state.scriptLines) {
    if (line.type === 'minigame' && line.minigameId === id) {
      (line as { minigameId: string }).minigameId = '';
    }
  }
}
