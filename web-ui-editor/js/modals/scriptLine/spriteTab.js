// Sprite tab: pick which character sprite shows during a speaking line.
import { sl } from './state.js';
import { renderScriptLineModal, failField } from '../scriptLineModal.js';

export function renderSpriteSelectionTab(character) {
  if (!character.sprites || character.sprites.length === 0) {
    return `
      <div class="dr-form">
        <p>This character has no sprites uploaded yet.</p>
        <p>Please edit the character in the Cast view to add sprites.</p>
      </div>
    `;
  }

  const spriteSlots = character.sprites
    .map((spr, idx) => {
      if (!spr) {
        return `
        <div class="dr-sprslot empty">
          <span>No Sprite</span>
        </div>
      `;
      }

      // spriteIndex is 1-based, matching sprite_NN.png on disk and what the
      // engine reads; the sprites array is 0-based.
      const isSelected = sl.fields.spriteIndex === idx + 1;
      return `
      <div class="dr-sprslot ${isSelected ? 'selected-sprite' : ''}"
           onclick="selectSprite(${idx + 1})"
           title="Sprite ${idx + 1}">
        <img src="${spr.dataURL}" alt="Sprite ${idx + 1}">
        ${isSelected ? `<div class="sprite-check">${window.icon('check', { size: 16 })}</div>` : ''}
      </div>
    `;
    })
    .join('');

  return `
    <div class="dr-form">
      <h3>Select Character Sprite</h3>
      <p style="color: var(--text-tertiary); margin-bottom: 1rem;">
        Choose which sprite expression to show during this dialogue.
      </p>
      <div class="dr-sprgrid">
        ${spriteSlots}
      </div>
    </div>
  `;
}

export function selectSprite(index) {
  const spriteIndex = parseInt(index, 10);

  if (!Number.isFinite(spriteIndex) || spriteIndex < 1) {
    failField('Invalid sprite selection');
    return;
  }

  sl.fields.spriteIndex = spriteIndex;
  sl.err = '';
  renderScriptLineModal();
}
