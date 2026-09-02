// Cross-entity references inside minigame typeSpecific payloads.
//
// Every entity id an author can delete is reachable from more than one place,
// and each editor invented its own field name for it. Sweeping them from one
// module is what stops a delete cascade covering some references and missing
// the rest - the failure mode the confirm dialogs already promise not to have.
//
// DOM-free, so the tests can run it under node.

// gameType -> the paths that hold a truth bullet id. selectedBullets narrows
// the evidence a debate offers; answerBulletId *is* the correct answer.
function forEachBulletReference(minigames, visit) {
  for (const mg of minigames || []) {
    const ts = mg && mg.typeSpecific;
    if (!ts) continue;

    if (Array.isArray(ts.selectedBullets)) {
      visit({ kind: 'selectedBullets', mg, container: ts, key: 'selectedBullets', list: true });
    }
    for (const line of ts.dialogueLines || []) {
      if (line) visit({ kind: 'answerBulletId', mg, container: line, key: 'answerBulletId' });
    }
    for (const group of ts.lineGroups || []) {
      if (!group) continue;
      for (const speakerKey of ['speaker1', 'speaker2', 'speaker3']) {
        const line = group[speakerKey];
        if (line) visit({ kind: 'answerBulletId', mg, container: line, key: 'answerBulletId' });
      }
    }
  }
}

// Removes every reference to `bulletId`, so a deleted bullet cannot leave a
// weak point that is still visible and permanently unshootable.
export function detachTruthBullet(minigames, bulletId) {
  forEachBulletReference(minigames, (ref) => {
    if (ref.list) {
      ref.container[ref.key] = ref.container[ref.key].filter((id) => id !== bulletId);
      return;
    }
    if (ref.container[ref.key] !== bulletId) return;
    ref.container[ref.key] = null;
    // isShootable tracks answerBulletId exactly - updateDialogueLine sets it
    // from that field - so clearing one without the other leaves a weak point
    // the player can see and can never hit.
    if ('isShootable' in ref.container) ref.container.isShootable = false;
  });
}

// Human-readable descriptions of answer-bullet ids that no longer resolve.
// The export pre-flight checks dangling minigameId but never these, so a
// broken debate shipped clean and surfaced only in the played trial.
export function findDanglingBulletReferences(minigames, truthBullets) {
  const known = new Set((truthBullets || []).map((b) => b && b.bulletId).filter(Boolean));
  const issues = [];
  forEachBulletReference(minigames, (ref) => {
    if (ref.kind !== 'answerBulletId') return;
    const id = ref.container[ref.key];
    if (!id || known.has(id)) return;
    const name = ref.mg.name && ref.mg.name.trim() ? ref.mg.name : ref.mg.gameId;
    issues.push(`Minigame "${name}": an answer references a truth bullet that no longer exists.`);
  });
  return issues;
}

// gameType -> the paths that hold a character id. Each editor named the same
// relationship differently, which is how a delete cascade came to cover the
// script lines and none of these.
function forEachCharacterReference(minigames, visit) {
  for (const mg of minigames || []) {
    const ts = mg && mg.typeSpecific;
    if (!ts) continue;

    for (const key of ['speaker1CharacterId', 'speaker2CharacterId', 'speaker3CharacterId']) {
      if (key in ts) visit({ mg, container: ts, key });
    }
    for (const line of ts.dialogueLines || []) {
      if (line && 'characterId' in line) visit({ mg, container: line, key: 'characterId' });
    }
    for (const arg of ts.arguments || []) {
      if (!arg) continue;
      for (const key of ['oppositionCharacterId', 'defenseCharacterId']) {
        if (key in arg) visit({ mg, container: arg, key });
      }
    }
  }
}

// Removes every minigame reference to `characterId`. The script lines are the
// caller's job, since only it knows which lines belong to the open trial.
//
// The confirmation dialog says removing a character "clears any script lines
// that use them", which is accurate as written and misleading in effect: the
// exported trial kept speaker1CharacterId pointing at a deleted folder, the
// export check passed clean, and the minigame broke at runtime.
export function detachCharacter(minigames, characterId) {
  forEachCharacterReference(minigames, (ref) => {
    if (ref.container[ref.key] === characterId) ref.container[ref.key] = '';
  });
}

// Human-readable descriptions of character ids no longer in the cast. Nothing
// validated characterId against the cast anywhere in export.js or
// trialSchema.js, in a minigame or on a script line.
export function findDanglingCharacterReferences(minigames, cast, scriptLines) {
  const known = new Set((cast || []).filter(Boolean).map((c) => c.id));
  const issues = [];

  (scriptLines || []).forEach((line, i) => {
    if (!line || line.type !== 'speaking') return;
    if (!line.characterId || known.has(line.characterId)) return;
    issues.push(`Line ${i + 1}: references a character that is no longer in the cast.`);
  });

  forEachCharacterReference(minigames, (ref) => {
    const id = ref.container[ref.key];
    if (!id || known.has(id)) return;
    const name = ref.mg.name && ref.mg.name.trim() ? ref.mg.name : ref.mg.gameId;
    issues.push(`Minigame "${name}": ${ref.key} references a character no longer in the cast.`);
  });

  return issues;
}

// Reference invariants nothing else expresses. validateTrialForExport checked
// a dangling minigameId and nothing more - there was no cast-membership check
// anywhere in export.js or trialSchema.js - so a trial could export clean and
// break at runtime.
//
// One entry point rather than four call sites, so a new invariant is added in
// one place and every caller gets it.
export function findIntegrityIssues({ minigames, cast, scriptLines, truthBullets }) {
  return [
    ...findDanglingCharacterReferences(minigames, cast, scriptLines),
    ...findDanglingBulletReferences(minigames, truthBullets),
    ...findUnarmedAnswerBullets(minigames),
  ];
}

// A nonstop debate arms exactly its selectedBullets (nonstop_debate.gd:69-70),
// so a weak point whose answer is not among them can never be shot. Purely
// editor-side: deselecting a bullet in the grid while a line still names it as
// its answer produces a line that looks authored and cannot be cleared.
export function findUnarmedAnswerBullets(minigames) {
  const issues = [];
  for (const mg of minigames || []) {
    const ts = mg && mg.typeSpecific;
    if (!ts || !Array.isArray(ts.selectedBullets) || !Array.isArray(ts.dialogueLines)) continue;
    // An empty selection means the minigame arms nothing, which the empty-content
    // check already reports; flagging every line as well would just be noise.
    if (ts.selectedBullets.length === 0) continue;

    const armed = new Set(ts.selectedBullets);
    const name = mg.name && mg.name.trim() ? mg.name : mg.gameId;
    ts.dialogueLines.forEach((line, i) => {
      if (!line || !line.answerBulletId) return;
      if (armed.has(line.answerBulletId)) return;
      issues.push(
        `Minigame "${name}": line ${i + 1}'s answer is not among its selected truth bullets, ` +
          'so it can never be shot.'
      );
    });
  }
  return issues;
}
