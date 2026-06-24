// Inline SVG icon set for the Class Trial editor.
//
// Replaces the previous emoji-as-icons. Every glyph is monochrome and
// stroke-based, drawn on a 24x24 grid and inheriting `currentColor`, so an
// icon picks up the text color of whatever it sits in (a magenta button, a
// muted label, a red delete control) with no per-icon coloring.
//
// Following this project's existing pattern (inline `onclick` handlers
// resolve through the global scope), `icon` is published on `window` so the
// template-string markup in the view/modal modules can call it without each
// module having to import it. Static markup in index.html inlines the SVG
// directly instead.

const PATHS = {
  // --- chrome / navigation ---
  users:
    '<path d="M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 19v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  script: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4"/><path d="M8 13h8M8 17h8M8 9h3"/>',
  target:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  gamepad:
    '<rect x="2" y="6" width="20" height="12" rx="5"/><path d="M7 12h4M9 10v4"/><circle cx="16" cy="11" r="1"/><circle cx="18.5" cy="13.5" r="1"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',

  // --- actions ---
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  export:
    '<path d="M21 8v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8"/><path d="m3 8 9-5 9 5"/><path d="M12 3v11"/><path d="m9 11 3 3 3-3"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash:
    '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  // disclosure / reorder carets -- replace the last ASCII triangle glyphs
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  chevronUp: '<path d="m6 15 6-6 6 6"/>',
  play: '<path d="M6 4l14 8-14 8z"/>',
  pause: '<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  upload:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M19 5a9 9 0 0 1 0 14M16 8a5 5 0 0 1 0 8"/>',
  warning:
    '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/>',

  // --- character / minigame meta ---
  crown: '<path d="M3 6l4 4 5-6 5 6 4-4v11H3z"/><path d="M3 20h18"/>',
  cap: '<path d="M22 9 12 5 2 9l10 4 10-4z"/><path d="M6 11v5c0 1 2.7 3 6 3s6-2 6-3v-5"/>',
  megaphone:
    '<path d="M3 11v2a1 1 0 0 0 1 1h2l9 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M18 8a4 4 0 0 1 0 8"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/>',

  // --- script-line modal tabs ---
  sprite:
    '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="9" r="3"/><path d="M6 19a6 6 0 0 1 12 0"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  highlight: '<path d="m9 11-6 6v3h3l6-6"/><path d="m12 8 4-4 4 4-4 4z"/><path d="M15 5l3 3"/>',
  camera: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3z"/>',
  sparkles:
    '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M19 14l.7 2 2 .7-2 .7L19 20l-.7-2-2-.7 2-.7z"/>',

  // --- effect-type glyphs ---
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  square: '<rect x="4" y="4" width="16" height="16" rx="1"/>',
  swirl: '<path d="M12 21a9 9 0 1 0-9-9 6 6 0 0 0 6 6 4 4 0 0 0 4-4 2 2 0 0 0-2-2"/>',
  droplet: '<path d="M12 2.7 6 9.6a6 6 0 1 0 12 0z"/>',
  contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18z"/>',
  tv: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="m7 7 5-4 5 4"/><path d="M6 12h.01M6 16h.01"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16h.01"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  burst:
    '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.5 2.5M16.5 16.5 19 19M19 5l-2.5 2.5M7.5 16.5 5 19"/>',
  layers: '<path d="m12 2 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h9a2.5 2.5 0 1 1-2.5 2.5"/>',
  vibrate: '<rect x="8" y="4" width="8" height="16" rx="1"/><path d="M3 9v6M21 9v6"/>',
  pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  dot: '<circle cx="12" cy="12" r="5"/>',
};

// Glyphs that read better as solid shapes than outlines.
const FILLED = new Set(['play', 'dot']);

export function icon(name, opts = {}) {
  const path = PATHS[name] || PATHS.dot;
  const size = opts.size || 18;
  const cls = opts.class ? ` ${opts.class}` : '';
  const isFilled = opts.fill || FILLED.has(name);
  const fill = isFilled ? 'currentColor' : 'none';
  return `<svg class="icon${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

// Publish for the inline / template-string markup in the view modules.
if (typeof window !== 'undefined') {
  window.icon = icon;
}
