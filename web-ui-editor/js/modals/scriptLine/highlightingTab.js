// Highlighting tab: drag across the dialogue to paint colored runs onto it.
import { escapeHtml, normalizeHighlights } from '../../utils.js';
import { COLOR_REGEX, activeLine, sl } from './state.js';
import { renderScriptLineModal } from '../scriptLineModal.js';

export function renderHighlightingTab(line) {
  const dialogue = line.dialogue || line.text || '';

  // Repair any stale/overlapping ranges (e.g. dialogue edited after
  // highlighting) before they are shown or re-saved.
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
        <button class="btn btn-secondary btn-sm" onclick="removeHighlight(${idx})">
          ${window.icon('trash', { size: 15 })}
        </button>
      </div>
    `;
    })
    .join('');

  // Render dialogue as individual character spans for drag selection.
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

      <!-- Single unified preview -->
      <div class="highlight-preview">
        <h4>Text Preview:</h4>
        <div class="preview-text" id="highlight-unified-preview">
          ${highlightedText}
        </div>
        <div class="selection-info" id="selection-info" style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-tertiary);">
          <span>Selection: <strong id="selection-range">None</strong></span>
        </div>
      </div>

      <!-- Existing highlights list -->
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

      <!-- Drag-to-select controls -->
      <div class="highlight-controls">
        <h4>Add New Highlight:</h4>

        <!-- Selectable dialogue text -->
        <div class="dialogue-selector" id="dialogue-selector">
          <div class="dialogue-text">
            ${selectableDialogue}
          </div>
        </div>

        <!-- Color selection -->
        <div class="color-selection">
          <label>Text Color:</label>
          <div class="color-presets">
            <button class="color-preset ${sl.highlighting.currentColor === '#FFFF00' ? 'active' : ''}"
                    style="background: #FFFF00;"
                    onclick="selectHighlightColor('#FFFF00')"
                    title="Yellow">
            </button>
            <button class="color-preset ${sl.highlighting.currentColor === '#FF0000' ? 'active' : ''}"
                    style="background: #FF0000;"
                    onclick="selectHighlightColor('#FF0000')"
                    title="Red">
            </button>
            <button class="color-preset ${sl.highlighting.currentColor === '#00FF00' ? 'active' : ''}"
                    style="background: #00FF00;"
                    onclick="selectHighlightColor('#00FF00')"
                    title="Green">
            </button>
            <input type="color" value="${sl.highlighting.currentColor}"
                   onchange="selectHighlightColor(this.value)"
                   title="Custom color">
          </div>
          <div class="current-color-preview" style="background: ${sl.highlighting.currentColor};">
            <span>${sl.highlighting.currentColor}</span>
          </div>
        </div>

        <div class="highlight-button-row">
          <button class="btn btn-primary" onclick="addHighlightFromSelection()" id="add-highlight-btn" disabled>
            ${window.icon('plus')} Add Highlight
          </button>
          <button class="btn btn-secondary" onclick="clearHighlightSelection()">
            ${window.icon('close')} Clear Selection
          </button>
        </div>
      </div>
    </div>
  `;
}

// Removes the document-level listener from the previous wiring. The tab is
// re-rendered (and re-wired) on every highlight add/remove and tab switch, so
// without this the document pointerup handlers would pile up.
let detachDragSelection = null;

// Drop any active drag-selection listeners (called when the modal closes).
export function teardownDragSelection() {
  if (detachDragSelection) {
    detachDragSelection();
    detachDragSelection = null;
  }
}

// Wire up drag selection after the highlighting tab is in the DOM. Uses pointer
// events (+ elementFromPoint) so it works with both mouse and touch.
export function initializeDragSelection() {
  teardownDragSelection();

  const dialogueSelector = document.getElementById('dialogue-selector');
  if (!dialogueSelector) return;

  const dialogueText = dialogueSelector.querySelector('.dialogue-text');
  const selectionRange = document.getElementById('selection-range');
  const addButton = document.getElementById('add-highlight-btn');

  let isSelecting = false;
  let startIndex = -1;

  // The span under a point. For touch, the implicit pointer capture keeps
  // e.target on the start span, so resolve the element by coordinates instead.
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
    // Handle backward selection (drag right-to-left).
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
    selectionRange.innerHTML =
      sl.highlighting.endChar > sl.highlighting.startChar
        ? `"${escapeHtml(selectedText)}" (${sl.highlighting.startChar}-${sl.highlighting.endChar})`
        : 'None';

    const unifiedPreview = document.getElementById('highlight-unified-preview');
    if (unifiedPreview) {
      const tempHighlights = [...sl.fields.highlights];
      if (sl.highlighting.endChar > sl.highlighting.startChar) {
        tempHighlights.push({
          startChar: sl.highlighting.startChar,
          endChar: sl.highlighting.endChar,
          color: sl.highlighting.currentColor,
          isTemp: true,
        });
      }
      unifiedPreview.innerHTML = renderHighlightedDialogue(dialogue, tempHighlights);
    }
  }
}

