// Highlighting tab: drag across the dialogue to paint colored runs onto it.
import { escapeHtml, normalizeHighlights } from '../../utils.js';
import { COLOR_REGEX, activeLine, sl } from './state.js';
import { renderScriptLineModal, failField } from '../scriptLineModal.js';

import { setHtml } from '../../ui/dom.js';
import { registerActions } from '../../ui/actions.js';

registerActions('click', {
  removeHighlight: (el) => removeHighlight(Number(el.dataset.index)),
  selectHighlightColor: (el) => selectHighlightColor(el.dataset.color),
  addHighlightFromSelection: () => addHighlightFromSelection(),
  clearHighlightSelection: () => clearHighlightSelection(),
});

registerActions('change', {
  // The custom color input reports its own value; the swatches carry theirs.
  selectHighlightColor: (el) => selectHighlightColor(el.value),
});
// The colors the preset swatches offer. The buttons used to be written out
// by hand with their hex inline, and selectHighlightColor then read each
// color back out of btn.style.background - which the browser has serialized
// to rgb() - and converted it to hex again just to decide which swatch was
// active. The source of truth for "which colors are presets" was a CSS
// inline style on generated markup.
const HIGHLIGHT_PRESETS = [
  { color: '#FFFF00', title: 'Yellow' },
  { color: '#FF0000', title: 'Red' },
  { color: '#00FF00', title: 'Green' },
];

// The color input reports lowercase hex, so the comparison cannot be exact.
function sameColor(a, b) {
  return typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
}

export function renderHighlightingTab(line) {
  const dialogue = line.dialogue || line.text || '';

  // Dialogue may have been edited since; repair stale ranges before showing them.
  sl.fields.highlights = normalizeHighlights(sl.fields.highlights, dialogue.length);

  const highlightedText = renderHighlightedDialogue(dialogue, sl.fields.highlights);

  const highlightsList = sl.fields.highlights
    .map((h, idx) => {
      const excerpt = escapeHtml(dialogue.substring(h.startChar, h.endChar));
      return `
      <div class="highlight-item" style="border-left: 4px solid ${h.color};">
        <div class="highlight-info">
          <span class="highlight-text">"${excerpt}"</span>
          <span class="highlight-range">(chars ${h.startChar}-${h.endChar})</span>
        </div>
        <button class="btn btn-secondary btn-sm" data-index="${idx}" data-on-click="removeHighlight">
          ${window.icon('trash', { size: 15 })}
        </button>
      </div>
    `;
    })
    .join('');

  // One span per character so a drag can address them individually.
  const selectableDialogue = dialogue
    .split('')
    .map(
      (char, idx) =>
        `<span class="char-selectable" data-char-index="${idx}">${char === ' ' ? '&nbsp;' : escapeHtml(char)}</span>`
    )
    .join('');

  return `
    <div class="dr-form">
      <h3>Text Highlighting</h3>
      <p style="color: var(--text-tertiary); margin-bottom: 1rem;">
        Click and drag across the text to select the portion you want to highlight.
      </p>

      <div class="highlight-preview">
        <h4>Text Preview:</h4>
        <div class="preview-text" id="highlight-unified-preview">
          ${highlightedText}
        </div>
        <div class="selection-info" id="selection-info" style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-tertiary);">
          <span>Selection: <strong id="selection-range">None</strong></span>
        </div>
      </div>

      ${
        sl.fields.highlights.length > 0
          ? `
        <div class="highlights-list">
          <h4>Current Highlights:</h4>
          ${highlightsList}
        </div>
      `
          : ''
      }

      <div class="highlight-controls">
        <h4>Add New Highlight:</h4>

        <div class="dialogue-selector" id="dialogue-selector">
          <div class="dialogue-text">
            ${selectableDialogue}
          </div>
        </div>

        <div class="color-selection">
          <label>Text Color:</label>
          <div class="color-presets">
            ${HIGHLIGHT_PRESETS.map(
              (preset) => `
            <button class="color-preset ${sameColor(preset.color, sl.highlighting.currentColor) ? 'active' : ''}"
                    style="background: ${preset.color};"
                    data-color="${preset.color}"
                    data-color="${preset.color}" data-on-click="selectHighlightColor"
                    title="${preset.title}">
            </button>`
            ).join('')}
            <input type="color" value="${sl.highlighting.currentColor}"
                   data-on-change="selectHighlightColor"
                   title="Custom color">
          </div>
          <div class="current-color-preview" style="background: ${sl.highlighting.currentColor};">
            <span>${sl.highlighting.currentColor}</span>
          </div>
        </div>

        <div class="highlight-button-row">
          <button class="btn btn-primary" data-on-click="addHighlightFromSelection" id="add-highlight-btn" disabled>
            ${window.icon('plus')} Add Highlight
          </button>
          <button class="btn btn-secondary" data-on-click="clearHighlightSelection">
            ${window.icon('close')} Clear Selection
          </button>
        </div>
      </div>
    </div>
  `;
}

