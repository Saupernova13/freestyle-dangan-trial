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
