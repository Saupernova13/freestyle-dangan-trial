// Utility functions
function showLoader(on) {
  document.getElementById('loaderOverlay').classList.toggle('visible', !!on);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    let fr = new FileReader();
    fr.onload = _ => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function renderDirDisplay(dH) {
  document.getElementById('dirDisplay').innerText = dH ? `📂 ${dH.name}` : "";
}

// Escape user text before injecting it into innerHTML previews.
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Normalize dialogue highlight ranges into the only shape previews, saves,
// and the engine should ever see: sorted, disjoint, clamped to the text.
//
// Ranges are painted onto a per-character color map (later entries win,
// exactly like going over text again with a highlighter) and re-emitted as
// runs. This makes overlapping selections, stale ranges left behind by a
// dialogue edit, out-of-bounds indices, and malformed colors all impossible
// to persist — the data is repaired at every boundary it passes through.
function normalizeHighlights(highlights, textLength) {
  if (!Array.isArray(highlights) || textLength <= 0) return [];

  const colorAt = new Array(textLength).fill(null);
  for (const h of highlights) {
    if (!h || typeof h !== 'object') continue;
    const rawStart = Number(h.startChar ?? h.startIndex ?? 0);
    const rawEnd = Number(h.endChar ?? h.endIndex ?? 0);
    if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd)) continue;
    const start = Math.max(0, Math.min(textLength, Math.floor(rawStart)));
    const end = Math.max(0, Math.min(textLength, Math.floor(rawEnd)));
    const color = (typeof h.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(h.color))
      ? h.color.toUpperCase()
      : '#FFFF00';
    for (let i = start; i < end; i++) colorAt[i] = color;
  }

  const out = [];
  let i = 0;
  while (i < textLength) {
    if (!colorAt[i]) { i++; continue; }
    let j = i;
    while (j < textLength && colorAt[j] === colorAt[i]) j++;
    out.push({ startChar: i, endChar: j, color: colorAt[i] });
    i = j;
  }
  return out;
}