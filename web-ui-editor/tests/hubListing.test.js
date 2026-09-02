// @vitest-environment jsdom
//
// "Zero trials" and "I could not read the trial directory" rendered
// identically - nothing at all, not even an empty state. Every trial the user
// had ever made looked gone, and the obvious responses (create a new trial,
// clear site data to "fix" it) are the two that actually destroy the work.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listOpfsTrialFolders = vi.fn();
const readOpfsFileText = vi.fn(async () => null);

vi.mock('../js/core/opfs.js', () => ({
  listOpfsTrialFolders,
  readOpfsFileText,
  supportsOpfs: () => true,
  supportsFsPicker: () => false,
  createOpfsTrial: vi.fn(),
  deleteOpfsTrial: vi.fn(),
  getOpfsTrial: vi.fn(),
  opfsCanWrite: vi.fn(async () => true),
  checkOpfsWritable: vi.fn(async () => ({ ok: true, reason: '' })),
  uniqueDirectoryName: vi.fn(),
  OPFS_UNSUPPORTED: 'unsupported',
  OPFS_QUOTA: 'quota',
  OPFS_ERROR: 'error',
}));

const { populateHubTrials } = await import('../js/views/viewManager.js');

beforeEach(() => {
  document.body.innerHTML = '<div id="hubTrials"></div>';
  window.icon = () => '';
  vi.clearAllMocks();
  readOpfsFileText.mockResolvedValue(null);
});

function hub() {
  return document.getElementById('hubTrials');
}

describe('populateHubTrials', () => {
  it('renders nothing when there genuinely are no trials', async () => {
    listOpfsTrialFolders.mockResolvedValue([]);
    await populateHubTrials();
    expect(hub().innerHTML).toBe('');
  });

  it('says storage could not be read when the listing fails', async () => {
    const err = new Error('nope');
    err.name = 'NotAllowedError';
    listOpfsTrialFolders.mockRejectedValue(err);
    await populateHubTrials();

    expect(hub().textContent).toContain('Could not read browser storage');
    // The name is what lets a bug report say which failure it was.
    expect(hub().textContent).toContain('NotAllowedError');
  });

  it('tells the user their trials are probably still there', async () => {
    // Without this the user reaches for the two actions that destroy the work.
    listOpfsTrialFolders.mockRejectedValue(new Error('nope'));
    await populateHubTrials();

    expect(hub().textContent).toContain('still there');
    expect(hub().textContent).toContain('reload');
  });

  it('does not render the failure as an empty hub', async () => {
    listOpfsTrialFolders.mockRejectedValue(new Error('nope'));
    await populateHubTrials();
    expect(hub().innerHTML).not.toBe('');
  });

  it('still lists trials when the call succeeds', async () => {
    listOpfsTrialFolders.mockResolvedValue(['my_trial']);
    readOpfsFileText.mockResolvedValue('{"trialName":"My Trial"}');
    await populateHubTrials();

    expect(hub().textContent).toContain('My Trial');
    expect(hub().textContent).not.toContain('Could not read');
  });
});
