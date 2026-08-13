// Effects tab: toggle screen/transition effects that fire on this line.
import { refreshTabBody, sl } from './state.js';

// `icon` is an icon-set name (see js/ui/icons.js), rendered via window.icon().
const AVAILABLE_EFFECTS = [
  { type: 'shake', label: 'Screen Shake', icon: 'vibrate', hasIntensity: true },
  { type: 'flash', label: 'Flash', icon: 'zap', hasColor: true },
  { type: 'pulse', label: 'Pulse', icon: 'pulse', hasIntensity: true },
  { type: 'fade_black', label: 'Fade to Black', icon: 'square' },
  { type: 'fade_white', label: 'Fade to White', icon: 'square' },
  { type: 'blur', label: 'Background Blur', icon: 'wind', hasIntensity: true },
  { type: 'distortion', label: 'Distortion/Ripple', icon: 'swirl', hasIntensity: true },
  { type: 'sepia', label: 'Sepia Filter', icon: 'droplet' },
  { type: 'grayscale', label: 'Grayscale', icon: 'contrast' },
  { type: 'invert', label: 'Color Invert', icon: 'contrast' },
  { type: 'vignette', label: 'Vignette', icon: 'target', hasIntensity: true },
  { type: 'scanlines', label: 'Scanlines', icon: 'tv', hasIntensity: true },
  { type: 'objection', label: 'Objection Overlay', icon: 'alert' },
  { type: 'blood_splatter', label: 'Blood Splatter', icon: 'droplet' },
  { type: 'evidence_popup', label: 'Evidence Popup', icon: 'search' },
  { type: 'glitch', label: 'Glitch', icon: 'burst' },
  { type: 'chromatic_aberration', label: 'Chromatic Aberration', icon: 'layers' },
  { type: 'impact_frame', label: 'Impact Frame', icon: 'burst' },
];

export function renderSpecialEffectsTab() {
  const effects = sl.fields.specialEffects.effects;

  const activeEffectsList = effects
    .map((effect, idx) => {
      const effectDef = AVAILABLE_EFFECTS.find((e) => e.type === effect.type);
      return `
      <div class="effect-active-item">
        <span class="effect-icon">${window.icon(effectDef ? effectDef.icon : 'sparkles', { size: 18 })}</span>
        <div class="effect-details">
          <strong>${effectDef ? effectDef.label : effect.type}</strong>
          <div class="effect-params">
            ${effect.intensity !== undefined ? `Intensity: ${effect.intensity}` : ''}
            ${effect.color !== undefined ? `Color: ${effect.color}` : ''}
            ${effect.duration ? `Duration: ${effect.duration}s` : ''}
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="removeEffect(${idx})">
          ${window.icon('trash', { size: 15 })}
        </button>
      </div>
    `;
    })
    .join('');

  const effectsGrid = AVAILABLE_EFFECTS.map((effect) => {
    const isActive = effects.some((e) => e.type === effect.type);
    return `
      <div class="effect-option ${isActive ? 'effect-active' : ''}"
           onclick="toggleEffect('${effect.type}')">
        <div class="effect-option-icon">${window.icon(effect.icon, { size: 22 })}</div>
        <div class="effect-option-label">${effect.label}</div>
        ${isActive ? `<div class="effect-checkmark">${window.icon('check', { size: 14 })}</div>` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="dr-form">
      <h3>Special Effects</h3>
      <p style="color: var(--text-tertiary); margin-bottom: 1rem;">
        Add visual effects that trigger during this dialogue line.
      </p>

      ${
        effects.length > 0
          ? `
        <div class="active-effects-list">
          <h4>Active Effects:</h4>
          ${activeEffectsList}
        </div>
      `
          : ''
      }

      <div class="effects-grid">
        <h4>Available Effects:</h4>
        <div class="effects-grid-container">
          ${effectsGrid}
        </div>
      </div>

      <div class="effects-help">
        <small>${window.icon('bulb', { size: 15 })} Click an effect to add/remove it. Effects will trigger when this dialogue line appears.</small>
      </div>
    </div>
  `;
}

export function toggleEffect(effectType) {
  const effects = sl.fields.specialEffects.effects;
  const existingIndex = effects.findIndex((e) => e.type === effectType);

  if (existingIndex !== -1) {
    effects.splice(existingIndex, 1);
  } else {
    const newEffect = { type: effectType };

    if (['shake', 'blur', 'distortion', 'vignette', 'pulse'].includes(effectType)) {
      newEffect.intensity = 0.5;
      newEffect.duration = 0.5;
    } else if (effectType === 'flash') {
      newEffect.color = '#FFFFFF';
      newEffect.duration = 0.2;
    } else {
      newEffect.duration = 1.0;
    }

    effects.push(newEffect);
  }

  if (sl.tab === 'specialEffects') refreshTabBody(renderSpecialEffectsTab());
}

export function removeEffect(index) {
  sl.fields.specialEffects.effects.splice(index, 1);
  if (sl.tab === 'specialEffects') refreshTabBody(renderSpecialEffectsTab());
}
