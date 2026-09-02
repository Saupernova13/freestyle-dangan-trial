// @vitest-environment jsdom
//
// The probe writes a real file, so a full disk fails it - likely in an app that
// stores sprite PNGs and audio in OPFS. Reporting that as an unsupported
// browser told the user to update an already-current one, and caching the
// rejection kept "New trial" and "Import" blocked for the whole session even
// after they deleted a trial to free space.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const MODULE = '../js/core/opfs.js';

let quotaFailures;

// A minimal OPFS root whose probe write fails `quotaFailures` times first.
function stubStorage({ writable = true, failWith = null } = {}) {
  const removed = [];
  const root = {
    removeEntry: async (name) => removed.push(name),
    getDirectoryHandle: async () => ({
      getFileHandle: async () => ({
        createWritable: writable
          ? async () => {
              if (quotaFailures > 0) {
                quotaFailures--;
                const err = new Error('quota');
                err.name = failWith;
                throw err;
              }
              return { write: async () => {}, close: async () => {} };
            }
          : undefined,
      }),
    }),
  };
  navigator.storage = { getDirectory: async () => root };
  return { removed };
}

beforeEach(() => {
  quotaFailures = 0;
  vi.resetModules();
});

afterEach(() => {
  delete navigator.storage;
});

describe('checkOpfsWritable', () => {
  it('reports a writable store', async () => {
    stubStorage();
    const { checkOpfsWritable } = await import(MODULE);
    expect(await checkOpfsWritable()).toMatchObject({ ok: true });
  });

  it('names a full disk as quota, not as an unsupported browser', async () => {
    stubStorage({ failWith: 'QuotaExceededError' });
    quotaFailures = 1;
    const { checkOpfsWritable, OPFS_QUOTA } = await import(MODULE);
    expect(await checkOpfsWritable()).toMatchObject({ ok: false, reason: OPFS_QUOTA });
  });

  it('separates an unexpected failure from both', async () => {
    stubStorage({ failWith: 'InvalidStateError' });
    quotaFailures = 1;
    const { checkOpfsWritable, OPFS_ERROR } = await import(MODULE);
    expect(await checkOpfsWritable()).toMatchObject({ ok: false, reason: OPFS_ERROR });
  });

  it('reports a browser without createWritable as unsupported', async () => {
    stubStorage({ writable: false });
    const { checkOpfsWritable, OPFS_UNSUPPORTED } = await import(MODULE);
    expect(await checkOpfsWritable()).toMatchObject({ ok: false, reason: OPFS_UNSUPPORTED });
  });

  it('does not cache a quota failure, so freeing space works without a reload', async () => {
    stubStorage({ failWith: 'QuotaExceededError' });
    quotaFailures = 1;
    const { checkOpfsWritable } = await import(MODULE);

    expect((await checkOpfsWritable()).ok).toBe(false);
    // The user deletes a trial; the next attempt must actually retry.
    expect((await checkOpfsWritable()).ok).toBe(true);
  });

  it('caches an unsupported verdict, which cannot change in a session', async () => {
    let probes = 0;
    navigator.storage = {
      getDirectory: async () => {
        probes++;
        return {
          removeEntry: async () => {},
          getDirectoryHandle: async () => ({ getFileHandle: async () => ({}) }),
        };
      },
    };
    const { checkOpfsWritable } = await import(MODULE);

    await checkOpfsWritable();
    await checkOpfsWritable();
    expect(probes).toBe(1);
  });

  it('cleans up the probe folder even when the write fails', async () => {
    const { removed } = stubStorage({ failWith: 'QuotaExceededError' });
    quotaFailures = 1;
    const { checkOpfsWritable } = await import(MODULE);
    await checkOpfsWritable();

    expect(removed).toContain('.write-probe');
  });
});
