// Undo/redo history. history.js only imports core/state.js, so this runs
// under node; render and persist side effects are stubbed via initHistory.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canRedo,
  canUndo,
  initHistory,
  isRestoring,
  markFileDeleted,
  recordChange,
  redo,
  resetHistory,
  undo,
} from '../js/core/history.js';
import { state } from '../js/core/state.js';

function seedState() {
  state.trialName = 'Original';
  state.cast = [null, null];
  state.scriptLines = [{ id: 'l1', type: 'narrator', text: 'one' }];
  state.minigames = [];
  state.truthBullets = [{ bulletId: 'tb1', name: 'B' }];
  state.selectedTruthBulletId = 'tb1';
  state.selectedLineIds = new Set();
  state.draggedLineIds = [];
}

let restoreCalls;

beforeEach(() => {
  vi.useFakeTimers();
  restoreCalls = 0;
  seedState();
  initHistory(() => {
    restoreCalls++;
  });
  resetHistory();
});

afterEach(() => {
  vi.useRealTimers();
  initHistory(null);
});

// One settled edit: mutate state, then flush the debounce.
function edit(mutate) {
  mutate();
  recordChange(500);
  vi.advanceTimersByTime(500);
}

describe('undo/redo', () => {
  it('starts with nothing to undo or redo', () => {
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(false);
    expect(undo()).toBe(false);
    expect(redo()).toBe(false);
    expect(restoreCalls).toBe(0);
  });

  it('undoes and redoes a change', () => {
    edit(() => {
      state.trialName = 'Changed';
    });

    expect(undo()).toBe(true);
    expect(state.trialName).toBe('Original');
    expect(restoreCalls).toBe(1);
    expect(canRedo()).toBe(true);

    expect(redo()).toBe(true);
    expect(state.trialName).toBe('Changed');
    expect(restoreCalls).toBe(2);
  });

  it('coalesces a keystroke storm into one snapshot', () => {
    for (const partial of ['C', 'Ch', 'Cha', 'Chan', 'Changed']) {
      state.trialName = partial;
      recordChange(500);
      vi.advanceTimersByTime(100);
    }
    vi.advanceTimersByTime(500);

    expect(undo()).toBe(true);
    expect(state.trialName).toBe('Original');
    // Only one settled edit existed.
    expect(undo()).toBe(false);
  });

  it('flushes a pending record when undo is pressed mid-debounce', () => {
    state.trialName = 'Changed';
    recordChange(500);
    // No timer advance: the record is still pending.
    expect(undo()).toBe(true);
    expect(state.trialName).toBe('Original');
  });

  it('drops the redo stack on a new edit after undo', () => {
    edit(() => {
      state.trialName = 'A';
    });
    edit(() => {
      state.trialName = 'B';
    });
    undo();
    expect(state.trialName).toBe('A');

    edit(() => {
      state.trialName = 'C';
    });
    expect(canRedo()).toBe(false);
    undo();
    expect(state.trialName).toBe('A');
  });

  it('caps the stack at 50 snapshots', () => {
    for (let i = 0; i < 60; i++) {
      edit(() => {
        state.trialName = `edit-${i}`;
      });
    }
    let undos = 0;
    while (undo()) undos++;
    expect(undos).toBe(50);
    expect(state.trialName).toBe('edit-9');
  });

  it('deep-copies plain data so later mutations cannot corrupt snapshots', () => {
    edit(() => {
      state.scriptLines.push({ id: 'l2', type: 'narrator', text: 'two' });
    });
    // Mutating without recording must not reach the snapshot.
    state.scriptLines[1].text = 'tampered';
    undo();
    expect(state.scriptLines).toHaveLength(1);
    redo();
    expect(state.scriptLines[1].text).toBe('two');
  });

  it('passes Blobs by reference, preserving identity across undo', () => {
    const blob = new Blob(['audio']);
    edit(() => {
      state.minigames.push({ gameId: 'mg1', gameType: 'logic_dive', voiceLineBlob: blob });
    });
    undo();
    redo();
    expect(state.minigames[0].voiceLineBlob).toBe(blob);
  });

  it('nulls a selectedTruthBulletId that points at a bullet the snapshot lacks', () => {
    edit(() => {
      state.truthBullets = [];
    });
    // Selection is transient, so a restore must clear a dangling one.
    state.selectedTruthBulletId = 'tb1';
    // No assertion on the empty-future redo: it returns false without
    // touching anything, so "selection untouched" after it asserts nothing.
    undo(); // baseline has tb1, selection stays
    expect(state.selectedTruthBulletId).toBe('tb1');
    redo(); // bullets empty again -> dangling selection nulled
    expect(state.selectedTruthBulletId).toBe(null);
  });

  it('resetHistory clears both stacks', () => {
    edit(() => {
      state.trialName = 'Changed';
    });
    undo();
    resetHistory();
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(false);
  });

  it('ignores recordChange during a restore', () => {
    initHistory(() => {
      // Simulates the persist step inside the restore callback.
      expect(isRestoring()).toBe(true);
      recordChange(0);
    });
    edit(() => {
      state.trialName = 'Changed';
    });
    undo();
    vi.advanceTimersByTime(1000);
    expect(canRedo()).toBe(true); // a recorded change would have cleared it
  });
});

