// Character search dropdown for speaking script lines; the markup lives in
// app.js's renderScriptLineBar.
//
// Only one dropdown is ever open, so a single open-state drives all of them.
// Clicks and hover go through document-level delegation, because the list
// re-renders on every keystroke and per-item listeners would need rebinding.
import { updateScriptLine } from '../app.js';
import { state } from '../core/state.js';
import { escapeHtml } from '../utils.js';

import { setHtml } from '../ui/dom.js';
let activeDropdownLineId = null;
let filteredCharacters = [];
let highlightedIndex = -1;

// Call once, at app init.
export function initCharacterSearchDropdown() {
  // Click outside any dropdown closes the open one.
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.searchable-dropdown') && activeDropdownLineId) {
      closeCharacterDropdown(activeDropdownLineId);
    }
  });

  document.addEventListener('click', (e) => {
    const item = e.target.closest('.searchable-dropdown-item');
    if (item && item.dataset.charId && activeDropdownLineId) {
      selectCharacterFromDropdown(activeDropdownLineId, item.dataset.charId);
    }
  });

  document.addEventListener('mouseover', (e) => {
    const item = e.target.closest('.searchable-dropdown-item');
    if (item && item.dataset.charIndex !== undefined && activeDropdownLineId) {
      const idx = parseInt(item.dataset.charIndex, 10);
      if (!Number.isNaN(idx) && idx !== highlightedIndex) {
        highlightedIndex = idx;
        updateDropdownHighlighting(activeDropdownLineId);
      }
    }
  });
}

export function openCharacterDropdown(lineId) {
  if (activeDropdownLineId && activeDropdownLineId !== lineId) {
    closeCharacterDropdown(activeDropdownLineId);
  }

  activeDropdownLineId = lineId;
  highlightedIndex = -1;
  filteredCharacters = state.cast.filter((c) => c !== null);

  renderCharacterDropdownList(lineId);
}

export function closeCharacterDropdown(lineId) {
  const listEl = document.getElementById(`char-dropdown-list-${lineId}`);
  if (listEl) {
    listEl.style.display = 'none';
  }

  if (activeDropdownLineId === lineId) {
    activeDropdownLineId = null;
    filteredCharacters = [];
    highlightedIndex = -1;
  }
}

export function filterCharacters(lineId, searchTerm) {
  const characters = state.cast.filter((c) => c !== null);
  const term = searchTerm.toLowerCase().trim();

  if (term === '') {
    filteredCharacters = characters;
  } else {
    filteredCharacters = characters.filter((c) => {
      const fullName = `${c.name} ${c.surname}`.toLowerCase();
      return fullName.includes(term);
    });
  }

  highlightedIndex = filteredCharacters.length > 0 ? 0 : -1;
  renderCharacterDropdownList(lineId);
}

export function handleCharacterKeydown(lineId, event) {
  const listEl = document.getElementById(`char-dropdown-list-${lineId}`);

  if (!listEl || listEl.style.display === 'none') {
    return;
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      if (highlightedIndex < filteredCharacters.length - 1) {
        highlightedIndex++;
        updateDropdownHighlighting(lineId);
        scrollToHighlighted(lineId);
      }
      break;

    case 'ArrowUp':
      event.preventDefault();
      if (highlightedIndex > 0) {
        highlightedIndex--;
        updateDropdownHighlighting(lineId);
        scrollToHighlighted(lineId);
      }
      break;

    case 'Enter':
      event.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredCharacters.length) {
        const character = filteredCharacters[highlightedIndex];
        selectCharacterFromDropdown(lineId, character.id);
      }
      break;

    case 'Escape':
      event.preventDefault();
      closeCharacterDropdown(lineId);
      break;
  }
}

export function selectCharacterFromDropdown(lineId, characterId) {
  updateScriptLine(lineId, 'characterId', characterId);
  closeCharacterDropdown(lineId);

  const selectedChar = state.cast.find((c) => c && c.id === characterId);
  if (selectedChar) {
    const inputEl = document.getElementById(`char-dropdown-input-${lineId}`);
    if (inputEl) {
      inputEl.value = `${selectedChar.name} ${selectedChar.surname}`;
    }
  }
}

export function renderCharacterDropdownList(lineId) {
  const listEl = document.getElementById(`char-dropdown-list-${lineId}`);
  if (!listEl) return;

  if (filteredCharacters.length === 0) {
    setHtml(
      listEl,
      '<div class="searchable-dropdown-item" style="cursor: default; opacity: 0.6;">No characters found</div>'
    );
    listEl.style.display = 'block';
    return;
  }

  const line = state.scriptLines.find((l) => l.id === lineId);
  const selectedCharId = line ? line.characterId : '';

  const itemsHtml = filteredCharacters
    .map((c, idx) => {
      const isSelected = c.id === selectedCharId;
      const isHighlighted = idx === highlightedIndex;
      const classes = ['searchable-dropdown-item'];
      if (isSelected) classes.push('selected');
      if (isHighlighted) classes.push('highlighted');

      return `
      <div class="${classes.join(' ')}"
           data-char-id="${c.id}"
           data-char-index="${idx}">
        ${escapeHtml(`${c.name} ${c.surname}`)} (${c.isHeadmaster ? 'Headmaster' : 'Student'})
      </div>
    `;
    })
    .join('');

  setHtml(listEl, itemsHtml);
  listEl.style.display = 'block';
}

export function updateDropdownHighlighting(lineId) {
  const listEl = document.getElementById(`char-dropdown-list-${lineId}`);
  if (!listEl) return;

  const items = listEl.querySelectorAll('.searchable-dropdown-item');
  items.forEach((item, idx) => {
    if (idx === highlightedIndex) {
      item.classList.add('highlighted');
    } else {
      item.classList.remove('highlighted');
    }
  });
}

export function scrollToHighlighted(lineId) {
  const listEl = document.getElementById(`char-dropdown-list-${lineId}`);
  if (!listEl) return;

  const highlightedEl = listEl.querySelector('.highlighted');
  if (highlightedEl) {
    highlightedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
