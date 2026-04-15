import { CAST_SLOTS } from '../../domain/constants.js';
import type { Character } from '../../domain/types.js';
import { validateCharacter } from '../../domain/validation.js';

export interface CastState {
  cast: (Character | null)[];
}

export function setCharacter(state: CastState, position: number, character: Character): void {
  if (position < 0 || position >= CAST_SLOTS) {
    throw new RangeError(`Position must be between 0 and ${CAST_SLOTS - 1}`);
  }
  const result = validateCharacter(character);
  if (!result.valid) {
    throw new Error(`Invalid character: ${result.errors.join(', ')}`);
  }
  state.cast[position] = { ...character, position };
}

export function removeCharacter(state: CastState, position: number): void {
  if (position < 0 || position >= CAST_SLOTS) {
    throw new RangeError(`Position must be between 0 and ${CAST_SLOTS - 1}`);
  }
  state.cast[position] = null;
}
