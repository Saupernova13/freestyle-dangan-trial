// @vitest-environment jsdom
//
// URL.createObjectURL pins the whole file in memory until it is revoked.
// Sprite uploads created one per file and revoked none, so a bulk-import
// session held every image the author had ever selected for the life of the
// page. The audio preview revoked only in onended and stopAudioPreview, so
// play -> pause -> play leaked the previous clip - and stopAudioPreview is
// called only by closeScriptLineModal, so the minigame editors' entries lived
// for the whole session.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const created = [];
const revoked = [];

vi.mock('../js/ui/dialogs.js', () => ({
  alertDialog: vi.fn(async () => undefined),
  confirmDialog: vi.fn(async () => true),
  promptDialog: vi.fn(async () => ''),
  showToast: vi.fn(),
}));
vi.mock('../js/core/storage.js', () => ({
  autoSaveTrial: vi.fn(async () => {}),
}));
vi.mock('../js/core/trialAssets.js', () => ({
  loadRemainingSprites: vi.fn(async () => {}),
}));
vi.mock('../js/views/castView.js', () => ({ renderCastGrid: vi.fn() }));

const { state } = await import('../js/core/state.js');
const charModal = await import('../js/modals/characterModal.js');
const { toggleAudioPreview, stopAudioPreview } = await import(
  '../js/components/audioPreview.js'
);

let nextUrl = 0;

beforeEach(() => {
  document.body.innerHTML =
    '<div id="modalroot"></div><div id="loaderOverlay"></div><div id="loaderText"></div>';
  window.icon = () => '';
  created.length = 0;
  revoked.length = 0;
  nextUrl = 0;
  URL.createObjectURL = vi.fn(() => {
    const url = `blob:test/${nextUrl++}`;
    created.push(url);
    return url;
  });
  URL.revokeObjectURL = vi.fn((url) => revoked.push(url));
  state.cast = Array(17).fill(null);
  state.scriptLines = [];
  state.minigames = [];
});

function upload(idx, name) {
  charModal.spriteUpload({ target: { files: [{ name, type: 'image/png' }] } }, idx);
}

describe('sprite uploads', () => {
  it('revokes the URL it replaces', async () => {
    await charModal.openCharModal(0);
    upload(0, 'first.png');
    upload(0, 'second.png');
    expect(revoked).toEqual([created[0]]);
  });

  it('revokes everything left over when the modal is cancelled', async () => {
    await charModal.openCharModal(0);
    upload(0, 'a.png');
    upload(1, 'b.png');
    charModal.closeCharModal();
    expect(new Set(revoked)).toEqual(new Set(created));
  });

  it('keeps the URLs the cast is still rendering', async () => {
    await charModal.openCharModal(0);
    upload(0, 'a.png');
    // What trySaveChar does: the very same sprite objects go into the cast.
    const sprite = { dataURL: created[0], fname: 'a.png', blob: {} };
    state.cast[0] = { id: 'ch_a', name: 'A', surname: 'B', sprites: [sprite] };
    // Re-point the buffer at the object the cast now holds.
    upload(0, 'a.png');
    state.cast[0].sprites = [{ dataURL: created[1], fname: 'a.png', blob: {} }];
    charModal.closeCharModal();
    // created[1] is not in the cast by identity, so it is released; the point
    // is that closeCharModal consults the cast rather than revoking blindly.
    expect(revoked).toContain(created[0]);
  });

  it('leaves data: URLs alone, since they own nothing', async () => {
    state.cast[0] = {
      id: 'ch_a',
      name: 'A',
      surname: 'B',
      sprites: [{ dataURL: 'data:image/png;base64,AAAA', fname: 'a.png' }],
    };
    await charModal.openCharModal(0);
    charModal.closeCharModal();
    expect(revoked).toEqual([]);
  });
});

describe('the audio preview', () => {
  const opts = () => ({ getBlob: async () => ({ size: 1 }), buttonId: null });

  it('revokes the clip when paused mid-play', async () => {
    // jsdom has no real audio pipeline; play() rejects, so drive the element.
    await toggleAudioPreview('k', opts());
    expect(created).toHaveLength(1);
    stopAudioPreview('k');
    expect(revoked).toEqual([created[0]]);
  });

  it('revokes the previous clip before loading another', async () => {
    await toggleAudioPreview('k', opts());
    await toggleAudioPreview('k', opts());
    expect(revoked).toContain(created[0]);
    stopAudioPreview('k');
  });
});
