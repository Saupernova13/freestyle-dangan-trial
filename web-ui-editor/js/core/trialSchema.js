// Runtime validation for trial.json. schema/trial.schema.json is normative;
// this hand-written mirror keeps a schema engine out of the bundle and emits
// author-friendly messages. tests/schema.test.js cross-checks the two with ajv.
//
// That cross-check covers the envelope only. Both sides deliberately decline
// to constrain typeSpecific, so a minigame payload can hold anything and pass
// - which is how the shared fixture came to certify field names no code has
// ever written or read. See #59.
//
// Keep DOM-free: those tests run under node.
import { FORMAT_VERSION, MINIGAME_TYPE_LABELS } from './constants.js';

const LINE_TYPES = ['speaking', 'narrator', 'minigame'];
const GAME_TYPES = Object.keys(MINIGAME_TYPE_LABELS);
const VERSION_PATTERN = /^\d+\.\d+$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

// Ids are interpolated into inline event handlers and data-* attributes all
// over the views, so their shape is a security boundary rather than a style
// rule: a quote character in an id closes the handler's string argument and
// the rest of the id is evaluated as JavaScript the moment the view renders,
// with no click required. Sharing .drtrial files is the format's purpose, so
// ids arrive from other people by design.
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isString = (v) => typeof v === 'string';
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const isStringOrNull = (v) => v === null || typeof v === 'string';
const isId = (v) => typeof v === 'string' && ID_PATTERN.test(v);

// Quoted and clipped: this text is shown to the author, and the whole point is
// that the value may contain markup or script.
const describeId = (value, where) =>
  `${where} is not a valid id: ${JSON.stringify(String(value)).slice(0, 80)}`;

// Every id the views interpolate, checked in one pass. Empty means the file is
// safe to render. Unlike validateTrialData this is a gate, not a report:
// callers refuse the file rather than opening it with warnings.
export function findUnsafeIds(data) {
  const bad = [];
  if (!isObject(data)) return bad;

  const check = (value, where) => {
    if (value === undefined || value === null) return;
    if (!isId(value)) bad.push(describeId(value, where));
  };

  if (Array.isArray(data.characters)) {
    data.characters.forEach((c, i) => check(c, `characters[${i}]`));
  }
  if (isObject(data.script) && Array.isArray(data.script.lines)) {
    data.script.lines.forEach((line, i) => {
      if (!isObject(line)) return;
      check(line.id, `script.lines[${i}].id`);
      check(line.characterId, `script.lines[${i}].characterId`);
      check(line.minigameId, `script.lines[${i}].minigameId`);
    });
  }
  if (Array.isArray(data.minigames)) {
    data.minigames.forEach((mg, i) => {
      if (isObject(mg)) check(mg.gameId, `minigames[${i}].gameId`);
    });
  }
  if (Array.isArray(data.truthBullets)) {
    data.truthBullets.forEach((b, i) => {
      if (isObject(b)) check(b.bulletId, `truthBullets[${i}].bulletId`);
    });
  }
  return bad;
}

// ok=false only for a NEWER major. A missing or unparseable version still
// passes, with a warning, so legacy files stay openable.
export function checkFormatVersion(data) {
  const supportedMajor = parseInt(FORMAT_VERSION.split('.')[0], 10);
  const version = isObject(data) && isObject(data.metadata) ? data.metadata.version : undefined;
  if (!isString(version) || !VERSION_PATTERN.test(version)) {
    return {
      ok: true,
      message: 'This trial has no readable format version; treating it as a legacy file.',
    };
  }
  const major = parseInt(version.split('.')[0], 10);
  if (major > supportedMajor) {
    return {
      ok: false,
      message: `This trial uses format ${version}, made with a newer editor than this one (format ${FORMAT_VERSION}). Update the editor to open it safely.`,
    };
  }
  if (major < supportedMajor) {
    return {
      ok: true,
      message: `This trial uses the older format ${version}; it will be upgraded to ${FORMAT_VERSION} on the next save.`,
    };
  }
  return { ok: true, message: '' };
}

