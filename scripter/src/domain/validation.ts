import { BLOOD_TYPES, CAST_SLOTS, DIFFICULTIES, MINIGAME_TYPES } from './constants.js';
import type { Character, ScriptLine, TruthBullet } from './types.js';
import type { BaseMinigame } from './minigame-types.js';

// ============================================================
// Validation Result
// ============================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function ok(): ValidationResult {
  return { valid: true, errors: [] };
}

function fail(...errors: string[]): ValidationResult {
  return { valid: false, errors };
}

function merge(...results: ValidationResult[]): ValidationResult {
  const errors = results.flatMap(r => r.errors);
  return { valid: errors.length === 0, errors };
}

// ============================================================
// Character Validation
// ============================================================

export function validateCharacter(char: Partial<Character>): ValidationResult {
  const errors: string[] = [];

  if (!char.name || char.name.trim().length === 0) {
    errors.push('Name is required');
  }
  if (!char.surname || char.surname.trim().length === 0) {
    errors.push('Surname is required');
  }
  if (!char.dob || char.dob.trim().length === 0) {
    errors.push('Date of birth is required');
  }
  if (char.position !== undefined && (char.position < 0 || char.position >= CAST_SLOTS)) {
    errors.push(`Position must be between 0 and ${CAST_SLOTS - 1}`);
  }
  if (char.blood && !BLOOD_TYPES.includes(char.blood)) {
    errors.push(`Blood type must be one of: ${BLOOD_TYPES.join(', ')}`);
  }
  if (char.heightM !== undefined && (char.heightM < 0 || char.heightM > 3)) {
    errors.push('Height (meters) must be between 0 and 3');
  }
  if (char.heightCM !== undefined && (char.heightCM < 0 || char.heightCM > 99)) {
    errors.push('Height (cm) must be between 0 and 99');
  }

  return errors.length > 0 ? fail(...errors) : ok();
}

// ============================================================
// Script Line Validation
// ============================================================

export function validateScriptLine(line: Partial<ScriptLine>): ValidationResult {
  const errors: string[] = [];

  if (!line.type) {
    errors.push('Line type is required');
    return fail(...errors);
  }

  if (!line.id || line.id.trim().length === 0) {
    errors.push('Line ID is required');
  }

  if (line.type === 'speaking') {
    if (!line.characterId || line.characterId.trim().length === 0) {
      errors.push('Speaking lines must have a character assigned');
    }
  }

  if (line.type === 'minigame') {
    if (!line.minigameId || line.minigameId.trim().length === 0) {
      errors.push('Minigame lines must reference a minigame');
    }
  }

  return errors.length > 0 ? fail(...errors) : ok();
}

// ============================================================
// Truth Bullet Validation
// ============================================================

export function validateTruthBullet(bullet: Partial<TruthBullet>): ValidationResult {
  const errors: string[] = [];

  if (!bullet.name || bullet.name.trim().length === 0) {
    errors.push('Truth bullet name is required');
  }
  if (!bullet.description || bullet.description.trim().length === 0) {
    errors.push('Truth bullet description is required');
  }

  return errors.length > 0 ? fail(...errors) : ok();
}

// ============================================================
// Minigame Validation
// ============================================================

export function validateMinigame(minigame: Partial<BaseMinigame> & { gameType?: string }): ValidationResult {
  const errors: string[] = [];

  if (!minigame.gameId || minigame.gameId.trim().length === 0) {
    errors.push('Minigame ID is required');
  }
  if (!minigame.gameType || !(MINIGAME_TYPES as readonly string[]).includes(minigame.gameType)) {
    errors.push(`Game type must be one of: ${MINIGAME_TYPES.join(', ')}`);
  }
  if (minigame.difficulty && !DIFFICULTIES.includes(minigame.difficulty)) {
    errors.push(`Difficulty must be one of: ${DIFFICULTIES.join(', ')}`);
  }
  if (minigame.timeLimit !== undefined && (minigame.timeLimit < 10 || minigame.timeLimit > 300)) {
    errors.push('Time limit must be between 10 and 300 seconds');
  }

  return errors.length > 0 ? fail(...errors) : ok();
}

// ============================================================
// Compound validators
// ============================================================

export function validateTrialData(data: {
  trialName?: string;
  characters?: unknown[];
  scriptLines?: Partial<ScriptLine>[];
  truthBullets?: Partial<TruthBullet>[];
  minigames?: (Partial<BaseMinigame> & { gameType?: string })[];
}): ValidationResult {
  const results: ValidationResult[] = [];

  if (!data.trialName || data.trialName.trim().length === 0) {
    results.push(fail('Trial name is required'));
  }

  if (data.characters && data.characters.length > CAST_SLOTS) {
    results.push(fail(`Cast cannot exceed ${CAST_SLOTS} slots`));
  }

  if (data.scriptLines) {
    for (const line of data.scriptLines) {
      results.push(validateScriptLine(line));
    }
  }

  if (data.truthBullets) {
    for (const bullet of data.truthBullets) {
      results.push(validateTruthBullet(bullet));
    }
  }

  if (data.minigames) {
    for (const mg of data.minigames) {
      results.push(validateMinigame(mg));
    }
  }

  return merge(...results);
}

export { ok, fail, merge };
