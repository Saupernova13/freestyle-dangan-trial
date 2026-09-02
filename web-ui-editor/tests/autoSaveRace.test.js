// @vitest-environment jsdom
//
// writeTrialJson had no in-flight guard. autoSaveTrial is called unawaited from
// dozens of sites and the debounce timer fires independently, so two
// FileSystemWritableFileStreams could be open on trial.json at once - each
// buffering to its own swap file, with the last close() winning regardless of
// which carried the newer state.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { state } from '../js/core/state.js';
import { autoSaveTrial, scheduleAutoSave } from '../js/core/storage.js';

let openWritables;
let maxConcurrentWritables;
let closedContents;
let writeDelayMs;

// A handle that reports how many writables are open at once, which is the
// thing the race actually produces.
function instrumentedDirHandle() {
  return {
    name: 'stub-trial',
    getFileHandle: async () => ({
      createWritable: async () => {
        openWritables++;
        maxConcurrentWritables = Math.max(maxConcurrentWritables, openWritables);
        let buffered = '';
        return {
          write: async (text) => {
            if (writeDelayMs) await new Promise((r) => setTimeout(r, writeDelayMs));
            buffered = text;
          },
          close: async () => {
            openWritables--;
            closedContents.push(buffered);
          },
        };
      },
    }),
  };
}

beforeEach(() => {
  openWritables = 0;
  maxConcurrentWritables = 0;
  closedContents = [];
  writeDelayMs = 0;
  state.dirHandle = instrumentedDirHandle();
  state.trialName = 'Race';
  state.cast = [];
  state.scriptLines = [];
  state.minigames = [];
  state.truthBullets = [];
});

describe('concurrent autosaves', () => {
  it('never opens two writables on trial.json at once', async () => {
    writeDelayMs = 5;
    // The reported shape: several unawaited calls landing on top of each other.
    autoSaveTrial({ skipHistory: true });
    autoSaveTrial({ skipHistory: true });
    await autoSaveTrial({ skipHistory: true });

    expect(maxConcurrentWritables).toBe(1);
  });

  it('lands the newest state last', async () => {
    writeDelayMs = 5;
    const first = autoSaveTrial({ skipHistory: true });
    state.trialName = 'Newer';
    const second = autoSaveTrial({ skipHistory: true });
    await Promise.all([first, second]);

    const lastWritten = JSON.parse(closedContents[closedContents.length - 1]);
    expect(lastWritten.trialName).toBe('Newer');
  });

  it('coalesces callers that arrive before the write starts', async () => {
    writeDelayMs = 5;
    const a = autoSaveTrial({ skipHistory: true });
    const b = autoSaveTrial({ skipHistory: true });
    const c = autoSaveTrial({ skipHistory: true });
    await Promise.all([a, b, c]);

    // One write, because the snapshot is taken when it runs: it already
    // carries whatever all three wanted saved.
    expect(closedContents).toHaveLength(1);
  });

  it('gives a caller that arrives mid-write its own link', async () => {
    writeDelayMs = 20;
    const a = autoSaveTrial({ skipHistory: true });
    await new Promise((r) => setTimeout(r, 5));
    // Its state may be newer than the snapshot already taken, so coalescing
    // into the running write would lose it.
    state.trialName = 'Newer';
    const b = autoSaveTrial({ skipHistory: true });
    await Promise.all([a, b]);

    expect(closedContents).toHaveLength(2);
    expect(JSON.parse(closedContents[1]).trialName).toBe('Newer');
  });

  it('keeps writing after a failed write instead of wedging the chain', async () => {
    let failNext = true;
    state.dirHandle = {
      name: 'flaky',
      getFileHandle: async () => {
        if (failNext) {
          failNext = false;
          throw new Error('NoModificationAllowedError');
        }
        return instrumentedDirHandle().getFileHandle();
      },
    };
    await autoSaveTrial({ skipHistory: true });
    await autoSaveTrial({ skipHistory: true });

    expect(closedContents).toHaveLength(1);
  });
});

describe('the save status', () => {
  it('is not reported clean for an edit made after the write snapshotted', async () => {
    vi.useFakeTimers();
    try {
      writeDelayMs = 0;
      const inFlight = autoSaveTrial({ skipHistory: true });
      // An edit landing while that write is in flight.
      scheduleAutoSave();
      await inFlight;
      // The pill would otherwise read "All changes saved" over work that is
      // still only in memory.
      const pill = document.getElementById('saveStatus');
      expect(pill === null || pill.textContent !== 'All changes saved').toBe(true);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});