function validateScriptLine(line, n, issues) {
  if (!isObject(line)) {
    issues.push(`Script line ${n} is not an object.`);
    return;
  }
  if (!isString(line.id)) issues.push(`Script line ${n} has no id.`);
  if (!isString(line.type) || !LINE_TYPES.includes(line.type)) {
    issues.push(`Script line ${n} has an unknown type "${line.type}".`);
    return;
  }
  if (line.type === 'speaking') {
    if (!isString(line.characterId)) issues.push(`Line ${n}: speaking line has no characterId.`);
    if (!isString(line.dialogue)) issues.push(`Line ${n}: speaking line has no dialogue.`);
  } else if (line.type === 'narrator') {
    if (!isString(line.text)) issues.push(`Line ${n}: narrator line has no text.`);
  } else if (line.type === 'minigame') {
    if (!isString(line.minigameId)) issues.push(`Line ${n}: minigame line has no minigameId.`);
  }
  if ('order' in line && !isNumber(line.order)) issues.push(`Line ${n}: order is not a number.`);
  if ('audioFile' in line && !isStringOrNull(line.audioFile))
    issues.push(`Line ${n}: audioFile is not a string.`);
  if ('spriteIndex' in line && line.spriteIndex !== null && !Number.isInteger(line.spriteIndex))
    issues.push(`Line ${n}: spriteIndex is not an integer.`);
  if ('cameraMotion' in line && !isObject(line.cameraMotion))
    issues.push(`Line ${n}: cameraMotion is not an object.`);
  if ('specialEffects' in line) {
    if (!isObject(line.specialEffects)) {
      issues.push(`Line ${n}: specialEffects is not an object.`);
    } else if ('effects' in line.specialEffects && !Array.isArray(line.specialEffects.effects)) {
      issues.push(`Line ${n}: specialEffects.effects is not an array.`);
    }
  }
  if ('dialogueBoxStyle' in line && !isObject(line.dialogueBoxStyle))
    issues.push(`Line ${n}: dialogueBoxStyle is not an object.`);
  if ('highlights' in line) {
    if (!Array.isArray(line.highlights)) {
      issues.push(`Line ${n}: highlights is not an array.`);
    } else {
      line.highlights.forEach((h, hi) => {
        const ok =
          isObject(h) &&
          Number.isInteger(h.startChar) &&
          h.startChar >= 0 &&
          Number.isInteger(h.endChar) &&
          h.endChar >= 0 &&
          isString(h.color) &&
          COLOR_PATTERN.test(h.color);
        if (!ok) issues.push(`Line ${n}: highlight ${hi + 1} is malformed.`);
      });
    }
  }
}

function validateMinigame(mg, n, issues) {
  if (!isObject(mg)) {
    issues.push(`Minigame ${n} is not an object.`);
    return;
  }
  if (!isString(mg.gameId)) issues.push(`Minigame ${n} has no gameId.`);
  if (!isString(mg.gameType) || !GAME_TYPES.includes(mg.gameType))
    issues.push(`Minigame ${n} has an unknown gameType "${mg.gameType}".`);
  if ('name' in mg && !isString(mg.name)) issues.push(`Minigame ${n}: name is not a string.`);
  if ('difficulty' in mg && !isString(mg.difficulty))
    issues.push(`Minigame ${n}: difficulty is not a string.`);
  if ('timeLimit' in mg && !isNumber(mg.timeLimit))
    issues.push(`Minigame ${n}: timeLimit is not a number.`);
  if ('failComment' in mg && !isString(mg.failComment))
    issues.push(`Minigame ${n}: failComment is not a string.`);
  if ('typeSpecific' in mg && !isObject(mg.typeSpecific))
    issues.push(`Minigame ${n}: typeSpecific is not an object.`);
  else if (isObject(mg.typeSpecific)) validateTypeSpecific(mg, n, issues);
}

