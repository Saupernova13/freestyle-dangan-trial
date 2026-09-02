// What a script line actually "carries" in its advanced fields.
//
// Every one of these was tested the wrong way somewhere: specialEffects by
// .length on an object, camera motion and box style by mere presence even when
// they hold the defaults. DOM-free, so the tests can run it under node.

export const DEFAULT_CAMERA_MOTION = { type: 'none', duration: 1.0, easing: 'ease-in-out' };

export const DEFAULT_DIALOGUE_BOX_STYLE = {
  style: 'default',
  borderColor: '#FFFFFF',
  bgOpacity: 0.9,
  borderThickness: 2,
};

// specialEffects is always an object, { effects: [] } - the schema requires it,
// the engine parses it as a Dictionary, and the modal seeds it that way. So
// `specialEffects.length` was undefined at every call site that tested it.
export function hasSpecialEffects(line) {
  return Boolean(line && line.specialEffects && line.specialEffects.effects?.length);
}

// Saving assigned these unconditionally, so opening the modal and pressing
// Save was enough to make a line look like it carried a camera move. Compared
// by value rather than by presence, so trials already saved that way read
// correctly too.
export function hasCameraMotion(line) {
  const motion = line && line.cameraMotion;
  if (!motion) return false;
  if (motion.type && motion.type !== DEFAULT_CAMERA_MOTION.type) return true;
  return !matchesDefaults(motion, DEFAULT_CAMERA_MOTION);
}

export function hasCustomBoxStyle(line) {
  const style = line && line.dialogueBoxStyle;
  if (!style) return false;
  return !matchesDefaults(style, DEFAULT_DIALOGUE_BOX_STYLE);
}

// Only the keys the default declares: an unknown extra key is authored data
// the editor does not own, and absent keys fall back to the default anyway.
function matchesDefaults(value, defaults) {
  return Object.keys(defaults).every((key) => {
    if (!(key in value)) return true;
    return value[key] === defaults[key];
  });
}
