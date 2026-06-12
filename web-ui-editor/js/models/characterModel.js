// Character model - utility functions for working with characters
import { blockTypes } from '../core/constants.js';

export function getCharacterType(index) {
  return blockTypes[index] ? 'headmaster' : 'student';
}

export function isHeadmaster(index) {
  return blockTypes[index] === true;
}