// The tab re-wires on every add/remove and tab switch, so document pointerup
// handlers would otherwise pile up.
let detachDragSelection = null;

// Called when the modal closes.
export function teardownDragSelection() {
  if (detachDragSelection) {
    detachDragSelection();
    detachDragSelection = null;
  }
}

// Call once the tab is in the DOM. Pointer events, so mouse and touch both work.
export function initializeDragSelection() {
  teardownDragSelection();

  const dialogueSelector = document.getElementById('dialogue-selector');
  if (!dialogueSelector) return;

  const dialogueText = dialogueSelector.querySelector('.dialogue-text');
  const selectionRange = document.getElementById('selection-range');
  const addButton = document.getElementById('add-highlight-btn');

  let isSelecting = false;
  let startIndex = -1;

  // Touch's implicit pointer capture pins e.target to the start span, so the
  // span under the cursor is resolved by coordinates.
  const charIndexAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    if (el && el.classList.contains('char-selectable')) {
      return parseInt(el.dataset.charIndex, 10);
    }
    return -1;
  };

  const onPointerDown = (e) => {
    const idx = charIndexAt(e.clientX, e.clientY);
    if (idx < 0) return;
    e.preventDefault();
    isSelecting = true;
    startIndex = idx;
    sl.highlighting.startChar = idx;
    sl.highlighting.endChar = idx + 1;
    clearPreviousSelection();
    updateSelectionDisplay();
  };

  const onPointerMove = (e) => {
    if (!isSelecting) return;
    const idx = charIndexAt(e.clientX, e.clientY);
    if (idx < 0) return;
    e.preventDefault();
    // min/max so a right-to-left drag still selects.
    sl.highlighting.startChar = Math.min(startIndex, idx);
    sl.highlighting.endChar = Math.max(startIndex, idx) + 1;
    clearPreviousSelection();
    updateSelectionDisplay();
  };

  const onPointerUp = () => {
    if (!isSelecting) return;
    isSelecting = false;
    if (addButton) addButton.disabled = !(sl.highlighting.endChar > sl.highlighting.startChar);
  };

  dialogueText.addEventListener('pointerdown', onPointerDown);
  dialogueText.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);

  detachDragSelection = () => {
    dialogueText.removeEventListener('pointerdown', onPointerDown);
    dialogueText.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
  };

  function clearPreviousSelection() {
    dialogueText.querySelectorAll('.char-selectable').forEach((span) => {
      span.classList.remove('char-selected');
    });
  }

  function updateSelectionDisplay() {
    const line = activeLine();
    const dialogue = line.dialogue || line.text || '';

    const spans = dialogueText.querySelectorAll('.char-selectable');
    for (let i = sl.highlighting.startChar; i < sl.highlighting.endChar; i++) {
      if (spans[i]) {
        spans[i].classList.add('char-selected');
      }
    }

    const selectedText = dialogue.substring(sl.highlighting.startChar, sl.highlighting.endChar);
    setHtml(
      selectionRange,
      sl.highlighting.endChar > sl.highlighting.startChar
        ? `"${escapeHtml(selectedText)}" (${sl.highlighting.startChar}-${sl.highlighting.endChar})`
        : 'None'
    );

    repaintPreview();
  }
}

