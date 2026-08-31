// @vitest-environment jsdom
//
// jsdom, because storage.js transitively imports app.js, which registers its
// DOMContentLoaded handler at module scope. That is why the storage layer had
// no tests at all (#53).
//
// Leaving a trial inside the 600 ms debounce window used to drop the last edit:
// the pending timer fired after state.dirHandle had been cleared, and
// autoSaveTrial returned as though there were nothing to save.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { state } from '../js/core/state.js';
import {
  autoSaveTrial,
  flushAutoSave,
  hasPendingWrites,
  scheduleAutoSave,
} from '../js/core/storage.js';

let writes;

function stubDirHandle() {
  return {
    name: 'stub-trial',
    getFileHandle: async () => ({
      createWritable: async () => ({
        write: async (text) => writes.push(text),
        close: async () => {},
      }),
    }),
  };
}

beforeEach(() => {
  writes = [];
  vi.useFakeTimers();
  state.dirHandle = stubDirHandle();
  state.trialName = 'Stub';
  state.cast = [];
  state.scriptLines = [];
  state.minigames = [];
  state.truthBullets = [];
});

afterEach(async () => {
  vi.clearAllTimers();
  vi.useRealTimers();
  state.dirHandle = null;
  // Drain the "dropped write" bookkeeping so one test cannot colour the next.
  await autoSaveTrial({ skipHistory: true });
});

describe('flushAutoSave', () => {
  it('writes an edit that is still inside the debounce window', async () => {
    scheduleAutoSave();
    expect(writes).toHaveLength(0);
    expect(hasPendingWrites()).toBe(true);

    await flushAutoSave();

    expect(writes).toHaveLength(1);
    expect(hasPendingWrites()).toBe(false);
  });

  it('does nothing when no write is outstanding', async () => {
    await flushAutoSave();
    expect(writes).toHaveLength(0);
  });

  it('leaves no timer behind to fire against the next trial', async () => {
    scheduleAutoSave();
    await flushAutoSave();
    // The old code cleared state.dirHandle and let this fire into the guard.
    await vi.advanceTimersByTimeAsync(2000);
    expect(writes).toHaveLength(1);
  });
});

describe('hasPendingWrites', () => {
  it('stays true after a failed save, so the tab guard still fires', async () => {
    state.dirHandle = {
      name: 'read-only',
      getFileHandle: async () => {
        throw new Error('permission denied');
      },
    };
    scheduleAutoSave();
    await flushAutoSave();
    expect(hasPendingWrites()).toBe(true);
  });
});
