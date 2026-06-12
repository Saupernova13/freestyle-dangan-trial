// Shared audio preview player.
//
// Four places in the editor preview voice audio (the script line modal and
// three minigame editors); each used to maintain its own Audio element,
// play/pause toggle, seek bar sync, and button repaint. This component owns
// a registry of players keyed by caller-chosen ids; callers supply the DOM
// ids of their controls and a lazy blob loader.
import { formatAudioTime } from '../utils.js';

const players = {};

function setPlayButton(entry, isPlaying) {
  const btn = entry.opts.buttonId && document.getElementById(entry.opts.buttonId);
  if (btn) btn.innerHTML = isPlaying ? '⏸️ Pause' : '▶️ Play';
}

function updateSeekDisplay(entry) {
  const { seekBarId, timeCurrentId, timeTotalId } = entry.opts;
  if (!seekBarId) return;

  const seekBar = document.getElementById(seekBarId);
  const currentEl = document.getElementById(timeCurrentId);
  const totalEl = document.getElementById(timeTotalId);
  if (!seekBar || !currentEl || !totalEl) return;

  const { currentTime, duration } = entry.audio;
  seekBar.value = duration > 0 ? (currentTime / duration) * 100 : 0;
  currentEl.textContent = formatAudioTime(currentTime);
  totalEl.textContent = formatAudioTime(duration || 0);
}

// Toggle playback for the player identified by `key`.
// opts:
//   getBlob       async () => Blob|null - lazy audio source (may hit disk)
//   buttonId      id of the play/pause button to repaint
//   seekBarId, timeCurrentId, timeTotalId  optional seek-bar control ids
//   onError       optional (message) => void; defaults to alert()
export async function toggleAudioPreview(key, opts) {
  const fail = (msg) => (opts.onError ? opts.onError(msg) : alert(msg));

  const existing = players[key];
  if (existing && !existing.audio.paused) {
    existing.audio.pause();
    existing.audio.currentTime = 0;
    setPlayButton(existing, false);
    return;
  }

  let blob;
  try {
    blob = await opts.getBlob();
  } catch (e) {
    fail(`Error loading audio: ${e.message}`);
    return;
  }
  if (!blob) {
    fail('Failed to load audio file');
    return;
  }

  let entry = players[key];
  if (!entry) {
    const audio = new Audio();
    entry = players[key] = { audio, opts };
    audio.onended = () => {
      setPlayButton(entry, false);
      URL.revokeObjectURL(audio.src);
    };
    audio.onerror = () => {
      setPlayButton(entry, false);
      (entry.opts.onError || alert)('Audio playback error');
    };
    audio.ontimeupdate = () => updateSeekDisplay(entry);
    audio.onloadedmetadata = () => updateSeekDisplay(entry);
  } else {
    entry.opts = opts; // refresh control ids after re-renders
  }

  try {
    entry.audio.src = URL.createObjectURL(blob);
    await entry.audio.play();
    setPlayButton(entry, true);
    updateSeekDisplay(entry);
  } catch (e) {
    fail(`Failed to play audio: ${e.message}`);
  }
}

// Seek the player identified by `key` to `percent` (0-100).
export function seekAudioPreview(key, percent) {
  const entry = players[key];
  if (entry && entry.audio.duration) {
    entry.audio.currentTime = (percent / 100) * entry.audio.duration;
  }
}

// True while the player identified by `key` is actively playing.
export function isAudioPreviewPlaying(key) {
  const entry = players[key];
  return !!(entry && !entry.audio.paused);
}

// Stop and dispose the player identified by `key` (e.g. on modal close).
export function stopAudioPreview(key) {
  const entry = players[key];
  if (!entry) return;
  entry.audio.pause();
  if (entry.audio.src) URL.revokeObjectURL(entry.audio.src);
  delete players[key];
}
