import type { ScriptLine } from '../../domain/types.js';
import { generateId } from '../../domain/ids.js';

export interface ScriptState {
  scriptLines: ScriptLine[];
}

export function addScriptLine(state: ScriptState, line: Omit<ScriptLine, 'id' | 'order'>): ScriptLine {
  const newLine = {
    ...line,
    id: generateId('line'),
    order: state.scriptLines.length,
  } as ScriptLine;
  state.scriptLines.push(newLine);
  return newLine;
}

export function updateScriptLine(state: ScriptState, id: string, updates: Partial<ScriptLine>): ScriptLine {
  const index = state.scriptLines.findIndex(l => l.id === id);
  if (index === -1) {
    throw new Error(`Script line not found: ${id}`);
  }
  const updated = { ...state.scriptLines[index], ...updates, id } as ScriptLine;
  state.scriptLines[index] = updated;
  return updated;
}

export function deleteScriptLines(state: ScriptState, ids: string[]): void {
  const idSet = new Set(ids);
  state.scriptLines = state.scriptLines.filter(l => !idSet.has(l.id));
  reindex(state);
}

export function reorderScriptLines(
  state: ScriptState,
  ids: string[],
  insertBefore: number,
): void {
  const movedLines: ScriptLine[] = [];
  const remaining: ScriptLine[] = [];

  for (const line of state.scriptLines) {
    if (ids.includes(line.id)) {
      movedLines.push(line);
    } else {
      remaining.push(line);
    }
  }

  if (movedLines.length === 0) return;

  // Adjust insertBefore based on how many moved items were before the target
  let adjustedInsert = insertBefore;
  for (const line of state.scriptLines) {
    if (ids.includes(line.id) && line.order < insertBefore) {
      adjustedInsert--;
    }
  }
  adjustedInsert = Math.max(0, Math.min(adjustedInsert, remaining.length));

  remaining.splice(adjustedInsert, 0, ...movedLines);
  state.scriptLines = remaining;
  reindex(state);
}

function reindex(state: ScriptState): void {
  state.scriptLines.forEach((line, i) => {
    line.order = i;
  });
}
