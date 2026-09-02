// The script line modal edits into `sl.fields` and only commits on Save, so the
// buffer must never share objects with the live line. Three of the four fields
// used to be plain aliases, which made Cancel a no-op and let the next
// unrelated keystroke autosave the abandoned edit to disk.
import { describe, expect, it } from 'vitest';
import { resetFields, sl } from '../js/modals/scriptLine/state.js';

function lineWithEverything() {
  return {
    id: 'line_1',
    type: 'speaking',
    dialogue: 'It was you.',
    spriteIndex: 2,
    highlights: [{ startChar: 0, endChar: 2, color: '#FFFF00' }],
    cameraMotion: { type: 'zoom_in', duration: 1.5, easing: 'ease-in-out' },
    specialEffects: { effects: [{ type: 'shake', intensity: 0.5 }] },
    dialogueBoxStyle: { style: 'slant_left', borderColor: '#FF0000', bgOpacity: 0.9 },
  };
}

describe('resetFields', () => {
  it('shares no object with the line it loaded from', () => {
    const line = lineWithEverything();
    resetFields(line);

    expect(sl.fields.cameraMotion).not.toBe(line.cameraMotion);
    expect(sl.fields.specialEffects).not.toBe(line.specialEffects);
    expect(sl.fields.dialogueBoxStyle).not.toBe(line.dialogueBoxStyle);
    expect(sl.fields.highlights).not.toBe(line.highlights);
    // The shallow array copy still shared its entries.
    expect(sl.fields.highlights[0]).not.toBe(line.highlights[0]);
    expect(sl.fields.specialEffects.effects[0]).not.toBe(line.specialEffects.effects[0]);
  });

  it('leaves the line untouched when the tabs write to the buffer', () => {
    const line = lineWithEverything();
    resetFields(line);

    // Exactly what cameraTab, dialogueBoxTab and effectsTab do.
    sl.fields.cameraMotion.type = 'spin';
    sl.fields.dialogueBoxStyle.borderColor = '#00FF00';
    sl.fields.specialEffects.effects.splice(0, 1);
    sl.fields.highlights[0].color = '#0000FF';

    expect(line.cameraMotion.type).toBe('zoom_in');
    expect(line.dialogueBoxStyle.borderColor).toBe('#FF0000');
    expect(line.specialEffects.effects).toHaveLength(1);
    expect(line.highlights[0].color).toBe('#FFFF00');
  });

  it('still loads the line values rather than defaults', () => {
    resetFields(lineWithEverything());
    expect(sl.fields.spriteIndex).toBe(2);
    expect(sl.fields.cameraMotion.type).toBe('zoom_in');
    expect(sl.fields.dialogueBoxStyle.style).toBe('slant_left');
    expect(sl.fields.specialEffects.effects).toHaveLength(1);
  });

  it('falls back to defaults for a line that carries none of them', () => {
    resetFields({ id: 'line_2', type: 'narrator', text: 'Silence.' });
    expect(sl.fields.spriteIndex).toBeNull();
    expect(sl.fields.audioFile).toBeNull();
    expect(sl.fields.highlights).toEqual([]);
    expect(sl.fields.cameraMotion.type).toBe('none');
    expect(sl.fields.specialEffects.effects).toEqual([]);
    expect(sl.fields.dialogueBoxStyle.style).toBe('default');
  });

  it('does not let a defaulted buffer leak into the shared constants', () => {
    // The defaults are module-level objects; spreading them was what kept the
    // old code from corrupting them, and structuredClone has to do the same.
    resetFields({ id: 'line_3', type: 'narrator' });
    sl.fields.cameraMotion.type = 'spin';
    sl.fields.dialogueBoxStyle.borderColor = '#123456';

    resetFields({ id: 'line_4', type: 'narrator' });
    expect(sl.fields.cameraMotion.type).toBe('none');
    expect(sl.fields.dialogueBoxStyle.borderColor).toBe('#FFFFFF');
  });
});
