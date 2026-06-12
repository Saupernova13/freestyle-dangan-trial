// Sprite Magnifier
// Adds a hover "zoom lens" over sprite thumbnails. When the mouse moves over a
// sprite image inside a .dr-sprslot, a circular lens follows the cursor and
// shows a magnified view of the exact area being hovered.
//
// Uses event delegation on the document so it keeps working across the frequent
// innerHTML re-renders of the character modal (no per-element listeners to rebind).

const SPRITE_MAGNIFIER_ZOOM = 2.5;
const SPRITE_MAGNIFIER_SIZE = 200; // lens diameter in px
const SPRITE_MAGNIFIER_OFFSET = 24; // gap between cursor and lens

let _magnifierLens = null;
let _magnifierInnerImg = null;

export function _ensureMagnifierLens() {
  if (_magnifierLens) return;

  _magnifierLens = document.createElement('div');
  _magnifierLens.className = 'sprite-magnifier-lens';
  _magnifierLens.style.display = 'none';

  _magnifierInnerImg = document.createElement('img');
  _magnifierInnerImg.className = 'sprite-magnifier-img';
  _magnifierInnerImg.alt = '';
  _magnifierInnerImg.draggable = false;

  _magnifierLens.appendChild(_magnifierInnerImg);
  document.body.appendChild(_magnifierLens);
}

export function _isSpriteThumb(el) {
  return el && el.tagName === 'IMG' && el.closest('.dr-sprslot');
}

export function _showMagnifier(img) {
  _ensureMagnifierLens();
  // Mirror the source so the lens shows the same picture as the slot.
  if (_magnifierInnerImg.src !== img.src) {
    _magnifierInnerImg.src = img.src;
  }
  _magnifierLens.style.display = 'block';
}

export function _hideMagnifier() {
  if (_magnifierLens) _magnifierLens.style.display = 'none';
}

export function _moveMagnifier(img, clientX, clientY) {
  if (!_magnifierLens) return;

  const rect = img.getBoundingClientRect();
  // Cursor position relative to the image box (0..1).
  const relX = (clientX - rect.left) / rect.width;
  const relY = (clientY - rect.top) / rect.height;

  if (relX < 0 || relX > 1 || relY < 0 || relY > 1) {
    _hideMagnifier();
    return;
  }

  // Scale the slot box uniformly by the zoom factor. The inner img uses the same
  // object-fit: contain as the slot, so letterboxing lines up automatically.
  const scaledW = rect.width * SPRITE_MAGNIFIER_ZOOM;
  const scaledH = rect.height * SPRITE_MAGNIFIER_ZOOM;
  _magnifierInnerImg.style.width = scaledW + 'px';
  _magnifierInnerImg.style.height = scaledH + 'px';

  // Center the hovered point within the lens.
  _magnifierInnerImg.style.left = (SPRITE_MAGNIFIER_SIZE / 2 - relX * scaledW) + 'px';
  _magnifierInnerImg.style.top = (SPRITE_MAGNIFIER_SIZE / 2 - relY * scaledH) + 'px';

  // Position the lens near the cursor, flipping to stay on screen.
  let lensX = clientX + SPRITE_MAGNIFIER_OFFSET;
  let lensY = clientY + SPRITE_MAGNIFIER_OFFSET;
  if (lensX + SPRITE_MAGNIFIER_SIZE > window.innerWidth) {
    lensX = clientX - SPRITE_MAGNIFIER_SIZE - SPRITE_MAGNIFIER_OFFSET;
  }
  if (lensY + SPRITE_MAGNIFIER_SIZE > window.innerHeight) {
    lensY = clientY - SPRITE_MAGNIFIER_SIZE - SPRITE_MAGNIFIER_OFFSET;
  }
  _magnifierLens.style.left = lensX + 'px';
  _magnifierLens.style.top = lensY + 'px';
}

export function initSpriteMagnifier() {
  document.addEventListener('mouseover', (e) => {
    if (_isSpriteThumb(e.target)) _showMagnifier(e.target);
  });

  document.addEventListener('mousemove', (e) => {
    if (_isSpriteThumb(e.target)) {
      _moveMagnifier(e.target, e.clientX, e.clientY);
    } else if (_magnifierLens && _magnifierLens.style.display === 'block') {
      _hideMagnifier();
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (_isSpriteThumb(e.target)) _hideMagnifier();
  });
}
