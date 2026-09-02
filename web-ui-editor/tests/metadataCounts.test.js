// metadata.studentCount and metadata.headmasterCount were computed from the
// blockTypes constant rather than the cast, so they were always 16 and 1
// whatever the trial actually held - written into metadata as though they
// described it. Any consumer that trusted them, the engine or a human reading
// the file, got a number unrelated to the content.
import { describe, expect, it } from 'vitest';
import { buildTrialJson } from '../js/core/trialSerialize.js';
import { BLOCK_COUNT, blockTypes } from '../js/core/constants.js';

// blockTypes marks the headmaster's slot; the last one.
const HEADMASTER_INDEX = blockTypes.indexOf(true);

function stateWith(cast) {
  return {
    trialName: 'T',
    cast,
    scriptLines: [],
    minigames: [],
    truthBullets: [],
  };
}

function emptyCast() {
  return Array(BLOCK_COUNT).fill(null);
}

function character(id) {
  return { id, name: id, surname: 'X' };
}

describe('metadata counts', () => {
  it('counts an empty cast as empty', () => {
    const meta = buildTrialJson(stateWith(emptyCast())).metadata;
    expect(meta.studentCount).toBe(0);
    expect(meta.headmasterCount).toBe(0);
  });

  it('counts the students that are actually seated', () => {
    const cast = emptyCast();
    cast[0] = character('ch_a');
    cast[3] = character('ch_b');
    const meta = buildTrialJson(stateWith(cast)).metadata;
    expect(meta.studentCount).toBe(2);
    expect(meta.headmasterCount).toBe(0);
  });

  it('counts the headmaster separately, by slot', () => {
    const cast = emptyCast();
    cast[HEADMASTER_INDEX] = character('ch_hm');
    const meta = buildTrialJson(stateWith(cast)).metadata;
    expect(meta.studentCount).toBe(0);
    expect(meta.headmasterCount).toBe(1);
  });

  it('agrees with totalCharacters', () => {
    const cast = emptyCast();
    cast[0] = character('ch_a');
    cast[1] = character('ch_b');
    cast[HEADMASTER_INDEX] = character('ch_hm');
    const meta = buildTrialJson(stateWith(cast)).metadata;
    expect(meta.studentCount + meta.headmasterCount).toBe(meta.totalCharacters);
  });

  it('reaches 16 and 1 only for a full cast', () => {
    const cast = emptyCast().map((_, i) => character(`ch_${i}`));
    const meta = buildTrialJson(stateWith(cast)).metadata;
    expect(meta.studentCount).toBe(16);
    expect(meta.headmasterCount).toBe(1);
  });
});
