// typeSpecific seeding and ordering, kept out of the render path.
//
// All five minigame editors used to seed their defaults inside their render
// function, so expanding a card mutated trial data and the next autosave
// persisted it - invisible to undo, because those writes never passed through
// recordChange. DOM-free, so the tests can run it under node.

// gameType -> the keys its editor expects to find. Additive: nothing already
// present is replaced, so this cannot discard authored content.
const TYPE_SPECIFIC_KEYS = {
  nonstop_debate: () => ({ selectedBullets: [], dialogueLines: [] }),
  mass_panic_debate: () => ({
    lineGroups: [],
    speaker1CharacterId: '',
    speaker2CharacterId: '',
    speaker3CharacterId: '',
  }),
  logic_dive: () => ({ questions: [] }),
  hangmans_gambit: () => ({ answerKey: '' }),
  debate_scrum: () => ({ arguments: [] }),
};

// The ordered lists each type keeps inside typeSpecific.
const ORDERED_LISTS = {
  nonstop_debate: 'dialogueLines',
  logic_dive: 'questions',
  debate_scrum: 'arguments',
};

// Fills in the keys this minigame's editor needs. Call at load, when a
// minigame is created, and when its gameType changes - never from a render.
export function ensureTypeSpecific(mg) {
  if (!mg) return mg;
  if (!mg.typeSpecific || typeof mg.typeSpecific !== 'object') mg.typeSpecific = {};

  const defaults = TYPE_SPECIFIC_KEYS[mg.gameType];
  if (defaults) {
    for (const [key, value] of Object.entries(defaults())) {
      if (!(key in mg.typeSpecific)) mg.typeSpecific[key] = value;
    }
  }
  normalizeOrder(mg);
  normalizeNestedLists(mg);
  return mg;
}

// Lists nested one level inside an ordered list. logic_dive is the only type
// with one, and it is the only one whose editor reads `.length` on it
// unguarded - a question with no `answers` array threw inside
// renderMinigameDetails, which propagates out to openTrialFromHandle's catch
// and makes the whole trial un-openable behind "Could not open trial", naming
// no minigame. Normalized here rather than defended at each read site, so a
// new read site cannot reintroduce it.
export function normalizeNestedLists(mg) {
  if (!mg || mg.gameType !== 'logic_dive') return;
  const questions = mg.typeSpecific && mg.typeSpecific.questions;
  if (!Array.isArray(questions)) return;
  questions.forEach((question) => {
    if (question && typeof question === 'object' && !Array.isArray(question.answers)) {
      question.answers = [];
    }
  });
}

// `a.order - b.order` is NaN for an item with no order, which makes the
// comparator unstable - and renderMinigameDetails runs after every field edit,
// so the author watched their lines reshuffle as they typed. Numbering them
// once at load makes the comparator total.
export function normalizeOrder(mg) {
  const listKey = ORDERED_LISTS[mg && mg.gameType];
  if (!listKey) return;
  const list = mg.typeSpecific && mg.typeSpecific[listKey];
  if (!Array.isArray(list)) return;
  list.forEach((item, i) => {
    // Objects only. A string entry - the same hand-edit that motivates
    // normalizeNestedLists - threw "Cannot create property 'order' on string"
    // here, which is the same un-openable-trial failure one step earlier.
    if (item && typeof item === 'object' && typeof item.order !== 'number') item.order = i;
  });
}

// Sorted view of an ordered list. A copy, because Array.prototype.sort mutates
// and these arrays are live trial data: sorting in place inside a render
// function reordered what the next autosave wrote.
export function orderedCopy(list) {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
}

export function ensureAllTypeSpecific(minigames) {
  (minigames || []).forEach(ensureTypeSpecific);
  return minigames;
}

// Replaces typeSpecific with the new gameType's defaults, discarding the old
// type's content. The caller confirms first - see hasAuthoredContent.
//
// The old code did this through a chain of five branches, each guarding on
// whether the NEW type's key was already present, so switching back and forth
// half-preserved things. One of the five guarded on the wrong key
// (`!mg.typeSpecific` rather than `!mg.typeSpecific.dialogueLines`), which is
// never true for a minigame addMinigame created - so logic_dive ->
// nonstop_debate left `{questions: [...]}` with no dialogueLines at all, and
// the editor's `|| []` hid it.
export function resetTypeSpecific(mg) {
  if (!mg) return mg;
  mg.typeSpecific = {};
  return ensureTypeSpecific(mg);
}

// True when typeSpecific holds anything an author would notice losing.
// Deliberately shallow: a non-empty list, a non-empty string, or an object
// with any keys. Counts every key, not just the current type's, so content
// left behind by an earlier type change is not silently discarded a second
// time.
export function hasAuthoredContent(mg) {
  const typeSpecific = mg && mg.typeSpecific;
  if (!typeSpecific || typeof typeSpecific !== 'object') return false;
  return Object.values(typeSpecific).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim() !== '';
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return false;
  });
}