// A snapshot holds trial data only, and cloneValue passes Blobs by reference,
// so undoing past a deletion repainted a cast member whose folder was gone.
// The sprites still rendered from memory, buildTrialJson wrote the id back,
// and the export packaged nothing for them - a trial that shipped broken with
// no indication anywhere.
describe('the file-deletion barrier', () => {
  it('drops the past so undo cannot reach a state whose files are gone', () => {
    edit(() => {
      state.trialName = 'Before delete';
    });
    expect(canUndo()).toBe(true);

    markFileDeleted();
    edit(() => {
      state.trialName = 'After delete';
    });

    expect(canUndo()).toBe(false);
    expect(undo()).toBe(false);
    expect(state.trialName).toBe('After delete');
  });

  it('refuses to undo while the barrier is still pending', () => {
    edit(() => {
      state.trialName = 'Before delete';
    });
    markFileDeleted();

    // The delete has happened; the save that flushes it has not landed yet.
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(false);
    expect(undo()).toBe(false);
  });

  it('leaves everything after the barrier undoable', () => {
    markFileDeleted();
    edit(() => {
      state.trialName = 'At barrier';
    });
    edit(() => {
      state.trialName = 'Later edit';
    });

    expect(canUndo()).toBe(true);
    expect(undo()).toBe(true);
    expect(state.trialName).toBe('At barrier');
  });

  it('drops a pending redo too, since it also predates the deletion', () => {
    edit(() => {
      state.trialName = 'One';
    });
    edit(() => {
      state.trialName = 'Two';
    });
    undo();
    expect(canRedo()).toBe(true);

    markFileDeleted();
    edit(() => {
      state.trialName = 'After delete';
    });

    expect(canRedo()).toBe(false);
    expect(redo()).toBe(false);
  });

  it('is cleared by resetHistory, so it cannot cross into another trial', () => {
    markFileDeleted();
    resetHistory();
    edit(() => {
      state.trialName = 'Fresh trial edit';
    });

    expect(canUndo()).toBe(true);
  });

  it('consumes itself, so only the first flush after it is a barrier', () => {
    markFileDeleted();
    edit(() => {
      state.trialName = 'At barrier';
    });
    edit(() => {
      state.trialName = 'One';
    });
    edit(() => {
      state.trialName = 'Two';
    });

    expect(undo()).toBe(true);
    expect(state.trialName).toBe('One');
    expect(undo()).toBe(true);
    expect(state.trialName).toBe('At barrier');
    expect(undo()).toBe(false);
  });
});
