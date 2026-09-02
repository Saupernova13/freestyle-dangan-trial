// @vitest-environment jsdom
//
// addTruthBullet pushed the new bullet into state BEFORE opening the modal,
// and closeTruthBulletModal only cleared the DOM. So clicking + Add Bullet and
// changing your mind left an unnamed bullet in state: persisted by the next
// autosave, present in every minigame's bullet picker, and tripping
// validateTrialForExport with "Truth bullet N has no name" at export time -
// with no obvious cause, since the author believes they cancelled.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../js/ui/dialogs.js', () => ({
  alertDialog: vi.fn(async () => undefined),
  confirmDialog: vi.fn(async () => true),
  promptDialog: vi.fn(async () => ''),
  showToast: vi.fn(),
}));
vi.mock('../js/core/storage.js', () => ({ autoSaveTrial: vi.fn(async () => {}) }));
vi.mock('../js/components/floatingAddButton.js', () => ({ updateFloatingAddButton: vi.fn() }));

const { state } = await import('../js/core/state.js');
const { addTruthBullet } = await import('../js/views/truthBulletsView.js');
const modal = await import('../js/modals/truthBulletModal.js');

beforeEach(() => {
  document.body.innerHTML =
    '<div id="modalroot"></div><div id="mainGrid"></div>' +
    '<div id="loaderOverlay"></div><div id="loaderText"></div>';
  window.icon = () => '';
  state.dirHandle = { name: 'trial' };
  state.minigames = [];
  state.truthBullets = [];
  state.selectedTruthBulletId = null;
});

describe('cancelling out of Add Bullet', () => {
  it('leaves no bullet behind', () => {
    addTruthBullet();
    expect(state.truthBullets).toHaveLength(1);

    modal.closeTruthBulletModal();
    expect(state.truthBullets).toEqual([]);
  });

  it('does not leave the selection pointing at a bullet that is gone', () => {
    state.truthBullets = [{ bulletId: 'tb_old', name: 'Knife' }];
    state.selectedTruthBulletId = 'tb_old';
    addTruthBullet();
    modal.closeTruthBulletModal();

    expect(state.truthBullets.map((b) => b.bulletId)).toEqual(['tb_old']);
    expect(state.selectedTruthBulletId).toBe('tb_old');
  });

  it('keeps a new bullet the author actually named and saved', async () => {
    state.dirHandle = { name: 'trial', getDirectoryHandle: async () => ({}) };
    addTruthBullet();
    modal.updateBulletField('name', 'Knife');
    await modal.saveTruthBullet();

    expect(state.truthBullets).toHaveLength(1);
    expect(state.truthBullets[0].name).toBe('Knife');
  });
});

describe('cancelling out of an existing bullet', () => {
  it('never removes it, however blank it is', () => {
    // A bullet already in the trial is the author's, even unnamed - only the
    // placeholder this modal created is the modal's to take back.
    state.truthBullets = [{ bulletId: 'tb_1', name: '' }];
    modal.openTruthBulletModal('tb_1');
    modal.closeTruthBulletModal();
    expect(state.truthBullets).toHaveLength(1);
  });
});
