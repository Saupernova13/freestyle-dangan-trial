// @vitest-environment jsdom
//
// The modal writes its edits into a bulletFields buffer and commits on save -
// except the image preview, which was written straight onto the live
// state.truthBullets entry. So Remove Image followed by Cancel left the bullet
// with a null imageDataURL and its imageFile intact, and
// renderTruthBulletDetail computes `hasImage = imageFile && imageDataURL` -
// the detail pane and the nonstop-debate bullet picker both showed a
// placeholder for a bullet whose image was still on disk and still exported.
// It stayed wrong until the trial was reopened.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../js/ui/dialogs.js', () => ({
  alertDialog: vi.fn(async () => undefined),
  confirmDialog: vi.fn(async () => true),
  promptDialog: vi.fn(async () => ''),
  showToast: vi.fn(),
}));
vi.mock('../js/core/storage.js', () => ({ autoSaveTrial: vi.fn(async () => {}) }));
vi.mock('../js/views/truthBulletsView.js', () => ({ renderTruthBulletsView: vi.fn() }));

const { state } = await import('../js/core/state.js');
const modal = await import('../js/modals/truthBulletModal.js');

const DATA_URL = 'data:image/png;base64,AAAA';

beforeEach(() => {
  document.body.innerHTML =
    '<div id="modalroot"></div><div id="loaderOverlay"></div><div id="loaderText"></div>';
  window.icon = () => '';
  state.dirHandle = { name: 'trial' };
  state.truthBullets = [
    {
      bulletId: 'tb_1',
      name: 'Knife',
      description: 'Bloody',
      imageFile: 'tb_1.png',
      imageDataURL: DATA_URL,
      inversedLieBulletName: '',
    },
  ];
});

describe('cancelling after Remove Image', () => {
  it('leaves the live bullet untouched', () => {
    modal.openTruthBulletModal('tb_1');
    modal.clearBulletImage();
    modal.closeTruthBulletModal();

    const bullet = state.truthBullets[0];
    expect(bullet.imageFile).toBe('tb_1.png');
    expect(bullet.imageDataURL).toBe(DATA_URL);
  });

  it('still clears the preview inside the modal', () => {
    modal.openTruthBulletModal('tb_1');
    modal.clearBulletImage();
    // The modal shows the empty state; only the buffer changed.
    expect(document.getElementById('modalroot').textContent).toContain('No image uploaded');
  });
});

describe('cancelling after typing', () => {
  it('discards the edits, as it always did for the text fields', () => {
    modal.openTruthBulletModal('tb_1');
    modal.updateBulletField('name', 'Something else');
    modal.closeTruthBulletModal();
    expect(state.truthBullets[0].name).toBe('Knife');
  });
});

describe('saving after Remove Image', () => {
  it('commits the removal', async () => {
    const removed = [];
    state.dirHandle = {
      name: 'trial',
      getDirectoryHandle: async () => ({ removeEntry: async (n) => removed.push(n) }),
    };
    modal.openTruthBulletModal('tb_1');
    modal.clearBulletImage();
    await modal.saveTruthBullet();

    expect(state.truthBullets[0].imageFile).toBeNull();
    expect(state.truthBullets[0].imageDataURL).toBeNull();
    expect(removed).toEqual(['tb_1.png']);
  });
});

describe('an unreadable image', () => {
  it('reports it instead of leaving a blank preview', async () => {
    modal.openTruthBulletModal('tb_1');
    // FileReader on a jsdom object that is not a Blob rejects, which is the
    // failure the bare reader had no onerror for.
    await modal.handleBulletImageUpload({
      target: { files: [{ name: 'broken.png', type: 'image/png' }] },
    });
    expect(document.getElementById('modalroot').textContent).toContain('Could not read');
  });
});
