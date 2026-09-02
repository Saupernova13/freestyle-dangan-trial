// @vitest-environment jsdom
//
// The shared fixture is the closest thing the project has to an editor-engine
// tripwire, and its nonstop_debate payload was fiction: `text`, `isWeakPoint`
// and `correctBulletId` appeared in that one file and nowhere else in the
// repo. Both validators passed it because both deliberately decline to
// constrain typeSpecific, so nothing noticed for as long as it existed.
//
// jsdom because the editor module transitively imports app.js (#53).
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createDialogueLine } from '../js/views/minigames/nonstopDebateEditor.js';
import { createEmptyPanicLine } from '../js/views/minigames/massPanicDebateEditor.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(
    resolve(here, '../../freestyle-dangan-trial/tests/fixtures/minimal-trial/trial.json'),
    'utf8'
  )
);

const debate = fixture.minigames.find((mg) => mg.gameType === 'nonstop_debate');

describe('the shared fixture', () => {
  it('has a nonstop debate to check', () => {
    expect(debate).toBeDefined();
    expect(debate.typeSpecific.dialogueLines.length).toBeGreaterThan(0);
  });

  it('writes the dialogue-line fields the editor writes', () => {
    const authored = Object.keys(createDialogueLine('dl_x', 0)).sort();
    for (const line of debate.typeSpecific.dialogueLines) {
      expect(Object.keys(line).sort()).toEqual(authored);
    }
  });

  it('carries no field the editor never writes', () => {
    // The three that were there: text, isWeakPoint, correctBulletId.
    const authored = new Set(Object.keys(createDialogueLine('dl_x', 0)));
    for (const line of debate.typeSpecific.dialogueLines) {
      const unknown = Object.keys(line).filter((k) => !authored.has(k));
      expect(unknown).toEqual([]);
    }
  });

  it('arms the bullet its weak point answers with', () => {
    // The engine arms exactly selectedBullets, so a fixture that named an
    // answer outside them would certify an unwinnable debate.
    const armed = new Set(debate.typeSpecific.selectedBullets);
    for (const line of debate.typeSpecific.dialogueLines) {
      if (!line.answerBulletId) continue;
      expect(armed.has(line.answerBulletId)).toBe(true);
    }
  });

  it('references only truth bullets and characters the trial declares', () => {
    const bulletIds = new Set(fixture.truthBullets.map((b) => b.bulletId));
    const castIds = new Set(fixture.characters.filter(Boolean));
    for (const id of debate.typeSpecific.selectedBullets) {
      expect(bulletIds.has(id)).toBe(true);
    }
    for (const line of debate.typeSpecific.dialogueLines) {
      if (line.answerBulletId) expect(bulletIds.has(line.answerBulletId)).toBe(true);
      if (line.characterId) expect(castIds.has(line.characterId)).toBe(true);
    }
  });

  it('keeps the mass panic line shape available to check the same way', () => {
    // No mass panic minigame in the fixture yet; this pins the factory so a
    // future one cannot be hand-authored against a shape nothing writes.
    expect(Object.keys(createEmptyPanicLine())).toContain('answerBulletId');
    expect(Object.keys(createEmptyPanicLine())).toContain('sentenceBeginning');
  });
});