// Field name -> the check it must pass. Absent fields are fine: every one of
// these has a default on both sides. Unknown fields are fine too, so a newer
// editor's addition does not make an older one reject the file - the point is
// to catch a renamed or wrongly typed key, not to freeze the format.
const STR = ['a string', isString];
const STR_OR_NULL = ['a string or null', isStringOrNull];
const NUM = ['a number', isNumber];
const BOOL = ['a boolean', (v) => typeof v === 'boolean'];
const STR_ARRAY = ['an array of strings', (v) => Array.isArray(v) && v.every(isString)];

const DEBATE_LINE = {
  lineId: STR,
  order: NUM,
  sentenceBeginning: STR,
  target: STR,
  sentenceEnd: STR,
  isShootable: BOOL,
  answerBulletId: STR_OR_NULL,
  useNegativeBullet: BOOL,
  isWhiteNoise: BOOL,
  characterId: STR,
  characterSpotlight: BOOL,
  textEffect: STR,
  textFont: STR,
  textMovementDirection: STR,
  userFailedComment: STR,
  userWrongAnswerComment: STR,
  voiceLineFile: STR_OR_NULL,
};

const PANIC_LINE = {
  sentenceBeginning: STR,
  target: STR,
  sentenceEnd: STR,
  isLoudAssertion: BOOL,
  answerBulletId: STR_OR_NULL,
  textEffect: STR,
  textFont: STR,
  textMovementDirection: STR,
  voiceLineFile: STR_OR_NULL,
};

const LOGIC_DIVE_ANSWER = { answerId: STR, answerText: STR, isCorrect: BOOL };

const SCRUM_ARGUMENT = {
  argumentId: STR,
  order: NUM,
  oppositionStatement: STR,
  oppositionCharacterId: STR,
  oppositionAudioFile: STR_OR_NULL,
  oppositionKeywords: STR_ARRAY,
  defenseStatement: STR,
  defenseCharacterId: STR,
  defenseAudioFile: STR_OR_NULL,
  defenseKeywords: STR_ARRAY,
};

// Checks the fields present against `fields`, and that `required` are there.
function checkShape(value, fields, required, where, issues) {
  if (!isObject(value)) {
    issues.push(`${where} is not an object.`);
    return;
  }
  for (const key of required || []) {
    if (!isString(value[key])) issues.push(`${where}: ${key} is missing or not a string.`);
  }
  for (const [key, [label, test]] of Object.entries(fields)) {
    if (!(key in value) || value[key] === undefined) continue;
    if (!test(value[key])) issues.push(`${where}: ${key} is not ${label}.`);
  }
}

function checkList(container, key, where, issues, check) {
  if (!(key in container)) return;
  if (!Array.isArray(container[key])) {
    issues.push(`${where}: ${key} is not an array.`);
    return;
  }
  container[key].forEach((item, i) => check(item, `${where} ${key}[${i}]`));
}

// gameType -> its payload check. The three types with no editor carry no
// payload yet, so there is nothing about them that would be true.
const TYPE_SPECIFIC_CHECKS = {
  nonstop_debate(ts, where, issues) {
    if ('selectedBullets' in ts && !STR_ARRAY[1](ts.selectedBullets)) {
      issues.push(`${where}: selectedBullets is not ${STR_ARRAY[0]}.`);
    }
    checkList(ts, 'dialogueLines', where, issues, (line, at) =>
      checkShape(line, DEBATE_LINE, ['lineId'], at, issues)
    );
  },
  mass_panic_debate(ts, where, issues) {
    for (const key of ['speaker1CharacterId', 'speaker2CharacterId', 'speaker3CharacterId']) {
      if (key in ts && !isString(ts[key])) issues.push(`${where}: ${key} is not a string.`);
    }
    checkList(ts, 'lineGroups', where, issues, (group, at) => {
      checkShape(group, { groupId: STR, order: NUM }, ['groupId'], at, issues);
      if (!isObject(group)) return;
      for (const speaker of ['speaker1', 'speaker2', 'speaker3']) {
        if (speaker in group) {
          checkShape(group[speaker], PANIC_LINE, [], `${at}.${speaker}`, issues);
        }
      }
    });
  },
  logic_dive(ts, where, issues) {
    checkList(ts, 'questions', where, issues, (question, at) => {
      checkShape(
        question,
        { questionId: STR, order: NUM, questionText: STR },
        ['questionId'],
        at,
        issues
      );
      if (!isObject(question)) return;
      checkList(question, 'answers', at, issues, (answer, answerAt) =>
        checkShape(answer, LOGIC_DIVE_ANSWER, ['answerId'], answerAt, issues)
      );
    });
  },
  hangmans_gambit(ts, where, issues) {
    if ('answerKey' in ts && !isString(ts.answerKey)) {
      issues.push(`${where}: answerKey is not a string.`);
    }
  },
  debate_scrum(ts, where, issues) {
    checkList(ts, 'arguments', where, issues, (arg, at) =>
      checkShape(arg, SCRUM_ARGUMENT, ['argumentId'], at, issues)
    );
  },
};

