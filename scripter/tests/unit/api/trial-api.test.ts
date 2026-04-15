import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrialAPI } from '../../../src/api/trial-api.js';
import type { Character, TruthBullet } from '../../../src/domain/types.js';
import type { NonstopDebate } from '../../../src/domain/minigame-types.js';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test_char_1',
    name: 'Makoto',
    surname: 'Naegi',
    heightM: 1,
    heightCM: 60,
    weight: '52',
    chest: '75',
    blood: 'A',
    dob: '1993-02-05',
    likes: 'Hope',
    dislikes: 'Despair',
    notes: '',
    isHeadmaster: false,
    position: 0,
    lastModified: new Date().toISOString(),
    ...overrides,
  };
}

describe('TrialAPI', () => {
  let api: TrialAPI;

  beforeEach(() => {
    api = new TrialAPI();
  });

  // ---- Trial Name ----

  describe('trial name', () => {
    it('starts empty', () => {
      expect(api.getTrialName()).toBe('');
    });

    it('can be set and retrieved', () => {
      api.setTrialName('Class Trial Chapter 1');
      expect(api.getTrialName()).toBe('Class Trial Chapter 1');
    });

    it('emits event on name change', () => {
      const handler = vi.fn();
      api.on('trial:name-changed', handler);
      api.setTrialName('Test');
      expect(handler).toHaveBeenCalledWith({ type: 'trial:name-changed', name: 'Test' });
    });
  });

  // ---- Cast ----

  describe('cast', () => {
    it('starts with 17 null slots', () => {
      const cast = api.getCast();
      expect(cast.length).toBe(17);
      expect(cast.every(c => c === null)).toBe(true);
    });

    it('can set a character at a position', () => {
      const char = makeCharacter();
      api.setCharacter(0, char);
      expect(api.getCharacterAtPosition(0)?.name).toBe('Makoto');
    });

    it('emits cast:set event', () => {
      const handler = vi.fn();
      api.on('cast:set', handler);
      api.setCharacter(5, makeCharacter({ position: 5 }));
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].position).toBe(5);
    });

    it('can remove a character', () => {
      api.setCharacter(0, makeCharacter());
      api.removeCharacter(0);
      expect(api.getCharacterAtPosition(0)).toBeNull();
    });

    it('throws on invalid position', () => {
      expect(() => api.setCharacter(-1, makeCharacter())).toThrow();
      expect(() => api.setCharacter(17, makeCharacter())).toThrow();
    });

    it('can find character by ID', () => {
      api.setCharacter(3, makeCharacter({ id: 'unique_id' }));
      expect(api.getCharacter('unique_id')?.name).toBe('Makoto');
      expect(api.getCharacter('nonexistent')).toBeNull();
    });
  });

  // ---- Script Lines ----

  describe('script lines', () => {
    it('starts empty', () => {
      expect(api.getScriptLines().length).toBe(0);
    });

    it('can add a speaking line', () => {
      const line = api.addScriptLine({
        type: 'speaking',
        characterId: 'char_1',
        dialogue: 'Hello!',
        spriteIndex: null,
        audioFile: null,
        highlights: [],
        cameraMotion: { type: 'none', duration: 1.0, easing: 'ease-in-out' },
        specialEffects: { effects: [] },
        dialogueBoxStyle: { style: 'default', borderColor: '#FFF', bgOpacity: 0.9, borderThickness: 2 },
      });
      expect(line.id).toMatch(/^line_/);
      expect(line.order).toBe(0);
      expect(api.getScriptLines().length).toBe(1);
    });

    it('auto-increments order', () => {
      api.addScriptLine({ type: 'narrator', dialogue: 'First', audioFile: null, highlights: [], specialEffects: { effects: [] }, dialogueBoxStyle: { style: 'default', borderColor: '#FFF', bgOpacity: 0.9, borderThickness: 2 } });
      const second = api.addScriptLine({ type: 'narrator', dialogue: 'Second', audioFile: null, highlights: [], specialEffects: { effects: [] }, dialogueBoxStyle: { style: 'default', borderColor: '#FFF', bgOpacity: 0.9, borderThickness: 2 } });
      expect(second.order).toBe(1);
    });

    it('can update a line', () => {
      const line = api.addScriptLine({ type: 'narrator', dialogue: 'Original', audioFile: null, highlights: [], specialEffects: { effects: [] }, dialogueBoxStyle: { style: 'default', borderColor: '#FFF', bgOpacity: 0.9, borderThickness: 2 } });
      const updated = api.updateScriptLine(line.id, { dialogue: 'Updated' });
      expect(updated.dialogue).toBe('Updated');
      expect(updated.id).toBe(line.id);
    });

    it('can delete lines', () => {
      const l1 = api.addScriptLine({ type: 'narrator', dialogue: '1', audioFile: null, highlights: [], specialEffects: { effects: [] }, dialogueBoxStyle: { style: 'default', borderColor: '#FFF', bgOpacity: 0.9, borderThickness: 2 } });
      const l2 = api.addScriptLine({ type: 'narrator', dialogue: '2', audioFile: null, highlights: [], specialEffects: { effects: [] }, dialogueBoxStyle: { style: 'default', borderColor: '#FFF', bgOpacity: 0.9, borderThickness: 2 } });
      api.addScriptLine({ type: 'narrator', dialogue: '3', audioFile: null, highlights: [], specialEffects: { effects: [] }, dialogueBoxStyle: { style: 'default', borderColor: '#FFF', bgOpacity: 0.9, borderThickness: 2 } });

      api.deleteScriptLines([l1.id, l2.id]);
      expect(api.getScriptLines().length).toBe(1);
      expect(api.getScriptLines()[0].order).toBe(0); // reindexed
    });

    it('can reorder lines', () => {
      const l1 = api.addScriptLine({ type: 'narrator', dialogue: 'A', audioFile: null, highlights: [], specialEffects: { effects: [] }, dialogueBoxStyle: { style: 'default', borderColor: '#FFF', bgOpacity: 0.9, borderThickness: 2 } });
      api.addScriptLine({ type: 'narrator', dialogue: 'B', audioFile: null, highlights: [], specialEffects: { effects: [] }, dialogueBoxStyle: { style: 'default', borderColor: '#FFF', bgOpacity: 0.9, borderThickness: 2 } });
      api.addScriptLine({ type: 'narrator', dialogue: 'C', audioFile: null, highlights: [], specialEffects: { effects: [] }, dialogueBoxStyle: { style: 'default', borderColor: '#FFF', bgOpacity: 0.9, borderThickness: 2 } });

      // Move A to the end
      api.reorderScriptLines([l1.id], 3);
      const lines = api.getScriptLines();
      expect((lines[0] as { dialogue: string }).dialogue).toBe('B');
      expect((lines[2] as { dialogue: string }).dialogue).toBe('A');
    });

    it('emits events on CRUD', () => {
      const handler = vi.fn();
      api.onAny(handler);
      const line = api.addScriptLine({ type: 'narrator', dialogue: 'Test', audioFile: null, highlights: [], specialEffects: { effects: [] }, dialogueBoxStyle: { style: 'default', borderColor: '#FFF', bgOpacity: 0.9, borderThickness: 2 } });
      api.updateScriptLine(line.id, { dialogue: 'Updated' });
      api.deleteScriptLines([line.id]);
      expect(handler).toHaveBeenCalledTimes(3);
    });
  });

  // ---- Truth Bullets ----

  describe('truth bullets', () => {
    const bulletData: Omit<TruthBullet, 'bulletId'> = {
      name: 'Bloody Knife',
      description: 'Found in the kitchen',
      imageFile: null,
      inversedLieBulletName: '',
    };

    it('can add and retrieve', () => {
      const bullet = api.addTruthBullet(bulletData);
      expect(bullet.bulletId).toMatch(/^tb_/);
      expect(api.getTruthBullets().length).toBe(1);
    });

    it('can update', () => {
      const bullet = api.addTruthBullet(bulletData);
      const updated = api.updateTruthBullet(bullet.bulletId, { name: 'Clean Knife' });
      expect(updated.name).toBe('Clean Knife');
    });

    it('can delete', () => {
      const bullet = api.addTruthBullet(bulletData);
      api.deleteTruthBullet(bullet.bulletId);
      expect(api.getTruthBullets().length).toBe(0);
    });

    it('throws on not found', () => {
      expect(() => api.updateTruthBullet('fake', { name: 'x' })).toThrow('not found');
      expect(() => api.deleteTruthBullet('fake')).toThrow('not found');
    });
  });

  // ---- Minigames ----

  describe('minigames', () => {
    it('can add a nonstop debate', () => {
      const mg = api.addMinigame({
        name: 'Who did it?',
        gameType: 'nonstop_debate',
        difficulty: 'medium',
        timeLimit: 60,
        typeSpecific: { selectedBullets: [], dialogueLines: [] },
      } as Omit<NonstopDebate, 'gameId'>);
      expect(mg.gameId).toMatch(/^mg_/);
      expect(mg.gameType).toBe('nonstop_debate');
    });

    it('can update a minigame', () => {
      const mg = api.addMinigame({
        name: 'Test',
        gameType: 'logic_dive',
        difficulty: 'easy',
        timeLimit: 30,
        typeSpecific: { questions: [] },
      });
      const updated = api.updateMinigame(mg.gameId, { name: 'Updated' });
      expect(updated.name).toBe('Updated');
    });

    it('resets typeSpecific when gameType changes', () => {
      const mg = api.addMinigame({
        name: 'Test',
        gameType: 'nonstop_debate',
        difficulty: 'medium',
        timeLimit: 60,
        typeSpecific: { selectedBullets: ['b1'], dialogueLines: [] },
      } as Omit<NonstopDebate, 'gameId'>);

      const updated = api.updateMinigame(mg.gameId, { gameType: 'hangmans_gambit' } as Partial<NonstopDebate>);
      expect((updated.typeSpecific as { answerKey?: string }).answerKey).toBe('');
    });

    it('clears script line references on delete', () => {
      const mg = api.addMinigame({
        name: 'Test',
        gameType: 'logic_dive',
        difficulty: 'easy',
        timeLimit: 30,
        typeSpecific: { questions: [] },
      });
      const line = api.addScriptLine({ type: 'minigame', minigameId: mg.gameId });
      api.deleteMinigame(mg.gameId);

      const updatedLine = api.getScriptLine(line.id);
      expect(updatedLine?.type).toBe('minigame');
      if (updatedLine?.type === 'minigame') {
        expect(updatedLine.minigameId).toBe('');
      }
    });
  });

  // ---- Serialization ----

  describe('serialization', () => {
    it('round-trips through toJSON/fromJSON', () => {
      api.setTrialName('Test Trial');
      const char = makeCharacter({ id: 'char_1', position: 0 });
      api.setCharacter(0, char);
      api.addScriptLine({ type: 'narrator', dialogue: 'Hello', audioFile: null, highlights: [], specialEffects: { effects: [] }, dialogueBoxStyle: { style: 'default', borderColor: '#FFF', bgOpacity: 0.9, borderThickness: 2 } });
      api.addTruthBullet({ name: 'Evidence', description: 'Clue', imageFile: null, inversedLieBulletName: '' });

      const json = api.toJSON();
      expect(json.trialName).toBe('Test Trial');
      expect(json.characters[0]).toBe('char_1');
      expect(json.script.lines.length).toBe(1);
      expect(json.truthBullets.length).toBe(1);
      expect(json.metadata.version).toBe('4.0');

      // Reconstruct
      const api2 = TrialAPI.fromJSON(json, api.getCast().slice() as (Character | null)[]);
      expect(api2.getTrialName()).toBe('Test Trial');
      expect(api2.getCharacterAtPosition(0)?.name).toBe('Makoto');
      expect(api2.getScriptLines().length).toBe(1);
    });

    it('handles empty trial', () => {
      const json = api.toJSON();
      expect(json.characters.length).toBe(17);
      expect(json.characters.every(c => c === null)).toBe(true);
      expect(json.script.lines.length).toBe(0);
    });
  });

  // ---- Reset ----

  describe('reset', () => {
    it('clears all state', () => {
      api.setTrialName('Test');
      api.setCharacter(0, makeCharacter());
      api.addScriptLine({ type: 'narrator', dialogue: 'x', audioFile: null, highlights: [], specialEffects: { effects: [] }, dialogueBoxStyle: { style: 'default', borderColor: '#FFF', bgOpacity: 0.9, borderThickness: 2 } });

      api.reset();
      expect(api.getTrialName()).toBe('');
      expect(api.getCast().every(c => c === null)).toBe(true);
      expect(api.getScriptLines().length).toBe(0);
    });
  });
});
