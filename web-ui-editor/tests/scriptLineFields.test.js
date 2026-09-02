// specialEffects is always an object - the schema requires it, the engine
// parses it as a Dictionary, and the modal seeds it as { effects: [] } - so
// every `.length` test on it was undefined. Two live consequences: the
// "Special effects" badge never rendered, and effects did not count toward the
// guard that confirms before a type change destroys them.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CAMERA_MOTION,
  DEFAULT_DIALOGUE_BOX_STYLE,
  hasCameraMotion,
  hasCustomBoxStyle,
  hasSpecialEffects,
} from '../js/core/scriptLineFields.js';

describe('hasSpecialEffects', () => {
  it('sees effects inside the object they actually live in', () => {
    expect(hasSpecialEffects({ specialEffects: { effects: [{ type: 'shake' }] } })).toBe(true);
  });

  it('is false for the empty shape the modal seeds', () => {
    expect(hasSpecialEffects({ specialEffects: { effects: [] } })).toBe(false);
  });

  it('is false when the field is absent', () => {
    expect(hasSpecialEffects({})).toBe(false);
    expect(hasSpecialEffects(null)).toBe(false);
  });

  it('is not fooled by the object having no length', () => {
    // The old test was `line.specialEffects && line.specialEffects.length`,
    // which is undefined for every line the editor has ever written.
    const line = { specialEffects: { effects: [{ type: 'flash' }] } };
    expect(line.specialEffects.length).toBeUndefined();
    expect(hasSpecialEffects(line)).toBe(true);
  });
});

describe('hasCameraMotion', () => {
  it('is false for the default motion', () => {
    expect(hasCameraMotion({ cameraMotion: { ...DEFAULT_CAMERA_MOTION } })).toBe(false);
  });

  it('is true once the type changes', () => {
    expect(hasCameraMotion({ cameraMotion: { ...DEFAULT_CAMERA_MOTION, type: 'zoom_in' } })).toBe(
      true
    );
  });

  it('is true when only the duration or easing differs', () => {
    expect(hasCameraMotion({ cameraMotion: { ...DEFAULT_CAMERA_MOTION, duration: 2.5 } })).toBe(
      true
    );
    expect(hasCameraMotion({ cameraMotion: { ...DEFAULT_CAMERA_MOTION, easing: 'linear' } })).toBe(
      true
    );
  });

  it('is false when the field is absent', () => {
    expect(hasCameraMotion({})).toBe(false);
  });

  it('treats a partial object as default rather than as content', () => {
    // Absent keys fall back to the default at read time anyway.
    expect(hasCameraMotion({ cameraMotion: { type: 'none' } })).toBe(false);
  });
});

describe('hasCustomBoxStyle', () => {
  it('is false for the default style', () => {
    expect(hasCustomBoxStyle({ dialogueBoxStyle: { ...DEFAULT_DIALOGUE_BOX_STYLE } })).toBe(false);
  });

  it('is true for any changed field', () => {
    for (const [key, value] of [
      ['style', 'slant_left'],
      ['borderColor', '#FF0000'],
      ['bgOpacity', 0.5],
      ['borderThickness', 6],
    ]) {
      const style = { ...DEFAULT_DIALOGUE_BOX_STYLE, [key]: value };
      expect(hasCustomBoxStyle({ dialogueBoxStyle: style }), key).toBe(true);
    }
  });

  it('is false when the field is absent', () => {
    expect(hasCustomBoxStyle({})).toBe(false);
  });
});
