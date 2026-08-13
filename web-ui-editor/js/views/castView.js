// The character grid: one slot per cast position, filled or empty.
import { BLOCK_COUNT, blockNames, blockTypes } from '../core/constants.js';
import { state } from '../core/state.js';
import { openCharModal } from '../modals/characterModal.js';
import { isCharacterComplete } from '../models/characterModel.js';
import { showToast } from '../ui/dialogs.js';
import { escapeHtml } from '../utils.js';

import { setHtml } from '../ui/dom.js';
export function renderCastGrid() {
  const grid = document.getElementById('mainGrid');
  setHtml(grid, '');

  for (let i = 0; i < BLOCK_COUNT; i++) {
    const c = state.cast[i];
    const isHeadmaster = blockTypes[i];
    const div = document.createElement('div');
    div.className = 'cast-block';
    div.setAttribute('tabindex', 0);
    div.setAttribute('role', 'button');
    div.setAttribute(
      'aria-label',
      `${blockNames[i]}: ${c ? `${c.name || ''} ${c.surname || ''}`.trim() || 'unnamed' : 'empty slot'}`
    );
    div.setAttribute('data-filled', c ? '1' : '0');
    div.setAttribute('data-type', isHeadmaster ? 'headmaster' : 'student');
    div.onclick = () => {
      if (state.dirHandle) {
        openCharModal(i);
      } else {
        showToast('Choose a trial folder first.', { type: 'warning' });
      }
    };

    if (c) {
      let spriteHtml;
      if (c.sprites && c.sprites[0] && c.sprites[0].dataURL) {
        spriteHtml = `<img src="${c.sprites[0].dataURL}" class="blk-ppic" alt="Character sprite">`;
      } else {
        spriteHtml = `<div class="blk-ppic" style="display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);">No Image</div>`;
      }

      const isDraft = !isCharacterComplete(c);
      div.setAttribute('data-draft', isDraft ? '1' : '0');

      setHtml(
        div,
        `
        ${isDraft ? `<span class="cast-draft-badge" title="Profile incomplete">Draft</span>` : ''}
        ${spriteHtml}
        <div class="cast-name">${escapeHtml(`${c.name || ''} ${c.surname || ''}`)}</div>
        <div class="cast-block-title">${blockNames[i]}</div>
      `
      );
    } else {
      setHtml(
        div,
        `
        <div class="blk-plus">+</div>
        <div class="cast-name">No Character</div>
        <div class="cast-block-title">${blockNames[i]}</div>
      `
      );
    }

    grid.appendChild(div);
  }
}
