// @vitest-environment jsdom
//
// storage.js was never imported by any test at all (#53) - the whole
// persistence layer, including every path that can lose a trial. These cover
// the two the issue names: a save failure alerting once rather than on every
// keystroke, and an unparseable trial.json warning before the editor resets to
// empty and saves over it.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const alertDialog = vi.fn(async () => undefined);

vi.mock('../js/ui/dialogs.js', () => ({
  alertDialog,
  confirmDialog: vi.fn(async () => true),
  promptDialog: vi.fn(async () => ''),
  showToast: vi.fn(),
}));

const { state } = await import('../js/core/state.js');
const { autoSaveTrial, flushAutoSave } = await import('../js/core/storage.js');

function writableHandle() {
  return {
    name: 'ok',
    getFileHandle: async () => ({
      createWritable: async () => ({ write: async () => {}, close: async () => {} }),
    }),
  };
}

function failingHandle() {
  return {
    name: 'read-only',
    getFileHandle: async () => {
      throw new Error('permission denied');
    },
  };
}

beforeEach(async () => {
  document.body.innerHTML = '<div id="saveStatus"></div>';
  window.icon = () => '';
  state.dirHandle = writableHandle();
  state.trialName = 'T';
  state.cast = [];
  state.scriptLines = [];
  state.minigames = [];
  state.truthBullets = [];
  // storage.js keeps its timer, dirty flag and "already told them" latch at
  // module scope, and only a successful save clears the latch - so reset it
  // with one rather than leaving each test at the mercy of run order.
  await flushAutoSave();
  await autoSaveTrial({ skipHistory: true });
  alertDialog.mockClear();
});

describe('a failing auto-save', () => {
  it('alerts once, not on every subsequent attempt', async () => {
    state.dirHandle = failingHandle();
    await autoSaveTrial({ skipHistory: true });
    await autoSaveTrial({ skipHistory: true });
    await autoSaveTrial({ skipHistory: true });

    // Alerting per keystroke would make the editor unusable exactly when the
    // author most needs to get their work out.
    expect(alertDialog).toHaveBeenCalledTimes(1);
  });

  it('says the changes are not saved', async () => {
    state.dirHandle = failingHandle();
    await autoSaveTrial({ skipHistory: true });
    expect(alertDialog.mock.calls[0][0].message).toContain('NOT saved');
  });

  it('alerts again after a save succeeds and a later one fails', async () => {
    state.dirHandle = failingHandle();
    await autoSaveTrial({ skipHistory: true });
    expect(alertDialog).toHaveBeenCalledTimes(1);

    state.dirHandle = writableHandle();
    await autoSaveTrial({ skipHistory: true });

    state.dirHandle = failingHandle();
    await autoSaveTrial({ skipHistory: true });
    // A second, separate failure is news; the latch must reset on success.
    expect(alertDialog).toHaveBeenCalledTimes(2);
  });

  it('leaves the status pill reporting the failure', async () => {
    state.dirHandle = failingHandle();
    await autoSaveTrial({ skipHistory: true });
    expect(document.getElementById('saveStatus').textContent).toContain('Save failed');
  });
});

describe('an unparseable trial.json', () => {
  // loadTrialIntoState resets to an empty trial when it cannot read the file,
  // and the next edit saves over it - so the warning is the only thing between
  // a corrupt file and a destroyed one.
  function openTrialWith(text) {
    state.dirHandle = {
      name: 'broken',
      values: async function* () {
        yield { name: 'trial.json', kind: 'file' };
      },
      getFileHandle: async () => ({ getFile: async () => ({ text: async () => text }) }),
      getDirectoryHandle: async () => {
        throw new Error('NotFoundError');
      },
    };
  }

  it('warns before the editor resets to empty', async () => {
    // showLoader and renderDirDisplay reach for these unconditionally.
    document.body.innerHTML =
      '<div id="saveStatus"></div><input id="trialNameInput"><div id="mainGrid"></div>' +
      '<div id="loaderOverlay"></div><div id="loaderText"></div><div id="dirDisplay"></div>' +
      '<div id="modalroot"></div><div id="dialogroot"></div><button id="exportBtn"></button>';
    openTrialWith('{ not json');

    const { openTrialFromHandle } = await import('../js/core/storage.js');
    await openTrialFromHandle(state.dirHandle);

    const warned = alertDialog.mock.calls.some((c) =>
      String(c[0].message).includes('trial.json could not be read')
    );
    expect(warned).toBe(true);
    // Reset to empty, as documented - but not silently.
    expect(state.scriptLines).toEqual([]);
  });
});
