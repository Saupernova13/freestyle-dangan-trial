// Shared audio preview player for the script line modal and the minigame
// editors. Players are registered under caller-chosen ids; callers supply
// their control ids and a lazy blob loader.
import { showToast } from '../ui/dialogs.js';
import { formatAudioTime } from '../utils.js';

import { setHtml } from '../ui/dom.js';
const players = {};

function setPlayButton(entry, isPlaying) {
  const btn = entry.opts.buttonId && document.getElementById(entry.opts.buttonId);
  if (btn)
    setHtml(btn, isPlaying ? `${window.icon('pause')} Pause` : `${window.icon('play')} Play`);
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

// opts:
//   getBlob       async () => Blob|null; may hit disk
//   buttonId      play/pause button to repaint
//   seekBarId, timeCurrentId, timeTotalId  optional
//   onError       (message) => void; defaults to an error toast
export async function toggleAudioPreview(key, opts) {
  const fail = (msg) => (opts.onError ? opts.onError(msg) : showToast(msg, { type: 'error' }));

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

// `percent` is 0-100.
export function seekAudioPreview(key, percent) {
  const entry = players[key];
  if (entry && entry.audio.duration) {
    entry.audio.currentTime = (percent / 100) * entry.audio.duration;
  }
}

export function isAudioPreviewPlaying(key) {
  const entry = players[key];
  return !!(entry && !entry.audio.paused);
}

// Call on modal close; also revokes the object URL.
export function stopAudioPreview(key) {
  const entry = players[key];
  if (!entry) return;
  entry.audio.pause();
  if (entry.audio.src) URL.revokeObjectURL(entry.audio.src);
  delete players[key];
}
