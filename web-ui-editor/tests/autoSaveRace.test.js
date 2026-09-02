// @vitest-environment jsdom
//
// writeTrialJson had no in-flight guard. autoSaveTrial is called unawaited from
// dozens of sites and the debounce timer fires independently, so two
// FileSystemWritableFileStreams could be open on trial.json at once - each
// buffering to its own swap file, with the last close() winning regardless of
// which carried the newer state.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { state } from '../js/core/state.js';
import {
  autoSaveTrial,
  flushAutoSave,
  hasPendingWrites,
  scheduleAutoSave,
} from '../js/core/storage.js';

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

// setSaveStatus writes into #saveStatus and returns silently when it is
// absent, so without this the status assertions below would pass no matter
// what the code did.
function mountSaveStatusPill() {
  document.body.innerHTML = '<div id="saveStatus"></div>';
  window.icon = () => '';
  return document.getElementById('saveStatus');
}

beforeEach(async () => {
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

  // storage.js keeps its timer and dirty flag at module scope, so a debounce
  // armed by one test would leave hasPendingWrites() true for every test after
  // it. Drain it, then reset the counters the drain itself moved.
  await flushAutoSave();
  openWritables = 0;
  maxConcurrentWritables = 0;
  closedContents = [];
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
  it('reads clean once a write completes with nothing outstanding', async () => {
    const pill = mountSaveStatusPill();
    await autoSaveTrial({ skipHistory: true });
    expect(pill.textContent).toContain('All changes saved');
  });

  it('is not reported clean for an edit made after the write snapshotted', async () => {
    const pill = mountSaveStatusPill();
    vi.useFakeTimers();
    try {
      writeDelayMs = 20;
      const inFlight = autoSaveTrial({ skipHistory: true });
      // Far enough in that the snapshot has been taken and the write is in
      // its I/O. An edit landing before the snapshot is genuinely included by
      // it, so only this window is a real "saved" over unsaved work.
      await vi.advanceTimersByTimeAsync(5);
      scheduleAutoSave(100000);
      await vi.advanceTimersByTimeAsync(30);
      await inFlight;

      expect(pill.textContent).not.toContain('All changes saved');
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});

describe('a direct autoSaveTrial call', () => {
  it('counts as pending work even when it skips history', async () => {
    // Undo's restore saves this way, with no preceding scheduleAutoSave, so
    // gating the dirty flag on !skipHistory left beforeunload silent for it.
    writeDelayMs = 5;
    const inFlight = autoSaveTrial({ skipHistory: true });
    expect(hasPendingWrites()).toBe(true);
    await inFlight;
    expect(hasPendingWrites()).toBe(false);
  });

  it('counts as pending work while it is in flight', async () => {
    writeDelayMs = 5;
    // minigameView and the modals save this way rather than through the
    // debounce, so beforeunload has to see them too.
    const inFlight = autoSaveTrial();
    expect(hasPendingWrites()).toBe(true);
    await inFlight;
    expect(hasPendingWrites()).toBe(false);
  });

  it('still counts as pending after it fails', async () => {
    state.dirHandle = {
      name: 'read-only',
      getFileHandle: async () => {
        throw new Error('permission denied');
      },
    };
    await autoSaveTrial();
    expect(hasPendingWrites()).toBe(true);

    // storage.js keeps the dirty flag at module scope and vitest reuses the
    // module across files in a worker, so leaving it set here would make a
    // later file fail depending on run order.
    state.dirHandle = instrumentedDirHandle();
    await autoSaveTrial();
    expect(hasPendingWrites()).toBe(false);
  });
});
