// Cast view - displays the character grid

function renderCastGrid() {
  const grid = document.getElementById('mainGrid');
  grid.innerHTML = '';

  for (let i = 0; i < BLOCK_COUNT; i++) {
    const c = cast[i];
    const isHeadmaster = blockTypes[i];
    const div = document.createElement('div');
    div.className = 'cast-block';
    div.setAttribute('tabindex', 0);
    div.setAttribute('data-filled', c ? "1" : "0");
    div.setAttribute('data-type', isHeadmaster ? 'headmaster' : 'student');
    div.onclick = () => dirHandle ? openCharModal(i) : null;

    if (c) {
      // Character exists - show sprite and name
      let spriteHtml = '';
      if (c.sprites && c.sprites[0] && c.sprites[0].dataURL) {
        spriteHtml = `<img src="${c.sprites[0].dataURL}" class="blk-ppic" alt="Character sprite">`;
      } else {
        spriteHtml = `<div class="blk-ppic" style="display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);">No Image</div>`;
      }

      div.innerHTML = `
        ${spriteHtml}
        <div class="cast-name">${c.name || ""} ${c.surname || ""}</div>
        <div class="cast-block-title">${blockNames[i]}</div>
      `;
    } else {
      // Empty slot - show plus and default name
      div.innerHTML = `
        <div class="blk-plus">+</div>
        <div class="cast-name">No Character</div>
        <div class="cast-block-title">${blockNames[i]}</div>
      `;
    }

    grid.appendChild(div);
  }
}
