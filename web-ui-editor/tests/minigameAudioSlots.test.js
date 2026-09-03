// @vitest-environment jsdom
//
// loadMinigameAudio re-encoded per-gameType structure itself - three
// near-identical blocks, six levels deep - though minigameAudio.js already
// owns where a trial keeps its voice clips. Two copies of the same structural
// knowledge is how a new audio-bearing field gets saved by an editor and then
// never loaded back.
import { describe, expect, it } from 'vitest';
import { minigameAudioSlots } from '../js/core/minigameAudio.js';

const slots = (mg) => [...minigameAudioSlots(mg)];
const labels = (mg) => slots(mg).map((s) => s.label);

describe('the audio slots of a minigame', () => {
  it('finds a nonstop debate line', () => {
    const line = { lineId: 'l1', voiceLineFile: 'a.wav' };
    const found = slots({
      gameType: 'nonstop_debate',
      typeSpecific: { dialogueLines: [line] },
    });
    expect(found).toHaveLength(1);
    expect(found[0].owner).toBe(line);
    expect(found[0].file).toBe('voiceLineFile');
    expect(found[0].blob).toBe('voiceLineBlob');
    expect(found[0].label).toBe('dialogue line l1');
  });

  it('finds both sides of a scrum argument', () => {
    expect(
      labels({
        gameType: 'debate_scrum',
        typeSpecific: { arguments: [{ argumentId: 'a1' }] },
      })
    ).toEqual(['argument a1 opposition', 'argument a1 defense']);
  });

  it('finds every filled speaker slot of a mass panic group', () => {
    expect(
      labels({
        gameType: 'mass_panic_debate',
        typeSpecific: {
          lineGroups: [{ groupId: 'g1', speaker1: { voiceLineFile: 'a.wav' }, speaker3: {} }],
        },
      })
    ).toEqual(['panic line g1-speaker1', 'panic line g1-speaker3']);
  });

  it('yields the slot even when no file is set, so a caller can see it is empty', () => {
    const found = slots({
      gameType: 'nonstop_debate',
      typeSpecific: { dialogueLines: [{ lineId: 'l1' }] },
    });
    expect(found).toHaveLength(1);
    expect(found[0].owner.voiceLineFile).toBeUndefined();
  });

  it('writes the loaded file to the field the slot names', () => {
    // The contract the loader relies on: owner[blob] is where a preview
    // later looks for the File.
    const line = { lineId: 'l1', voiceLineFile: 'a.wav' };
    const [slot] = slots({ gameType: 'nonstop_debate', typeSpecific: { dialogueLines: [line] } });
    slot.owner[slot.blob] = 'the file';
    expect(line.voiceLineBlob).toBe('the file');
  });

  it('has nothing to say about a type that holds no audio', () => {
    expect(slots({ gameType: 'logic_dive', typeSpecific: { questions: [{}] } })).toEqual([]);
    expect(slots({ gameType: 'hangmans_gambit', typeSpecific: {} })).toEqual([]);
  });

  it('survives a minigame with nothing in it', () => {
    expect(slots(undefined)).toEqual([]);
    expect(slots({})).toEqual([]);
    expect(slots({ gameType: 'nonstop_debate' })).toEqual([]);
    expect(slots({ gameType: 'nonstop_debate', typeSpecific: null })).toEqual([]);
  });

  it('skips a list that is not a list', () => {
    // A hand-edited trial.json can hold a string there, and a string iterates
    // character by character - which would yield one slot per letter.
    expect(
      slots({ gameType: 'nonstop_debate', typeSpecific: { dialogueLines: 'oops' } })
    ).toEqual([]);
    expect(slots({ gameType: 'debate_scrum', typeSpecific: { arguments: 7 } })).toEqual([]);
    expect(
      slots({ gameType: 'mass_panic_debate', typeSpecific: { lineGroups: { a: 1 } } })
    ).toEqual([]);
  });

  it('covers every type whose editor writes an audio file', () => {
    // The tripwire for the split knowledge: an editor that saves a clip for a
    // type this walk does not know would never load it back.
    const withAudio = ['nonstop_debate', 'debate_scrum', 'mass_panic_debate'];
    for (const gameType of withAudio) {
      const mg = {
        gameType,
        typeSpecific: {
          dialogueLines: [{ lineId: 'l1' }],
          arguments: [{ argumentId: 'a1' }],
          lineGroups: [{ groupId: 'g1', speaker1: {} }],
        },
      };
      expect(slots(mg).length).toBeGreaterThan(0);
    }
  });
});
