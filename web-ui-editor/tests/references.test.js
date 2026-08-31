// Bullet ids live in three places and the delete cascade cleaned only one, so
// deleting a truth bullet left answerBulletId dangling on weak points that
// stayed visible and permanently unshootable - and the export pre-flight
// passed clean, so the break surfaced only in the shipped trial.
import { describe, expect, it } from 'vitest';
import { detachTruthBullet, findDanglingBulletReferences } from '../js/core/references.js';

const BULLET = 'tb_knife';

function minigames() {
  return [
    {
      gameId: 'mg_nonstop',
      name: 'Who held the knife?',
      gameType: 'nonstop_debate',
      typeSpecific: {
        selectedBullets: [BULLET, 'tb_note'],
        dialogueLines: [
          { lineId: 'l1', answerBulletId: BULLET, isShootable: true },
          { lineId: 'l2', answerBulletId: 'tb_note', isShootable: true },
          { lineId: 'l3', answerBulletId: null, isShootable: false },
        ],
      },
    },
    {
      gameId: 'mg_panic',
      name: 'Everyone at once',
      gameType: 'mass_panic_debate',
      typeSpecific: {
        lineGroups: [
          {
            groupId: 'g1',
            speaker1: { answerBulletId: BULLET },
            speaker2: { answerBulletId: 'tb_note' },
            speaker3: { answerBulletId: null },
          },
        ],
      },
    },
    // A minigame with no bullet references at all must not throw.
    { gameId: 'mg_hangman', gameType: 'hangmans_gambit', typeSpecific: { answerKey: 'KNIFE' } },
    { gameId: 'mg_bare', gameType: 'logic_dive' },
  ];
}

describe('detachTruthBullet', () => {
  it('clears selectedBullets, which is the only one the old cascade handled', () => {
    const mgs = minigames();
    detachTruthBullet(mgs, BULLET);
    expect(mgs[0].typeSpecific.selectedBullets).toEqual(['tb_note']);
  });

  it('clears answerBulletId on nonstop dialogue lines', () => {
    const mgs = minigames();
    detachTruthBullet(mgs, BULLET);
    expect(mgs[0].typeSpecific.dialogueLines[0].answerBulletId).toBeNull();
  });

  it('clears answerBulletId on every mass panic speaker', () => {
    const mgs = minigames();
    detachTruthBullet(mgs, BULLET);
    expect(mgs[1].typeSpecific.lineGroups[0].speaker1.answerBulletId).toBeNull();
  });

  it('unsets isShootable with it', () => {
    // The two track each other - updateDialogueLine sets isShootable from
    // answerBulletId - so clearing one alone leaves a weak point the player
    // can see and can never hit.
    const mgs = minigames();
    detachTruthBullet(mgs, BULLET);
    expect(mgs[0].typeSpecific.dialogueLines[0].isShootable).toBe(false);
  });

  it('leaves other bullets alone', () => {
    const mgs = minigames();
    detachTruthBullet(mgs, BULLET);
    expect(mgs[0].typeSpecific.dialogueLines[1].answerBulletId).toBe('tb_note');
    expect(mgs[0].typeSpecific.dialogueLines[1].isShootable).toBe(true);
    expect(mgs[1].typeSpecific.lineGroups[0].speaker2.answerBulletId).toBe('tb_note');
  });

  it('tolerates minigames with no bullet references', () => {
    expect(() => detachTruthBullet(minigames(), BULLET)).not.toThrow();
    expect(() => detachTruthBullet(undefined, BULLET)).not.toThrow();
  });
});

describe('findDanglingBulletReferences', () => {
  it('reports an answer that points at a deleted bullet', () => {
    const issues = findDanglingBulletReferences(minigames(), [{ bulletId: 'tb_note' }]);
    expect(issues).toHaveLength(2);
    expect(issues[0]).toContain('Who held the knife?');
    expect(issues[1]).toContain('Everyone at once');
  });

  it('says nothing when every reference resolves', () => {
    const bullets = [{ bulletId: BULLET }, { bulletId: 'tb_note' }];
    expect(findDanglingBulletReferences(minigames(), bullets)).toEqual([]);
  });

  it('says nothing after a detach, which is the point', () => {
    const mgs = minigames();
    detachTruthBullet(mgs, BULLET);
    expect(findDanglingBulletReferences(mgs, [{ bulletId: 'tb_note' }])).toEqual([]);
  });

  it('ignores a null answer rather than calling it dangling', () => {
    expect(findDanglingBulletReferences(minigames(), [{ bulletId: BULLET }])).toHaveLength(2);
  });
});