export function renderHighlightedDialogue(dialogue, highlights) {
  if (!dialogue) return '<em>No dialogue text</em>';

  // Normalizing first makes the preview match what the engine renders.
  const normalized = normalizeHighlights(highlights, dialogue.length);
  if (normalized.length === 0) return escapeHtml(dialogue);

  let result = '';
  let lastIndex = 0;
  normalized.forEach((h) => {
    result += escapeHtml(dialogue.substring(lastIndex, h.startChar));
    result += `<span style="color: ${h.color}; font-weight: 600;">`;
    result += escapeHtml(dialogue.substring(h.startChar, h.endChar));
    result += '</span>';
    lastIndex = h.endChar;
  });
  result += escapeHtml(dialogue.substring(lastIndex));

  return result;
}

// Do not rename to clearSelection: app.js exports one too, and they share a
// global namespace where the last file loaded silently wins.
export function clearHighlightSelection() {
  sl.highlighting.startChar = 0;
  sl.highlighting.endChar = 0;

  const dialogueText = document.querySelector('.dialogue-text');
  if (dialogueText) {
    dialogueText.querySelectorAll('.char-selectable').forEach((span) => {
      span.classList.remove('char-selected');
    });
  }

  const selectionRange = document.getElementById('selection-range');
  if (selectionRange) {
    setHtml(selectionRange, 'None');
  }

  const addButton = document.getElementById('add-highlight-btn');
  if (addButton) {
    addButton.disabled = true;
  }
}

// The unified preview, including the selection being made right now. Both the
// selection handler and the color picker used to build this array and paint
// it themselves; the only textual difference was an `isTemp: true` that was
// written once and read nowhere, since normalizeHighlights rebuilds plain
// objects and drops it.
function repaintPreview() {
  const unifiedPreview = document.getElementById('highlight-unified-preview');
  const line = activeLine();
  if (!unifiedPreview || !line) return;

  const dialogue = line.dialogue || line.text || '';
  const highlights = [...sl.fields.highlights];
  if (sl.highlighting.endChar > sl.highlighting.startChar) {
    highlights.push({
      startChar: sl.highlighting.startChar,
      endChar: sl.highlighting.endChar,
      color: sl.highlighting.currentColor,
    });
  }
  setHtml(unifiedPreview, renderHighlightedDialogue(dialogue, highlights));
}

export function selectHighlightColor(color) {
  if (!COLOR_REGEX.test(color)) {
    failField('Invalid color. Please use a valid hex color (e.g., #FF0000)');
    return;
  }

  sl.err = '';
  sl.highlighting.currentColor = color;

  // Patch the preview in place rather than re-rendering the whole modal.
  const colorPreview = document.querySelector('.current-color-preview');
  if (colorPreview) {
    colorPreview.style.background = color;
    colorPreview.querySelector('span').textContent = color;
  }

  document.querySelectorAll('.color-preset').forEach((btn) => {
    btn.classList.toggle('active', sameColor(btn.dataset.color, color));
  });

  // Repaint so an in-progress selection takes the new color.
  repaintPreview();
}

export function addHighlightFromSelection() {
  const line = activeLine();
  const dialogue = line.dialogue || '';

  if (sl.highlighting.startChar >= sl.highlighting.endChar) {
    failField('Please select text to highlight.');
    return;
  }

  if (
    !Number.isFinite(sl.highlighting.startChar) ||
    !Number.isFinite(sl.highlighting.endChar) ||
    sl.highlighting.startChar < 0 ||
    sl.highlighting.endChar > dialogue.length
  ) {
    failField('Invalid selection range. Please select within the dialogue text.');
    return;
  }

  if (!COLOR_REGEX.test(sl.highlighting.currentColor)) {
    failField('Invalid highlight color.');
    return;
  }

  // Normalizing after the push gives highlighter semantics: painting over an
  // existing highlight repaints it rather than stacking ranges.
  sl.fields.highlights.push({
    startChar: sl.highlighting.startChar,
    endChar: sl.highlighting.endChar,
    color: sl.highlighting.currentColor,
  });
  sl.fields.highlights = normalizeHighlights(sl.fields.highlights, dialogue.length);

  sl.highlighting.startChar = 0;
  sl.highlighting.endChar = 0;
  sl.err = '';
  sl.msg = 'Highlight added successfully';

  renderScriptLineModal();
  setTimeout(() => initializeDragSelection(), 0);
}

export function removeHighlight(index) {
  sl.fields.highlights.splice(index, 1);
  renderScriptLineModal();
  setTimeout(() => initializeDragSelection(), 0);
}
