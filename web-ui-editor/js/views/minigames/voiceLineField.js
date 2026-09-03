// The voice line upload/preview field shared by nonstop debate's dialogue
// lines and mass panic's speaker lines.
//
// The two editors held the same 45 lines of markup, differing only in the id
// expression and the handler prefix. The four element ids are also spelled a
// second time in each editor's toggleAudioPreview() options, so the scheme
// lived in four places and a change had to land in all of them or the play
// button, the seek bar and the two clocks would quietly stop updating.
//
// voiceLineElementIds() is now the single spelling: the markup and the preview
// options both read it, so they cannot drift.
//
// Debate scrum deliberately does not use this. Its compact audio-preview-mini
// widget has no seek bar, and forcing both into one helper would make both
// worse.
import { escapeHtml } from '../../utils.js';
import { icon } from '../../ui/icons.js';

export function voiceLineElementIds(idBase) {
  return {
    buttonId: `voice-play-btn-${idBase}`,
    seekBarId: `voice-seek-bar-${idBase}`,
    timeCurrentId: `voice-time-current-${idBase}`,
    timeTotalId: `voice-time-total-${idBase}`,
  };
}

// `onSeek`, `onPlay`, `onClear` and `onUpload` are inline handler expressions,
// because that is how the editor wires everything it renders. Each is the
// whole call, so the caller decides what it passes - `this.value` for the seek
// bar, `event` for the file input.
export function renderVoiceLineField({ fileName, idBase, onPlay, onSeek, onClear, onUpload }) {
  if (!fileName) {
    return `
      <div class="audio-empty">
        <p>No audio file uploaded</p>
      </div>
      <input type="file" accept="audio/*" onchange="${onUpload}">
    `;
  }

  const { buttonId, seekBarId, timeCurrentId, timeTotalId } = voiceLineElementIds(idBase);
  return `
    <div class="audio-preview">
      <div class="audio-info">
        <span class="audio-icon">${icon('music', { size: 16 })}</span>
        <span class="audio-filename">${escapeHtml(fileName)}</span>
      </div>

      <div class="audio-seek-container">
        <span class="audio-time-current" id="${timeCurrentId}">0:00</span>
        <input type="range"
               class="audio-seek-bar"
               id="${seekBarId}"
               min="0"
               max="100"
               value="0"
               oninput="${onSeek}">
        <span class="audio-time-total" id="${timeTotalId}">0:00</span>
      </div>

      <div class="audio-controls">
        <button class="btn btn-secondary" id="${buttonId}" onclick="${onPlay}">
          ${icon('play')} Play
        </button>
        <button class="btn btn-secondary" onclick="${onClear}">
          ${icon('trash')} Remove
        </button>
      </div>
    </div>
  `;
}