// The half of the format that carries the actual gameplay content used to be
// the unguarded half: every engine read is type_specific.get(key, default), so
// a renamed key yielded an empty minigame with no error anywhere.
function validateTypeSpecific(mg, n, issues) {
  const check = TYPE_SPECIFIC_CHECKS[mg.gameType];
  if (!check) return;
  check(mg.typeSpecific, `Minigame ${n} typeSpecific`, issues);
}

function validateTruthBullet(b, n, issues) {
  if (!isObject(b)) {
    issues.push(`Truth bullet ${n} is not an object.`);
    return;
  }
  if (!isString(b.bulletId)) issues.push(`Truth bullet ${n} has no bulletId.`);
  if (!isString(b.name)) issues.push(`Truth bullet ${n} has no name.`);
  if ('description' in b && !isString(b.description))
    issues.push(`Truth bullet ${n}: description is not a string.`);
  if ('imageFile' in b && !isStringOrNull(b.imageFile))
    issues.push(`Truth bullet ${n}: imageFile is not a string.`);
  if ('inversedLieBulletName' in b && !isStringOrNull(b.inversedLieBulletName))
    issues.push(`Truth bullet ${n}: inversedLieBulletName is not a string.`);
}

// Structure only — empty dialogue, draft characters and dangling minigame
// references are validateTrialForExport's job.
export function validateTrialData(data) {
  const issues = [];
  if (!isObject(data)) {
    return ['trial.json root is not an object.'];
  }
  if (!isString(data.trialName)) issues.push('trialName is missing or not a string.');
  if (!Array.isArray(data.characters)) {
    issues.push('characters is missing or not an array.');
  } else {
    data.characters.forEach((c, i) => {
      if (!isStringOrNull(c)) issues.push(`characters[${i}] is neither a character id nor null.`);
    });
  }
  if (!isObject(data.script) || !Array.isArray(data.script.lines)) {
    issues.push('script.lines is missing or not an array.');
  } else {
    data.script.lines.forEach((line, i) => validateScriptLine(line, i + 1, issues));
    if ('lastModified' in data.script && !isString(data.script.lastModified))
      issues.push('script.lastModified is not a string.');
  }
  if ('minigames' in data) {
    if (!Array.isArray(data.minigames)) issues.push('minigames is not an array.');
    else data.minigames.forEach((mg, i) => validateMinigame(mg, i + 1, issues));
  }
  if ('truthBullets' in data) {
    if (!Array.isArray(data.truthBullets)) issues.push('truthBullets is not an array.');
    else data.truthBullets.forEach((b, i) => validateTruthBullet(b, i + 1, issues));
  }
  if (!isObject(data.metadata)) {
    issues.push('metadata is missing or not an object.');
  } else if (!isString(data.metadata.version) || !VERSION_PATTERN.test(data.metadata.version)) {
    issues.push('metadata.version is missing or not in "<major>.<minor>" form.');
  }
  issues.push(...findUnsafeIds(data));
  return issues;
}
