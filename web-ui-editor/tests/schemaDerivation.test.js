// The corpus in schema.test.js runs ajv and js/core/trialSchema.js over the
// same 30-odd cases and asserts identical verdicts. That is a real drift
// tripwire, but it is corpus-driven: it catches disagreement on the cases
// someone thought to write, not disagreement in general. Add a field to one
// side without a corpus case and CI stays silent - which is how `failComment`
// came to be written by the editor and typed by the engine while the schema
// did not mention it.
//
// This file is the other direction: derive the field and value sets from each
// artifact and compare them, so the check does not depend on anyone
// remembering a case.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DIFFICULTY_LABELS,
  MINIGAME_TYPE_LABELS,
  SCRIPT_LINE_TYPE_LABELS,
} from '../js/core/constants.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(here, p), 'utf8');

const schema = JSON.parse(read('../../schema/trial.schema.json'));
const validatorSource = read('../js/core/trialSchema.js');

// Every property name the schema declares, at any depth.
function schemaPropertyNames(node, found = new Set()) {
  if (Array.isArray(node)) {
    for (const item of node) schemaPropertyNames(item, found);
  } else if (node && typeof node === 'object') {
    if (node.properties && typeof node.properties === 'object') {
      for (const name of Object.keys(node.properties)) found.add(name);
    }
    for (const value of Object.values(node)) schemaPropertyNames(value, found);
  }
  return found;
}

// Every field name the hand validator actually tests, read off the four forms
// it is written in: `'x' in obj`, a shape-table entry, a checkList key, and
// the literal arrays it loops over.
function handCheckedNames(source) {
  const found = new Set();
  for (const [, name] of source.matchAll(/'(\w+)' in /g)) found.add(name);
  for (const [, name] of source.matchAll(
    /^\s*(\w+): (?:STR|STR_OR_NULL|NUM|BOOL|STR_ARRAY)\b/gm
  )) {
    found.add(name);
  }
  for (const [, name] of source.matchAll(/checkList\(\w+, '(\w+)'/g)) found.add(name);
  for (const [, list] of source.matchAll(/for \(const \w+ of \[([^\]]+)\]/g)) {
    for (const [, name] of list.matchAll(/'(\w+)'/g)) found.add(name);
  }
  return found;
}

// Follows a $ref to the definition it names.
function deref(node) {
  if (!node || !node.$ref) return node;
  const path = node.$ref.replace(/^#\//, '').split('/');
  return path.reduce((acc, key) => acc[key], schema);
}

describe('the schema and the hand validator name the same fields', () => {
  it('finds fields on both sides at all', () => {
    expect(schemaPropertyNames(schema).size).toBeGreaterThan(50);
    expect(handCheckedNames(validatorSource).size).toBeGreaterThan(40);
  });

  it('leaves no schema property unmentioned by the validator', () => {
    // A field added to the schema with no corpus case reaches the engine
    // untyped by the editor, which is how a wrong type gets written to disk.
    const unmentioned = [...schemaPropertyNames(schema)].filter(
      (name) => !new RegExp(`\\b${name}\\b`).test(validatorSource)
    );
    expect(unmentioned).toEqual([]);
  });

  it('leaves no validated field out of the schema', () => {
    // The reverse: a field the editor types but the schema does not declare
    // is a field ajv silently allows anything in.
    const schemaNames = schemaPropertyNames(schema);
    const undeclared = [...handCheckedNames(validatorSource)].filter(
      (name) => !schemaNames.has(name)
    );
    expect(undeclared).toEqual([]);
  });
});

describe('the enums are one list each', () => {
  // Three hand-maintained copies of the gameType set used to disagree - the
  // schema, constants.js, and a dropdown that hardcoded five of the eight.
  // The editor side is derived now; the schema is still its own copy, so it
  // is compared here rather than assumed.
  function enumAt(defName, property) {
    const def = defName ? schema.$defs[defName] : schema;
    return deref(def.properties[property]).enum;
  }

  it('offers the same minigame types the schema accepts', () => {
    expect(enumAt('minigame', 'gameType').slice().sort()).toEqual(
      Object.keys(MINIGAME_TYPE_LABELS).sort()
    );
  });

  it('offers the same difficulties the schema accepts', () => {
    expect(enumAt('minigame', 'difficulty').slice().sort()).toEqual(
      Object.keys(DIFFICULTY_LABELS).sort()
    );
  });

  it('offers the same script line types the schema accepts', () => {
    expect(enumAt('scriptLine', 'type').slice().sort()).toEqual(
      Object.keys(SCRIPT_LINE_TYPE_LABELS).sort()
    );
  });
});
