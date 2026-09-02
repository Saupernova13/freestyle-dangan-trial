// @vitest-environment jsdom
//
// Every delete in the editor was `try { removeEntry } catch { console.warn }`,
// and every caller then nulled the reference and carried on - one of them
// finishing with a green "success" toast. The reference went, the file stayed,
// and since addDirectoryToZip walks the real directory tree the orphan ships
// in every .drtrial from then on.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const showToast = vi.fn();

vi.mock('../js/ui/dialogs.js', () => ({
  alertDialog: vi.fn(async () => undefined),
  confirmDialog: vi.fn(async () => true),
  promptDialog: vi.fn(async () => ''),
  showToast,
}));

vi.mock('../js/core/storage.js', () => ({ autoSaveTrial: vi.fn(async () => {}) }));
vi.mock('../js/components/floatingAddButton.js', () => ({ updateFloatingAddButton: vi.fn() }));

const { removeEntry, reportFailedRemoval } = await import('../js/core/fileOps.js');
const { state } = await import('../js/core/state.js');
const { deleteTruthBullet } = await import('../js/views/truthBulletsView.js');

function dirThatThrows(error) {
  return { removeEntry: async () => { throw error; } };
}

function named(name) {
  return Object.assign(new Error(`${name} raised`), { name });
}

beforeEach(() => {
  showToast.mockClear();
});

describe('removeEntry', () => {
  it('reports success when the file is deleted', async () => {
    const removed = [];
    const dir = { removeEntry: async (n) => removed.push(n) };
    expect(await removeEntry(dir, 'clip.mp3')).toEqual({ failed: false });
    expect(removed).toEqual(['clip.mp3']);
  });

  it('treats an already-absent file as success', async () => {
    // The caller wanted it gone and it is gone. Reporting this would train
    // the author to ignore the message.
    const result = await removeEntry(dirThatThrows(named('NotFoundError')), 'clip.mp3');
    expect(result.failed).toBe(false);
  });

  it('reports a real failure', async () => {
    const result = await removeEntry(dirThatThrows(named('NotAllowedError')), 'clip.mp3');
    expect(result.failed).toBe(true);
  });

  it('is a no-op with no directory or no name', async () => {
    expect(await removeEntry(null, 'clip.mp3')).toEqual({ failed: false });
    expect(await removeEntry({ removeEntry: async () => {} }, '')).toEqual({ failed: false });
  });

  it('passes options through, so a recursive folder delete still is one', async () => {
    const calls = [];
    const dir = { removeEntry: async (n, o) => calls.push([n, o]) };
    await removeEntry(dir, 'Someone', { recursive: true });
    expect(calls).toEqual([['Someone', { recursive: true }]]);
  });
});

describe('reportFailedRemoval', () => {
  it('names the file that is still on disk', () => {
    expect(reportFailedRemoval('clip.mp3', { failed: true })).toBe(true);
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast.mock.calls[0][0]).toContain('clip.mp3');
    expect(showToast.mock.calls[0][1]).toEqual({ type: 'error' });
  });

  it('says nothing when the delete worked', () => {
    expect(reportFailedRemoval('clip.mp3', { failed: false })).toBe(false);
    expect(showToast).not.toHaveBeenCalled();
  });
});

describe('deleting a truth bullet', () => {
  function trialFolder(onRemove) {
    return {
      name: 'trial',
      getDirectoryHandle: async (name) => {
        if (name !== 'TruthBullets') throw new Error('NotFoundError');
        return { removeEntry: onRemove };
      },
    };
  }

  beforeEach(() => {
    document.body.innerHTML = '<div id="mainGrid"></div>';
    window.icon = () => '';
    state.minigames = [];
    state.truthBullets = [
      { bulletId: 'tb_1', name: 'Knife', imageFile: 'knife.png' },
      { bulletId: 'tb_2', name: 'Rope', imageFile: 'rope.png' },
    ];
    state.selectedTruthBulletId = 'tb_1';
  });

  it('deletes its image, which it never even attempted before', async () => {
    const removed = [];
    state.dirHandle = trialFolder(async (n) => removed.push(n));
    await deleteTruthBullet('tb_1');
    expect(removed).toEqual(['knife.png']);
    expect(state.truthBullets.map((b) => b.bulletId)).toEqual(['tb_2']);
  });

  it('says so when the image cannot be deleted', async () => {
    state.dirHandle = trialFolder(async () => {
      throw named('NotAllowedError');
    });
    await deleteTruthBullet('tb_1');
    expect(showToast.mock.calls.some((c) => String(c[0]).includes('knife.png'))).toBe(true);
    // The bullet still goes: the author asked for it, and leaving it would
    // make the failure worse than the orphan.
    expect(state.truthBullets.map((b) => b.bulletId)).toEqual(['tb_2']);
  });

  it('stays quiet for a bullet with no image', async () => {
    state.truthBullets[0].imageFile = null;
    state.dirHandle = trialFolder(async () => {
      throw new Error('should not be called');
    });
    await deleteTruthBullet('tb_1');
    expect(showToast).not.toHaveBeenCalled();
  });
});
