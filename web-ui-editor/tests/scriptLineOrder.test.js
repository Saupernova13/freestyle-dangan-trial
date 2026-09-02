// @vitest-environment jsdom
//
// The engine plays script lines in `order` only when every line has one - a
// partial order has no ordering to honour, since the missing entries all
// coerce to 0. The editor renumbers on every reorder and on every new line,
// but a legacy trial opened and saved unchanged used to keep whatever it
// arrived with, so the field the engine now reads could still be incomplete.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../js/ui/dialogs.js', () => ({
  alertDialog: vi.fn(async () => undefined),
  confirmDialog: vi.fn(async () => true),
  promptDialog: vi.fn(async () => ''),
  showToast: vi.fn(),
}));

const { state } = await import('../js/core/state.js');
const { openTrialFromHandle } = await import('../js/core/storage.js');

function handleServing(trial) {
  return {
    name: 'trial',
    values: async function* () {
      yield { name: 'trial.json', kind: 'file' };
    },
    getFileHandle: async () => ({
      getFile: async () => ({ text: async () => JSON.stringify(trial) }),
      createWritable: async () => ({ write: async () => {}, close: async () => {} }),
    }),
    getDirectoryHandle: async () => {
      throw new Error('NotFoundError');
    },
  };
}

function trialWithLines(lines) {
  return {
    trialName: 'T',
    characters: [],
    script: { lines },
    minigames: [],
    truthBullets: [],
    metadata: { version: '4.0' },
  };
}

beforeEach(() => {
  document.body.innerHTML =
    '<div id="saveStatus"></div><input id="trialNameInput"><div id="mainGrid"></div>' +
    '<div id="loaderOverlay"></div><div id="loaderText"></div><div id="dirDisplay"></div>' +
    '<div id="modalroot"></div><div id="dialogroot"></div><button id="exportBtn"></button>';
  window.icon = () => '';
});

describe('opening a trial', () => {
  it('numbers script lines that arrived without an order', async () => {
    const handle = handleServing(
      trialWithLines([
        { id: 'a', type: 'narrator', text: 'one' },
        { id: 'b', type: 'narrator', text: 'two' },
        { id: 'c', type: 'narrator', text: 'three' },
      ])
    );
    await openTrialFromHandle(handle);
    expect(state.scriptLines.map((l) => l.order)).toEqual([0, 1, 2]);
  });

  it('renumbers a partial order to match the displayed sequence', async () => {
    // The editor shows file order, so the numbers have to agree with it -
    // keeping the authored 7 would put this line last in the engine and
    // second in the editor.
    const handle = handleServing(
      trialWithLines([
        { id: 'a', type: 'narrator', text: 'one' },
        { id: 'b', type: 'narrator', text: 'two', order: 7 },
      ])
    );
    await openTrialFromHandle(handle);
    expect(state.scriptLines.map((l) => l.order)).toEqual([0, 1]);
  });

  it('leaves the lines themselves in file order', async () => {
    const handle = handleServing(
      trialWithLines([
        { id: 'c', type: 'narrator', text: 'three' },
        { id: 'a', type: 'narrator', text: 'one' },
      ])
    );
    await openTrialFromHandle(handle);
    expect(state.scriptLines.map((l) => l.id)).toEqual(['c', 'a']);
  });
});
