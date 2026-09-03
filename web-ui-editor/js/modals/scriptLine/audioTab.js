// Audio tab: attach, preview, and clear a dialogue line's voice clip.
import {
  isAudioPreviewPlaying,
  seekAudioPreview,
  toggleAudioPreview,
} from '../../components/audioPreview.js';
import { icon } from '../../ui/icons.js';
import { state } from '../../core/state.js';
import { MAX_AUDIO_SIZE } from '../../core/constants.js';
import { escapeHtml } from '../../utils.js';
import { AUDIO_PREVIEW_KEY, sl } from './state.js';
import { renderScriptLineModal, failField } from '../scriptLineModal.js';
import { registerActions } from '../../ui/actions.js';

registerActions('click', {
  playAudioPreview: () => playAudioPreview(),
  clearAudio: () => clearAudio(),
  triggerAudioInput: () => triggerAudioInput(),
});

registerActions('input', { seekAudio: (el) => seekAudio(el.value) });
registerActions('change', { handleAudioUpload: (el, event) => handleAudioUpload(event) });

export function renderAudioUploadTab() {
  const hasAudio = sl.fields.audioFile !== null;

  return `
    <div class="dr-form">
      <h3>Audio Playback</h3>
      <p style="color: var(--text-tertiary); margin-bottom: 1rem;">
        Upload an audio file for this dialogue line (optional).
      </p>

      ${
        hasAudio
          ? `
        <div class="audio-preview">
          <div class="audio-info">
            <span class="audio-icon">${icon('music', { size: 16 })}</span>
            <span class="audio-filename">${escapeHtml(sl.fields.audioFile || 'audio.mp3')}</span>
          </div>

          <div class="audio-seek-container">
            <span class="audio-time-current" id="audio-time-current">0:00</span>
            <input type="range"
                   class="audio-seek-bar"
                   id="audio-seek-bar"
                   min="0"
                   max="100"
                   value="0"
                   data-on-input="seekAudio">
            <span class="audio-time-total" id="audio-time-total">0:00</span>
          </div>

          <div class="audio-controls">
            <button class="btn btn-secondary" id="audio-play-btn" data-on-click="playAudioPreview">${isAudioPreviewPlaying(AUDIO_PREVIEW_KEY) ? `${icon('pause')} Pause` : `${icon('play')} Play`}</button>
            <button class="btn btn-secondary" data-on-click="clearAudio">${icon('trash')} Remove</button>
          </div>
        </div>
      `
          : `
        <div class="audio-empty">
          <p>No audio file uploaded</p>
        </div>
      `
      }

      <input type="file" accept="audio/*" id="audioFileInput"
             data-on-change="handleAudioUpload" style="display: none;">
      <button class="btn btn-primary" data-on-click="triggerAudioInput">
        ${icon('upload')} ${hasAudio ? 'Replace' : 'Upload'} Audio
      </button>
    </div>
  `;
}

export function triggerAudioInput() {
  document.getElementById('audioFileInput').click();
}

export function handleAudioUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('audio/')) {
    failField('Please select a valid audio file (mp3, wav, ogg, etc.)');
    return;
  }

  if (file.size > MAX_AUDIO_SIZE) {
    failField(`Audio file is too large. Maximum size is ${MAX_AUDIO_SIZE / (1024 * 1024)}MB.`);
    return;
  }

  sl.fields.audioFile = file.name;
  sl.fields.audioBlob = file;
  sl.err = '';
  sl.msg = `Loaded audio: ${escapeHtml(file.name)} (${(file.size / 1024).toFixed(2)} KB)`;
  renderScriptLineModal();
}

export function clearAudio() {
  sl.fields.audioFile = null;
  sl.fields.audioBlob = null;
  renderScriptLineModal();
}

export async function loadAudioFileFromDisk(filename) {
  try {
    const audioDir = await state.dirHandle.getDirectoryHandle('Audio', { create: false });
    const fileHandle = await audioDir.getFileHandle(filename);
    return await fileHandle.getFile();
  } catch (error) {
    console.error('Error loading audio file:', error);
    return null;
  }
}

export async function playAudioPreview() {
  await toggleAudioPreview(AUDIO_PREVIEW_KEY, {
    buttonId: 'audio-play-btn',
    seekBarId: 'audio-seek-bar',
    timeCurrentId: 'audio-time-current',
    timeTotalId: 'audio-time-total',
    onError: (msg) => {
      failField(msg);
    },
    getBlob: async () => {
      if (!sl.fields.audioBlob && sl.fields.audioFile) {
        sl.fields.audioBlob = await loadAudioFileFromDisk(sl.fields.audioFile);
      }
      return sl.fields.audioBlob;
    },
  });
}

export function seekAudio(value) {
  seekAudioPreview(AUDIO_PREVIEW_KEY, value);
}