// Render dialogue with all highlights applied.
export function renderHighlightedDialogue(dialogue, highlights) {
  if (!dialogue) return '<em>No dialogue text</em>';

  // normalizeHighlights guarantees sorted, disjoint, in-bounds ranges, so
  // this preview renders exactly what the engine will — including data that
  // arrives overlapping or stale from older trial files.
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

// Clear the highlight drag-selection.
// Named distinctly from app.js's clearSelection (script line multi-select):
// both files share the global namespace, and a shared name meant whichever
// file loaded last silently won.
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
    selectionRange.innerHTML = 'None';
  }

  const addButton = document.getElementById('add-highlight-btn');
  if (addButton) {
    addButton.disabled = true;
  }
}

export function selectHighlightColor(color) {
  if (!COLOR_REGEX.test(color)) {
    sl.err = 'Invalid color. Please use a valid hex color (e.g., #FF0000)';
    renderScriptLineModal();
    return;
  }

  sl.err = '';
  sl.highlighting.currentColor = color;

  // Update the color preview without a full re-render.
  const colorPreview = document.querySelector('.current-color-preview');
  if (colorPreview) {
    colorPreview.style.background = color;
    colorPreview.querySelector('span').textContent = color;
  }

  // Update color preset active states.
  document.querySelectorAll('.color-preset').forEach((btn) => {
    const btnColor = normalizeColorFormat(btn.style.background);
    const targetColor = normalizeColorFormat(color);
    if (btnColor && targetColor && btnColor.toLowerCase() === targetColor.toLowerCase()) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Repaint the unified preview so an in-progress selection reflects the
  // newly chosen color.
  const line = activeLine();
  const unifiedPreview = document.getElementById('highlight-unified-preview');
  if (unifiedPreview && line && sl.highlighting.endChar > sl.highlighting.startChar) {
    const dialogue = line.dialogue || line.text || '';
    const tempHighlights = [
      ...sl.fields.highlights,
      {
        startChar: sl.highlighting.startChar,
        endChar: sl.highlighting.endChar,
        color: sl.highlighting.currentColor,
      },
    ];
    unifiedPreview.innerHTML = renderHighlightedDialogue(dialogue, tempHighlights);
  }
}

// Normalize a CSS color (hex or rgb()) to #RRGGBB for comparison.
function normalizeColorFormat(color) {
  if (!color || typeof color !== 'string') return null;
  color = color.trim();
  if (color.startsWith('#')) return color;
  const match = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (!match) return null;
  const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
  const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
  const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function addHighlightFromSelection() {
  const line = activeLine();
  const dialogue = line.dialogue || '';

  if (sl.highlighting.startChar >= sl.highlighting.endChar) {
    sl.err = 'Please select text to highlight.';
    renderScriptLineModal();
    return;
  }

  if (
    !Number.isFinite(sl.highlighting.startChar) ||
    !Number.isFinite(sl.highlighting.endChar) ||
    sl.highlighting.startChar < 0 ||
    sl.highlighting.endChar > dialogue.length
  ) {
    sl.err = 'Invalid selection range. Please select within the dialogue text.';
    renderScriptLineModal();
    return;
  }

  if (!COLOR_REGEX.test(sl.highlighting.currentColor)) {
    sl.err = 'Invalid highlight color.';
    renderScriptLineModal();
    return;
  }

  // Add the highlight, then normalize so a selection over existing highlights
  // repaints them (highlighter semantics) instead of stacking overlapping
  // ranges that older versions corrupted at render time.
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
