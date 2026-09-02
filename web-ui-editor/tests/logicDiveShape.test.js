// A logic_dive question with no `answers` array - from a hand-edited or older
// trial.json - threw on `question.answers.length` inside renderMinigameDetails.
// That propagates out of renderActiveView into openTrialFromHandle's catch, so
// the whole trial became un-openable behind a generic "Could not open trial",
// naming no minigame. The schema does not constrain typeSpecific, so nothing
// rejected the file at load either.
import { describe, expect, it } from 'vitest';
import { ensureTypeSpecific, normalizeNestedLists } from '../js/core/minigameDefaults.js';

function logicDive(questions) {
  return { gameId: 'mg_1', gameType: 'logic_dive', typeSpecific: { questions } };
}

describe('logic_dive question shape', () => {
  it('gives a question with no answers array an empty one', () => {
    const mg = logicDive([{ questionId: 'q1', questionText: 'Who?' }]);
    ensureTypeSpecific(mg);
    expect(mg.typeSpecific.questions[0].answers).toEqual([]);
  });

  it('replaces a non-array answers value', () => {
    const mg = logicDive([{ questionId: 'q1', answers: 'nope' }]);
    ensureTypeSpecific(mg);
    expect(mg.typeSpecific.questions[0].answers).toEqual([]);
  });

  it('leaves authored answers untouched', () => {
    const authored = [{ answerId: 'a1', answerText: 'You', isCorrect: true }];
    const mg = logicDive([{ questionId: 'q1', answers: authored }]);
    ensureTypeSpecific(mg);
    expect(mg.typeSpecific.questions[0].answers).toBe(authored);
  });

  it('ignores a non-object question rather than throwing on it', () => {
    // normalizeOrder reached this first and threw "Cannot create property
    // 'order' on string 'junk'" - the same un-openable-trial failure one step
    // earlier, from the same kind of hand-edit.
    const mg = logicDive(['junk', null, { questionId: 'q1' }]);
    expect(() => ensureTypeSpecific(mg)).not.toThrow();
    expect(mg.typeSpecific.questions[2].answers).toEqual([]);
  });

  it('does not throw on a non-object entry in any ordered list', () => {
    for (const [gameType, listKey] of [
      ['nonstop_debate', 'dialogueLines'],
      ['debate_scrum', 'arguments'],
      ['logic_dive', 'questions'],
    ]) {
      const mg = { gameId: 'mg_1', gameType, typeSpecific: { [listKey]: ['junk', 7, null, {}] } };
      expect(() => ensureTypeSpecific(mg), gameType).not.toThrow();
      expect(mg.typeSpecific[listKey][3].order, gameType).toBe(3);
    }
  });

  it('does nothing for other game types', () => {
    const mg = { gameId: 'mg_1', gameType: 'nonstop_debate', typeSpecific: { questions: [{}] } };
    normalizeNestedLists(mg);
    expect(mg.typeSpecific.questions[0].answers).toBeUndefined();
  });

  it('survives a missing or non-array questions list', () => {
    expect(() => normalizeNestedLists(logicDive(undefined))).not.toThrow();
    expect(() => normalizeNestedLists(logicDive('nope'))).not.toThrow();
    expect(() => normalizeNestedLists(null)).not.toThrow();
  });
});
