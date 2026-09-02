// Bullet ids live in three places and the delete cascade cleaned only one, so
// deleting a truth bullet left answerBulletId dangling on weak points that
// stayed visible and permanently unshootable - and the export pre-flight
// passed clean, so the break surfaced only in the shipped trial.
import { describe, expect, it } from 'vitest';
import {
  detachCharacter,
  detachTruthBullet,
  findDanglingBulletReferences,
  findDanglingCharacterReferences,
  findIntegrityIssues,
  findUnarmedAnswerBullets,
} from '../js/core/references.js';

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

// removeCharacter cleared characterId on speaking script lines only. Every
// minigame reference survived, so the exported trial kept speaker1CharacterId
// pointing at a deleted folder - and nothing validated characterId against the
// cast anywhere, so the export check passed clean and it broke at runtime.
const CHAR = 'SJ_20000101_AAA';

function castMinigames() {
  return [
    {
      gameId: 'mg_panic',
      name: 'Everyone at once',
      gameType: 'mass_panic_debate',
      typeSpecific: {
        speaker1CharacterId: CHAR,
        speaker2CharacterId: 'SJ_20000101_BBB',
        speaker3CharacterId: '',
        lineGroups: [],
      },
    },
    {
      gameId: 'mg_nonstop',
      name: 'Who held the knife?',
      gameType: 'nonstop_debate',
      typeSpecific: {
        dialogueLines: [
          { lineId: 'l1', characterId: CHAR },
          { lineId: 'l2', characterId: 'SJ_20000101_BBB' },
        ],
      },
    },
    {
      gameId: 'mg_scrum',
      name: 'Scrum',
      gameType: 'debate_scrum',
      typeSpecific: {
        arguments: [
          { argumentId: 'a1', oppositionCharacterId: CHAR, defenseCharacterId: CHAR },
          {
            argumentId: 'a2',
            oppositionCharacterId: 'SJ_20000101_BBB',
            defenseCharacterId: 'SJ_20000101_BBB',
          },
        ],
      },
    },
    { gameId: 'mg_bare', gameType: 'logic_dive' },
  ];
}

describe('detachCharacter', () => {
  it('clears mass panic speaker slots', () => {
    const mgs = castMinigames();
    detachCharacter(mgs, CHAR);
    expect(mgs[0].typeSpecific.speaker1CharacterId).toBe('');
    expect(mgs[0].typeSpecific.speaker2CharacterId).toBe('SJ_20000101_BBB');
  });

  it('clears nonstop dialogue line speakers', () => {
    const mgs = castMinigames();
    detachCharacter(mgs, CHAR);
    expect(mgs[1].typeSpecific.dialogueLines[0].characterId).toBe('');
    expect(mgs[1].typeSpecific.dialogueLines[1].characterId).toBe('SJ_20000101_BBB');
  });

  it('clears both sides of a scrum argument', () => {
    const mgs = castMinigames();
    detachCharacter(mgs, CHAR);
    expect(mgs[2].typeSpecific.arguments[0].oppositionCharacterId).toBe('');
    expect(mgs[2].typeSpecific.arguments[0].defenseCharacterId).toBe('');
    expect(mgs[2].typeSpecific.arguments[1].oppositionCharacterId).toBe('SJ_20000101_BBB');
  });

  it('tolerates minigames with no character references', () => {
    expect(() => detachCharacter(castMinigames(), CHAR)).not.toThrow();
    expect(() => detachCharacter(undefined, CHAR)).not.toThrow();
  });
});

