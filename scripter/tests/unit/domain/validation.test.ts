import { describe, it, expect } from 'vitest';
import {
  validateCharacter,
  validateScriptLine,
  validateTruthBullet,
  validateMinigame,
  validateTrialData,
} from '../../../src/domain/validation.js';

describe('validateCharacter', () => {
  const validChar = {
    name: 'Makoto',
    surname: 'Naegi',
    dob: '1993-02-05',
    blood: 'A' as const,
    heightM: 1,
    heightCM: 60,
    position: 0,
  };

  it('passes for valid character', () => {
    expect(validateCharacter(validChar).valid).toBe(true);
  });

  it('fails when name is empty', () => {
    const result = validateCharacter({ ...validChar, name: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Name is required');
  });

  it('fails when surname is empty', () => {
    const result = validateCharacter({ ...validChar, surname: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Surname is required');
  });

  it('fails when dob is empty', () => {
    const result = validateCharacter({ ...validChar, dob: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Date of birth is required');
  });

  it('fails for out-of-range position', () => {
    const result = validateCharacter({ ...validChar, position: 20 });
    expect(result.valid).toBe(false);
  });

  it('fails for invalid blood type', () => {
    const result = validateCharacter({ ...validChar, blood: 'X' as never });
    expect(result.valid).toBe(false);
  });

  it('collects multiple errors', () => {
    const result = validateCharacter({ name: '', surname: '', dob: '' });
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('validateScriptLine', () => {
  it('passes for a valid speaking line', () => {
    const result = validateScriptLine({
      id: 'line_1',
      type: 'speaking',
      characterId: 'char_1',
    });
    expect(result.valid).toBe(true);
  });

  it('fails when speaking line has no character', () => {
    const result = validateScriptLine({
      id: 'line_1',
      type: 'speaking',
      characterId: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Speaking lines must have a character assigned');
  });

  it('fails when minigame line has no minigame reference', () => {
    const result = validateScriptLine({
      id: 'line_1',
      type: 'minigame',
      minigameId: '',
    });
    expect(result.valid).toBe(false);
  });

  it('passes for narrator line without character', () => {
    const result = validateScriptLine({
      id: 'line_1',
      type: 'narrator',
    });
    expect(result.valid).toBe(true);
  });

  it('fails when type is missing', () => {
    const result = validateScriptLine({ id: 'line_1' });
    expect(result.valid).toBe(false);
  });
});

describe('validateTruthBullet', () => {
  it('passes for valid bullet', () => {
    const result = validateTruthBullet({ name: 'Evidence', description: 'Found at the scene' });
    expect(result.valid).toBe(true);
  });

  it('fails when name is empty', () => {
    const result = validateTruthBullet({ name: '', description: 'desc' });
    expect(result.valid).toBe(false);
  });

  it('fails when description is empty', () => {
    const result = validateTruthBullet({ name: 'name', description: '' });
    expect(result.valid).toBe(false);
  });
});

describe('validateMinigame', () => {
  it('passes for valid minigame', () => {
    const result = validateMinigame({
      gameId: 'mg_1',
      gameType: 'nonstop_debate',
      difficulty: 'medium',
      timeLimit: 60,
    });
    expect(result.valid).toBe(true);
  });

  it('fails for unknown game type', () => {
    const result = validateMinigame({
      gameId: 'mg_1',
      gameType: 'unknown_type',
      difficulty: 'medium',
      timeLimit: 60,
    });
    expect(result.valid).toBe(false);
  });

  it('fails for time limit out of range', () => {
    const result = validateMinigame({
      gameId: 'mg_1',
      gameType: 'logic_dive',
      timeLimit: 5,
    });
    expect(result.valid).toBe(false);
  });
});

describe('validateTrialData', () => {
  it('passes for minimal valid trial', () => {
    const result = validateTrialData({ trialName: 'Test Trial' });
    expect(result.valid).toBe(true);
  });

  it('fails when trial name is empty', () => {
    const result = validateTrialData({ trialName: '' });
    expect(result.valid).toBe(false);
  });

  it('validates nested entities', () => {
    const result = validateTrialData({
      trialName: 'Test',
      truthBullets: [{ name: '', description: 'desc' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Truth bullet name is required');
  });
});
