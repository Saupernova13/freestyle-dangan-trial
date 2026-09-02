// Box Style tab: per-line dialogue box shape, border, and opacity.
import { COLOR_REGEX, refreshTabBody, sl } from './state.js';
import { escapeHtml } from '../../utils.js';
import { failField } from '../scriptLineModal.js';

const BOX_STYLES = [
  { value: 'default', label: 'Default', desc: 'Standard rectangular box' },
  { value: 'slant_left', label: 'Slant Left', desc: 'Box tilted to the left' },
  { value: 'slant_right', label: 'Slant Right', desc: 'Box tilted to the right' },
  { value: 'spiky', label: 'Spiky', desc: 'Sharp pointed edges' },
  { value: 'bubbly', label: 'Bubbly', desc: 'Rounded speech bubble style' },
  { value: 'rounded', label: 'Rounded', desc: 'Soft rounded corners' },
  { value: 'sharp', label: 'Sharp', desc: 'Hard angular edges' },
];

export function renderDialogueBoxTab() {
  const box = sl.fields.dialogueBoxStyle;

  const styleOptions = BOX_STYLES.map(
    (style) =>
      `<option value="${style.value}" ${box.style === style.value ? 'selected' : ''} title="${style.desc}">
      ${style.label}
    </option>`
  ).join('');

  const selectedStyle = BOX_STYLES.find((s) => s.value === box.style);

  return `
    <div class="dr-form">
      <h3>Dialogue Box Style</h3>
      <p style="color: var(--text-tertiary); margin-bottom: 1rem;">
        Customize the appearance of the dialogue box for this line.
      </p>

      <div class="dialoguebox-preview-box">
        <div class="dialoguebox-preview-icon">${window.icon('message', { size: 28 })}</div>
        <div class="dialoguebox-preview-text">
          <strong>${selectedStyle ? selectedStyle.label : 'Default'}</strong>
          <p>${selectedStyle ? selectedStyle.desc : 'Standard rectangular box'}</p>
        </div>
      </div>

      <div class="dr-fg-row">
        <div class="dr-fg-field" style="flex: 2;">
          <label>Box Style:</label>
          <select onchange="updateDialogueBoxStyle('style', this.value)">
            ${styleOptions}
          </select>
        </div>
      </div>

      <div class="dr-fg-row">
        <div class="dr-fg-field">
          <label>Border Color:</label>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <input type="color"
                   value="${escapeHtml(box.borderColor)}"
                   onchange="updateDialogueBoxStyle('borderColor', this.value)"
                   style="width: 50px; height: 35px;">
            <span style="font-size: 0.875rem; color: var(--text-tertiary);">${escapeHtml(box.borderColor)}</span>
          </div>
        </div>
        <div class="dr-fg-field">
          <label>Background Opacity:</label>
          <input type="range"
                 min="0"
                 max="1"
                 step="0.1"
                 value="${box.bgOpacity}"
                 oninput="updateDialogueBoxStyle('bgOpacity', parseFloat(this.value))"
                 style="width: 100%;">
          <span style="font-size: 0.875rem; color: var(--text-tertiary);">${Math.round(box.bgOpacity * 100)}%</span>
        </div>
      </div>

      <div class="dr-fg-row">
        <div class="dr-fg-field">
          <label>Border Thickness (px):</label>
          <input type="number"
                 min="0"
                 max="10"
                 step="1"
                 value="${box.borderThickness}"
                 onchange="updateDialogueBoxStyle('borderThickness', parseInt(this.value))">
        </div>
      </div>
    </div>
  `;
}

export function updateDialogueBoxStyle(field, value) {
  if (field === 'borderColor' && !COLOR_REGEX.test(value)) {
    failField('Border color must be a valid hex color (e.g., #FFFFFF)');
    return;
  }

  if (field === 'bgOpacity') {
    const opacity = parseFloat(value);
    if (isNaN(opacity) || opacity < 0 || opacity > 1) {
      failField('Opacity must be between 0 and 1');
      return;
    }
  }

  if (field === 'borderThickness') {
    const thickness = parseInt(value, 10);
    if (isNaN(thickness) || thickness < 0 || thickness > 10) {
      failField('Border thickness must be between 0 and 10 pixels');
      return;
    }
  }

  sl.err = '';
  sl.fields.dialogueBoxStyle[field] = value;

  // Tab-only repaint, so the preview updates without losing focus.
  if (sl.tab === 'dialogueBox') refreshTabBody(renderDialogueBoxTab());
}
