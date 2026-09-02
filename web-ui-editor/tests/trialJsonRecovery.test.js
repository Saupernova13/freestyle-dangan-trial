// @vitest-environment jsdom
//
// The try in loadTrialIntoState spanned sixty lines - the JSON.parse plus
// loadCharactersFromIds, loadMinigameAudio, loadTruthBulletImages, two
// alertDialog awaits and DOM writes - and its catch reported "trial.json
// could not be read" for every one of them, then called resetEmptyTrial()
// while leaving dirHandle set and pointing at a fully-populated file.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const alertDialog = vi.fn(async () => undefined);

vi.mock('../js/ui/dialogs.js', () => ({
  alertDialog,
  confirmDialog: vi.fn(async () => true),
  promptDialog: vi.fn(async () => ''),
  showToast: vi.fn(),
}));

const { state } = await import('../js/core/state.js');
const { openTrialFromHandle } = await import('../js/core/storage.js');

const VALID_TRIAL = {
  trialName: 'Real Trial',
  characters: ['ch_a'],
  script: { lines: [{ id: 'l1', type: 'narrator', text: 'It began.' }] },
  minigames: [],
  truthBullets: [],
  metadata: { version: '4.0' },
};

// `trialJson` is the bytes trial.json serves. `charactersError` is thrown by
// the Characters/ scan, which is inside the old try and outside the new one.
function handle({ trialJson }) {
  const written = new Map();
  return {
    written,
    name: 'trial',
    values: async function* () {
      yield { name: 'trial.json', kind: 'file' };
    },
    getFileHandle: async (name) => {
      if (name === 'trial.json') {
        return { getFile: async () => ({
          text: async () => trialJson,
          arrayBuffer: async () => new TextEncoder().encode(trialJson).buffer,
        }) };
      }
      return {
        createWritable: async () => ({
          write: async (bytes) => written.set(name, bytes),
          close: async () => {},
        }),
      };
    },
    getDirectoryHandle: async () => {
      throw new Error('NotFoundError');
    },
  };
}

function messages() {
  return alertDialog.mock.calls.map((c) => String(c[0].message));
}

beforeEach(() => {
  document.body.innerHTML =
    '<div id="saveStatus"></div><input id="trialNameInput"><div id="mainGrid"></div>' +
    '<div id="loaderOverlay"></div><div id="loaderText"></div><div id="dirDisplay"></div>' +
    '<div id="modalroot"></div><div id="dialogroot"></div><button id="exportBtn"></button>';
  window.icon = () => '';
  alertDialog.mockClear();
});

describe('a failure after the parse', () => {
  // The issue's own example: a missing #trialNameInput null-derefs at :78,
  // inside the old try. loadCharactersFromIds catches its own directory
  // errors, so that one never escaped - which is why the try's real reach was
  // easy to miss.
  function withoutTrialNameInput() {
    document.getElementById('trialNameInput').remove();
  }

  it('does not blame trial.json', async () => {
    withoutTrialNameInput();
    await openTrialFromHandle(handle({ trialJson: JSON.stringify(VALID_TRIAL) }));
    expect(messages().some((m) => m.includes('trial.json could not be read'))).toBe(false);
  });

  it('leaves the parsed trial in the editor rather than resetting to empty', async () => {
    withoutTrialNameInput();
    await openTrialFromHandle(handle({ trialJson: JSON.stringify(VALID_TRIAL) }));
    // trialName is what an autosave would have overwritten with ''.
    expect(state.trialName).toBe('Real Trial');
  });
});

describe('an unparseable trial.json', () => {
  it('still warns and opens empty', async () => {
    await openTrialFromHandle(handle({ trialJson: '{ not json' }));
    expect(messages().some((m) => m.includes('trial.json could not be read'))).toBe(true);
    expect(state.scriptLines).toEqual([]);
  });

  it('copies the original bytes aside before anything can overwrite them', async () => {
    const h = handle({ trialJson: '{ not json' });
    await openTrialFromHandle(h);
    const backups = [...h.written.keys()].filter((n) => n.startsWith('trial.json.corrupt-'));
    expect(backups).toHaveLength(1);
    expect(new TextDecoder().decode(h.written.get(backups[0]))).toBe('{ not json');
  });

  it('names the backup in the warning', async () => {
    const h = handle({ trialJson: '{ not json' });
    await openTrialFromHandle(h);
    expect(messages().some((m) => m.includes('trial.json.corrupt-'))).toBe(true);
  });
});
