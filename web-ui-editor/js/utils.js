// Small helpers with no home of their own: the loader overlay, the
// directory display, file-to-data-URL, time formatting, HTML escaping, id
// generation, and the highlight normaliser every preview and save runs
// through.
import { setHtml } from './ui/dom.js';
import { icon } from './ui/icons.js';
export function showLoader(on, text = '') {
  document.getElementById('loaderOverlay').classList.toggle('visible', !!on);
  const label = document.getElementById('loaderText');
  if (label) label.textContent = on ? text : '';
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    let fr = new FileReader();
    fr.onload = (_) => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

export function renderDirDisplay(dH, label) {
  const el = document.getElementById('dirDisplay');
  if (!el) return;
  setHtml(el, dH ? `${icon('folder', { size: 15 })} ${escapeHtml(label || dH.name)}` : '');
}

// Seconds as M:SS.
export function formatAudioTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Escape user text before injecting it into innerHTML previews.
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Returns the only shape previews, saves and the engine ever see: sorted,
// disjoint, clamped to the text.
//
// Ranges paint a per-character color map (later entries win), then re-emit as
// runs, so overlaps, stale ranges and bad indices cannot survive.
//
// startIndex/endIndex are the pre-4.0 spelling of startChar/endChar, read
// here so an older trial's highlights survive being opened. They appear
// nowhere else and are not written back - which is exactly why they read as
// dead defensive code and need this line to keep them from being deleted.
export function normalizeHighlights(highlights, textLength) {
  if (!Array.isArray(highlights) || textLength <= 0) return [];

  const colorAt = new Array(textLength).fill(null);
  for (const h of highlights) {
    if (!h || typeof h !== 'object') continue;
    const rawStart = Number(h.startChar ?? h.startIndex ?? 0);
    const rawEnd = Number(h.endChar ?? h.endIndex ?? 0);
    if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd)) continue;
    const start = Math.max(0, Math.min(textLength, Math.floor(rawStart)));
    const end = Math.max(0, Math.min(textLength, Math.floor(rawEnd)));
    const color =
      typeof h.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(h.color)
        ? h.color.toUpperCase()
        : '#FFFF00';
    for (let i = start; i < end; i++) colorAt[i] = color;
  }

  const out = [];
  let i = 0;
  while (i < textLength) {
    if (!colorAt[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < textLength && colorAt[j] === colorAt[i]) j++;
    out.push({ startChar: i, endChar: j, color: colorAt[i] });
    i = j;
  }
  return out;
}

// <prefix>_<timestamp>_<random>, the id format trial.json expects.
export function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
