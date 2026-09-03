// The "here is what you have selected" card at the top of the camera and
// dialogue box tabs.
//
// Both tabs found the selected entry in a { value, label, desc } table and
// rendered icon + <strong>label</strong> + <p>desc</p> with a hand-written
// not-found fallback - and the CSS agreed, with .camera-preview-* and
// .dialoguebox-preview-* holding byte-identical bodies. One component under
// two names.
//
// A value the table does not name previews as the table's first entry, which
// in both tables is the do-nothing default the engine falls back to. That is
// what the two hand-written fallbacks each spelled out.
import { escapeHtml } from '../../utils.js';
import { icon } from '../../ui/icons.js';

export function renderOptionPreview(iconName, options, value) {
  const selected = options.find((option) => option.value === value) || options[0];
  if (!selected) return '';
  return `
      <div class="option-preview">
        <div class="option-preview-icon">${icon(iconName, { size: 28 })}</div>
        <div class="option-preview-text">
          <strong>${escapeHtml(selected.label)}</strong>
          <p>${escapeHtml(selected.desc)}</p>
        </div>
      </div>`;
}
