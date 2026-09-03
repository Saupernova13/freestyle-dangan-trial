// @vitest-environment jsdom
//
// `file.size` was tested in exactly one place tree-wide: the script line's
// audio tab. Every minigame voice line - nonstop debate, mass panic, both
// sides of a scrum argument - went through validateAudioUpload, which checked
// only the MIME type. So the editor's one size limit covered one of the two
// ways to attach a clip, and an oversized one was written into the trial
// folder and then into every export from then on.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toasts = [];
vi.mock('../js/ui/dialogs.js', () => ({
  showToast: vi.fn((message, opts) => toasts.push({ message, opts })),
  alertDialog: vi.fn(async () => undefined),
  confirmDialog: vi.fn(async () => true),
  promptDialog: vi.fn(async () => ''),
}));

const { validateAudioUpload } = await import('../js/core/minigameAudio.js');
const { MAX_AUDIO_SIZE } = await import('../js/core/constants.js');

function uploadEvent(file) {
  return { target: { files: file ? [file] : [], value: 'C:\\fakepath\\clip.wav' } };
}

function audioFile(size, type = 'audio/wav') {
  return { name: 'clip.wav', type, size };
}

beforeEach(() => {
  toasts.length = 0;
});

describe('a minigame voice line upload', () => {
  it('accepts an audio file within the cap', () => {
    const file = audioFile(MAX_AUDIO_SIZE - 1);
    expect(validateAudioUpload(uploadEvent(file))).toBe(file);
    expect(toasts).toEqual([]);
  });

  it('accepts one exactly at the cap', () => {
    const file = audioFile(MAX_AUDIO_SIZE);
    expect(validateAudioUpload(uploadEvent(file))).toBe(file);
  });

  it('rejects one over the cap and says why', () => {
    const event = uploadEvent(audioFile(MAX_AUDIO_SIZE + 1));
    expect(validateAudioUpload(event)).toBeNull();
    expect(toasts[0].message).toContain('too large');
    // The input is cleared, or the file stays staged in a control the author
    // has already been told is invalid.
    expect(event.target.value).toBe('');
  });

  it('still rejects a file that is not audio', () => {
    const event = uploadEvent({ name: 'x.png', type: 'image/png', size: 10 });
    expect(validateAudioUpload(event)).toBeNull();
    expect(toasts[0].message).toContain('audio file');
  });

  it('returns null for no file at all', () => {
    expect(validateAudioUpload(uploadEvent(null))).toBeNull();
    expect(toasts).toEqual([]);
  });

  it('is the same cap the script line tab enforces', async () => {
    // One constant, two upload paths. They were separate numbers in separate
    // files, which is how one of them came to be the only one.
    const { readFileSync } = await import('node:fs');
    const { dirname, join, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    for (const file of ['js/modals/scriptLine/audioTab.js', 'js/core/minigameAudio.js']) {
      const source = readFileSync(join(root, file), 'utf8');
      expect(source).toContain("MAX_AUDIO_SIZE } from");
      expect(source).not.toMatch(/MAX_AUDIO_SIZE = /);
    }
  });
});