describe('findDanglingCharacterReferences', () => {
  const cast = [{ id: 'SJ_20000101_BBB', name: 'B' }, null];

  it('reports every minigame slot left pointing at a removed character', () => {
    const issues = findDanglingCharacterReferences(castMinigames(), cast, []);
    // speaker1, one dialogue line, both sides of one scrum argument.
    expect(issues).toHaveLength(4);
  });

  it('reports a speaking line whose character is no longer in the cast', () => {
    const lines = [
      { type: 'speaking', characterId: CHAR, dialogue: 'x' },
      { type: 'speaking', characterId: 'SJ_20000101_BBB', dialogue: 'y' },
      { type: 'narrator', text: 'z' },
    ];
    const issues = findDanglingCharacterReferences([], cast, lines);
    expect(issues).toEqual(['Line 1: references a character that is no longer in the cast.']);
  });

  it('says nothing after a detach, which is the point', () => {
    const mgs = castMinigames();
    detachCharacter(mgs, CHAR);
    expect(findDanglingCharacterReferences(mgs, cast, [])).toEqual([]);
  });

  it('treats an empty slot as unset rather than dangling', () => {
    const mgs = [
      { gameId: 'mg', gameType: 'mass_panic_debate', typeSpecific: { speaker1CharacterId: '' } },
    ];
    expect(findDanglingCharacterReferences(mgs, cast, [])).toEqual([]);
  });
});

// The engine arms exactly selectedBullets (nonstop_debate.gd:69-70), so a weak
// point whose answer is not among them can never be shot. Purely editor-side:
// deselecting a bullet in the grid while a line still names it as its answer
// produces a line that looks authored and cannot be cleared.
describe('findUnarmedAnswerBullets', () => {
  function debate(selectedBullets, answers) {
    return [
      {
        gameId: 'mg_1',
        name: 'Who held the knife?',
        gameType: 'nonstop_debate',
        typeSpecific: {
          selectedBullets,
          dialogueLines: answers.map((id, i) => ({ lineId: `l${i}`, answerBulletId: id })),
        },
      },
    ];
  }

  it('reports an answer the minigame does not arm', () => {
    const issues = findUnarmedAnswerBullets(debate(['tb_note'], ['tb_knife']));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('never be shot');
  });

  it('says nothing when every answer is armed', () => {
    expect(findUnarmedAnswerBullets(debate(['tb_knife', 'tb_note'], ['tb_knife']))).toEqual([]);
  });

  it('ignores lines with no answer', () => {
    expect(findUnarmedAnswerBullets(debate(['tb_knife'], [null, '']))).toEqual([]);
  });

  it('stays quiet when nothing is selected at all', () => {
    // The minigame arms nothing, which the empty-content check already
    // reports; flagging every line as well would be noise.
    expect(findUnarmedAnswerBullets(debate([], ['tb_knife']))).toEqual([]);
  });

  it('names the line so the author can find it', () => {
    const issues = findUnarmedAnswerBullets(debate(['tb_note'], ['tb_note', 'tb_knife']));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('line 2');
  });
});

describe('findIntegrityIssues', () => {
  it('gathers every invariant through one call', () => {
    const issues = findIntegrityIssues({
      cast: [{ id: 'SJ_OK' }],
      scriptLines: [{ type: 'speaking', characterId: 'SJ_GONE', dialogue: 'x' }],
      truthBullets: [{ bulletId: 'tb_note' }],
      minigames: [
        {
          gameId: 'mg_1',
          name: 'Debate',
          gameType: 'nonstop_debate',
          typeSpecific: {
            selectedBullets: ['tb_note'],
            dialogueLines: [
              { lineId: 'l1', characterId: 'SJ_GONE' },
              { lineId: 'l2', answerBulletId: 'tb_deleted' },
            ],
          },
        },
      ],
    });

    // A dangling speaking line, a dangling minigame character, a dangling
    // answer bullet, and that same answer not being armed.
    expect(issues).toHaveLength(4);
  });

  it('says nothing about a coherent trial', () => {
    expect(
      findIntegrityIssues({
        cast: [{ id: 'SJ_OK' }],
        scriptLines: [{ type: 'speaking', characterId: 'SJ_OK', dialogue: 'x' }],
        truthBullets: [{ bulletId: 'tb_note' }],
        minigames: [
          {
            gameId: 'mg_1',
            gameType: 'nonstop_debate',
            typeSpecific: {
              selectedBullets: ['tb_note'],
              dialogueLines: [{ lineId: 'l1', characterId: 'SJ_OK', answerBulletId: 'tb_note' }],
            },
          },
        ],
      })
    ).toEqual([]);
  });

  it('tolerates an empty trial', () => {
    expect(findIntegrityIssues({})).toEqual([]);
  });
});
