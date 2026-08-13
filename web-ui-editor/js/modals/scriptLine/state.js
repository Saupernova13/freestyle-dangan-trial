// Shared working state for the script line modal and its tabs.
//
// Only one line is edited at a time, so a single `sl` object serves every
// tab. scriptLineModal.js resets it on open and close; the tabs mutate
// `sl.fields` and `sl.highlighting` directly.
import { state } from '../../core/state.js';

import { setHtml } from '../../ui/dom.js';
export const AUDIO_PREVIEW_KEY = 'script-line-modal';
export const DEFAULT_HIGHLIGHT_COLOR = '#FFFF00';
export const DEFAULT_CAMERA_MOTION = { type: 'none', duration: 1.0, easing: 'ease-in-out' };
export const DEFAULT_DIALOGUE_BOX_STYLE = {
  style: 'default',
  borderColor: '#FFFFFF',
  bgOpacity: 0.9,
  borderThickness: 2,
};
export const COLOR_REGEX = /^#[0-9a-fA-F]{6}$/i;

export const sl = {
  activeLineId: null,
  tab: 'sprite',
  err: '',
  msg: '',
  fields: {
    spriteIndex: null,
    audioFile: null,
    audioBlob: null,
    highlights: [],
    cameraMotion: { ...DEFAULT_CAMERA_MOTION },
    specialEffects: { effects: [] },
    dialogueBoxStyle: { ...DEFAULT_DIALOGUE_BOX_STYLE },
  },
  highlighting: {
    startChar: 0,
    endChar: 0,
    currentColor: DEFAULT_HIGHLIGHT_COLOR,
  },
};

// Loads the edit buffers from a freshly opened line.
export function resetFields(line) {
  sl.fields = {
    spriteIndex: line.spriteIndex ?? null,
    audioFile: line.audioFile || null,
    audioBlob: null,
    highlights: line.highlights ? [...line.highlights] : [],
    cameraMotion: line.cameraMotion || { ...DEFAULT_CAMERA_MOTION },
    specialEffects: line.specialEffects || { effects: [] },
    dialogueBoxStyle: line.dialogueBoxStyle || { ...DEFAULT_DIALOGUE_BOX_STYLE },
  };
  sl.highlighting = { startChar: 0, endChar: 0, currentColor: DEFAULT_HIGHLIGHT_COLOR };
}

export function activeLine() {
  return state.scriptLines.find((l) => l.id === sl.activeLineId);
}

// For inline edits: a full re-render would steal focus and reset scroll.
export function refreshTabBody(html) {
  const content = document.querySelector('.dr-modal-content');
  if (content) setHtml(content, html);
}
