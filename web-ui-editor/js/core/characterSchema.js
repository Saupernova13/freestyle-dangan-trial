// Runtime validation for character.json, mirroring
// schema/character.schema.json the way trialSchema.js mirrors the trial one.
// tests/characterSchema.test.js cross-checks the two with ajv.
//
// Roughly half the on-disk format had no schema, no validator, no CI check and
// no version. The engine consumes the file as an untyped Dictionary, so a
// missing id produced a character the trial references and cannot resolve -
// the "null" guard in character_library.gd is a scar from exactly that.
//
// Keep DOM-free: those tests run under node.
import { CHARACTER_FORMAT_VERSION } from './constants.js';

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isString = (v) => typeof v === 'string';
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const VERSION_PATTERN = /^\d+\.\d+$/;
// Same rule as every other id: these reach inline event handlers in the views.
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

// Optional fields and their checks. Absent is always fine - a draft character
// is a supported state - and unknown fields are left alone so a newer editor's
// addition does not make an older one reject the file.
const OPTIONAL = {
  formatVersion: ['in "<major>.<minor>" form', (v) => isString(v) && VERSION_PATTERN.test(v)],
  heightM: ['a number', isNumber],
  heightCM: ['a number', isNumber],
  weight: ['a number', isNumber],
  chest: ['a number', isNumber],
  blood: ['a string', isString],
  dob: ['a string', isString],
  likes: ['a string', isString],
  dislikes: ['a string', isString],
  notes: ['a string', isString],
  isHeadmaster: ['a boolean', (v) => typeof v === 'boolean'],
  position: ['a cast slot from 0 to 16', (v) => Number.isInteger(v) && v >= 0 && v <= 16],
  lastModified: ['a string', isString],
};

// Human-readable problems; empty means the file is usable.
export function validateCharacterData(data) {
  const issues = [];
  if (!isObject(data)) return ['character.json is not an object.'];

  if (!isString(data.id) || !ID_PATTERN.test(data.id)) {
    issues.push('id is missing or not a valid id.');
  }
  if (!isString(data.name)) issues.push('name is missing or not a string.');
  if (!isString(data.surname)) issues.push('surname is missing or not a string.');

  for (const [key, [label, test]] of Object.entries(OPTIONAL)) {
    if (!(key in data) || data[key] === undefined) continue;
    if (!test(data[key])) issues.push(`${key} is not ${label}.`);
  }
  return issues;
}

// ok=false only for a NEWER major, matching trial.json's gate. A missing
// version is a file written before the field existed, not an error.
export function checkCharacterFormatVersion(data) {
  const supportedMajor = parseInt(CHARACTER_FORMAT_VERSION.split('.')[0], 10);
  const version = isObject(data) ? data.formatVersion : null;
  if (!isString(version) || !VERSION_PATTERN.test(version)) {
    return { ok: true, message: '' };
  }
  const major = parseInt(version.split('.')[0], 10);
  if (major > supportedMajor) {
    return {
      ok: false,
      message:
        `This character uses format ${version}, made with a newer editor than ` +
        `this one (format ${CHARACTER_FORMAT_VERSION}).`,
    };
  }
  return { ok: true, message: '' };
}
