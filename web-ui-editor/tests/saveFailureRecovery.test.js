// @vitest-environment jsdom
//
// The save-failure handler alerted once and then went quiet until a save
// succeeded, and its advice - "check folder permissions and free disk space,
// then make another edit to retry" - is wrong for the likeliest cause. When
// Chrome drops a showDirectoryPicker grant (tab restore, browser restart,
// session resume) every write throws NotAllowedError forever, and retrying is
// exactly what will not help.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const alertDialog = vi.fn(async () => undefined);
const confirmDialog = vi.fn(async () => false);

vi.mock('../js/ui/dialogs.js', () => ({
  alertDialog,
  confirmDialog,
  promptDialog: vi.fn(async () => ''),
  showToast: vi.fn(),
}));

const { state } = await import('../js/core/state.js');
const { autoSaveTrial, flushAutoSave } = await import('../js/core/storage.js');

function handleThatFailsWith(error, { requestPermission } = {}) {
  return {
    name: 'folder',
    requestPermission,
    getFileHandle: async () => {
      throw error;
    },
  };
}

function workingHandle() {
  return {
    name: 'ok',
    getFileHandle: async () => ({
      createWritable: async () => ({ write: async () => {}, close: async () => {} }),
    }),
  };
}

function named(name) {
  return Object.assign(new Error(`${name} raised`), { name });
}

async function failTimes(handle, times) {
  for (let i = 0; i < times; i++) await autoSaveTrial({ skipHistory: true });
  return handle;
}

beforeEach(async () => {
  document.body.innerHTML = '<div id="saveStatus"></div>';
  window.icon = () => '';
  state.trialName = 'T';
  state.cast = [];
  state.scriptLines = [];
  state.minigames = [];
  state.truthBullets = [];
  // The failure counter lives at module scope; a success resets it.
  state.dirHandle = workingHandle();
  await flushAutoSave();
  await autoSaveTrial({ skipHistory: true });
  alertDialog.mockClear();
  confirmDialog.mockClear();
  confirmDialog.mockResolvedValue(false);
});

describe('a lost folder grant', () => {
  it('offers to reconnect rather than telling the author to retry', async () => {
    state.dirHandle = handleThatFailsWith(named('NotAllowedError'));
    await autoSaveTrial({ skipHistory: true });

    expect(confirmDialog).toHaveBeenCalledTimes(1);
    expect(confirmDialog.mock.calls[0][0].confirmLabel).toBe('Reconnect folder');
    // The old advice is what makes this case unrecoverable.
    expect(alertDialog).not.toHaveBeenCalled();
  });

  it('re-requests permission on the handle the editor already holds', async () => {
    const requestPermission = vi.fn(async () => 'granted');
    confirmDialog.mockResolvedValue(true);
    state.dirHandle = handleThatFailsWith(named('NotAllowedError'), { requestPermission });
    await autoSaveTrial({ skipHistory: true });

    expect(requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
  });

  it('does not loop when the grant is restored but the write still fails', async () => {
    // A granted permission that still cannot write used to retry forever: the
    // retry fails, the failure offers a reconnect, the reconnect retries.
    confirmDialog.mockResolvedValue(true);
    state.dirHandle = handleThatFailsWith(named('NotAllowedError'), {
      requestPermission: async () => 'granted',
    });
    await autoSaveTrial({ skipHistory: true });

    expect(confirmDialog).toHaveBeenCalledTimes(1);
    expect(alertDialog.mock.calls.some((c) => c[0].title === 'Still could not save')).toBe(true);
  });

  it('says so when the grant is still refused', async () => {
    confirmDialog.mockResolvedValue(true);
    state.dirHandle = handleThatFailsWith(named('NotAllowedError'), {
      requestPermission: async () => 'denied',
    });
    await autoSaveTrial({ skipHistory: true });

    expect(alertDialog.mock.calls.some((c) => c[0].title === 'Still no access')).toBe(true);
  });
});

describe('a full disk', () => {
  it('says the disk is full instead of blaming permissions', async () => {
    state.dirHandle = handleThatFailsWith(named('QuotaExceededError'));
    await autoSaveTrial({ skipHistory: true });

    const message = String(alertDialog.mock.calls[0][0].message);
    expect(message).toContain('full');
    expect(message).not.toContain('Check folder permissions');
  });
});

describe('a persistent failure', () => {
  it('speaks up again rather than going quiet forever', async () => {
    state.dirHandle = handleThatFailsWith(new Error('disk on fire'));
    await failTimes(state.dirHandle, 11);
    // Once at the first failure, once at the eleventh.
    expect(alertDialog).toHaveBeenCalledTimes(2);
  });

  it('does not alert on every keystroke in between', async () => {
    state.dirHandle = handleThatFailsWith(new Error('disk on fire'));
    await failTimes(state.dirHandle, 9);
    expect(alertDialog).toHaveBeenCalledTimes(1);
  });

  it('starts counting again after a save succeeds', async () => {
    state.dirHandle = handleThatFailsWith(new Error('disk on fire'));
    await autoSaveTrial({ skipHistory: true });
    expect(alertDialog).toHaveBeenCalledTimes(1);

    state.dirHandle = workingHandle();
    await autoSaveTrial({ skipHistory: true });

    state.dirHandle = handleThatFailsWith(new Error('disk on fire again'));
    await autoSaveTrial({ skipHistory: true });
    // A separate outage is news.
    expect(alertDialog).toHaveBeenCalledTimes(2);
  });
});
