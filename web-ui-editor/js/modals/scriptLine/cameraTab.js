// Camera tab: per-line camera motion (speaking lines only).
import { refreshTabBody, sl } from './state.js';
import { failField } from '../scriptLineModal.js';

const CAMERA_TYPES = [
  { value: 'none', label: 'None', desc: 'No camera movement' },
  { value: 'pan_left', label: 'Pan Left', desc: 'Camera pans to the left' },
  { value: 'pan_right', label: 'Pan Right', desc: 'Camera pans to the right' },
  { value: 'pan_up', label: 'Pan Up', desc: 'Camera pans upward' },
  { value: 'pan_down', label: 'Pan Down', desc: 'Camera pans downward' },
  { value: 'zoom_in', label: 'Zoom In', desc: 'Camera zooms closer' },
  { value: 'zoom_out', label: 'Zoom Out', desc: 'Camera zooms out' },
  { value: 'rotate_cw', label: 'Rotate Clockwise', desc: 'Camera rotates clockwise' },
  {
    value: 'rotate_ccw',
    label: 'Rotate Counter-Clockwise',
    desc: 'Camera rotates counter-clockwise',
  },
  { value: 'tilt_up', label: 'Tilt Up', desc: 'Camera tilts upward' },
  { value: 'tilt_down', label: 'Tilt Down', desc: 'Camera tilts downward' },
  { value: 'dolly_in', label: 'Dolly In', desc: 'Camera moves forward on track' },
  { value: 'dolly_out', label: 'Dolly Out', desc: 'Camera moves backward on track' },
  { value: 'truck_left', label: 'Truck Left', desc: 'Camera moves left on track' },
  { value: 'truck_right', label: 'Truck Right', desc: 'Camera moves right on track' },
  { value: 'pedestal_up', label: 'Pedestal Up', desc: 'Camera moves up vertically' },
  { value: 'pedestal_down', label: 'Pedestal Down', desc: 'Camera moves down vertically' },
  { value: 'pan', label: 'Pan to Speaker', desc: 'Smooth pan to the speaking character' },
  { value: 'shake', label: 'Camera Shake', desc: 'Quick handheld-style shake' },
  { value: 'dramatic_zoom', label: 'Dramatic Zoom', desc: 'Punch-in zoom with shake' },
  { value: 'spin', label: 'Spin', desc: 'Full 360 spin around the room' },
  { value: 'overhead', label: 'Overhead', desc: "Bird's-eye view from above" },
  { value: 'low_angle', label: 'Low Angle', desc: 'Drops low looking up at the speaker' },
  { value: 'dutch_tilt', label: 'Dutch Tilt', desc: 'Tilts sideways then rights itself' },
  { value: 'cross_dissolve', label: 'Cross Dissolve', desc: 'Fade through black transition' },
  { value: 'tracking', label: 'Tracking', desc: 'Smooth tracking move to the speaker' },
  { value: 'reset', label: 'Reset', desc: 'Return FOV and roll to defaults' },
];

const EASING_TYPES = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In-Out' },
];

export function renderCameraMotionTab() {
  const cam = sl.fields.cameraMotion;

  const cameraOptions = CAMERA_TYPES.map(
    (type) =>
      `<option value="${type.value}" ${cam.type === type.value ? 'selected' : ''} title="${type.desc}">
      ${type.label}
    </option>`
  ).join('');

  const easingOptions = EASING_TYPES.map(
    (easing) =>
      `<option value="${easing.value}" ${cam.easing === easing.value ? 'selected' : ''}>
      ${easing.label}
    </option>`
  ).join('');

  const selectedType = CAMERA_TYPES.find((t) => t.value === cam.type);

  return `
    <div class="dr-form">
      <h3>Camera Motion</h3>
      <p style="color: var(--text-tertiary); margin-bottom: 1rem;">
        Configure camera animation during this dialogue line.
      </p>

      <div class="camera-preview-box">
        <div class="camera-preview-icon">${window.icon('camera', { size: 28 })}</div>
        <div class="camera-preview-text">
          <strong>${selectedType ? selectedType.label : 'None'}</strong>
          <p>${selectedType ? selectedType.desc : 'No camera movement'}</p>
        </div>
      </div>

      <div class="dr-fg-row">
        <div class="dr-fg-field" style="flex: 2;">
          <label>Motion Type:</label>
          <select onchange="updateCameraMotion('type', this.value)">
            ${cameraOptions}
          </select>
        </div>
      </div>

      ${
        cam.type !== 'none'
          ? `
        <div class="dr-fg-row">
          <div class="dr-fg-field">
            <label>Duration (seconds):</label>
            <input type="number" min="0.1" max="10" step="0.1"
                   value="${cam.duration}"
                   onchange="updateCameraMotion('duration', parseFloat(this.value))">
          </div>
          <div class="dr-fg-field">
            <label>Easing:</label>
            <select onchange="updateCameraMotion('easing', this.value)">
              ${easingOptions}
            </select>
          </div>
        </div>
      `
          : ''
      }
    </div>
  `;
}

export function updateCameraMotion(field, value) {
  if (field === 'duration') {
    const duration = parseFloat(value);
    if (isNaN(duration) || duration < 0.1 || duration > 10) {
      failField('Duration must be between 0.1 and 10 seconds');
      return;
    }
  }

  sl.err = '';
  sl.fields.cameraMotion[field] = value;

  // Tab-only repaint, so the duration/easing controls show or hide.
  if (sl.tab === 'cameraMotion') refreshTabBody(renderCameraMotionTab());
}
