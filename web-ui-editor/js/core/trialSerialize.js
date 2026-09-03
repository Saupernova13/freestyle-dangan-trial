// Editor state -> the trial.json object. Separate from storage.js so
// export.js can use it without an import cycle, and DOM-free so the tests can
// validate its output against schema/trial.schema.json under node.
import { blockTypes, FORMAT_VERSION } from './constants.js';

// `s` is state-shaped: { trialName, cast, scriptLines, minigames, truthBullets }.
export function buildTrialJson(s) {
  let characterIds = s.cast.map((c) => (c ? c.id : null));

  // Every Blob field the minigame tree can hold, listed so JSON.stringify
  // drops them instead of emitting `{}`. This is a schema contract, not an
  // optimisation: a fourth blob field added by a new editor would be written
  // to trial.json as an empty object and read back by the engine as a
  // corrupt record - and nothing would fail, because the schema allows
  // unknown keys. tests/runtimeFields.test.js checks this set against the
  // blob fields minigameAudioSlots actually walks.
  const RUNTIME_FIELDS = new Set(['voiceLineBlob', 'oppositionAudioBlob', 'defenseAudioBlob']);
  let minigamesForSave = JSON.parse(
    JSON.stringify(s.minigames, (k, v) => (RUNTIME_FIELDS.has(k) ? undefined : v))
  );

  return {
    trialName: s.trialName,
    characters: characterIds,
    truthBullets: s.truthBullets.map((b) => ({
      // Listed explicitly to keep imageDataURL out of the file.
      bulletId: b.bulletId,
      name: b.name,
      description: b.description,
      imageFile: b.imageFile,
      inversedLieBulletName: b.inversedLieBulletName,
    })),
    minigames: minigamesForSave,
    script: {
      lines: s.scriptLines,
      lastModified: new Date().toISOString(),
    },
    metadata: {
      version: FORMAT_VERSION,
      lastModified: new Date().toISOString(),
      // From the cast, not from blockTypes. Counting the constant made these
      // always 16 and 1 whatever the trial actually held - fields written
      // into metadata as though they described it. blockTypes still says
      // WHICH slot is the headmaster's; the cast says whether anyone is in it.
      studentCount: s.cast.filter((c, i) => c && !blockTypes[i]).length,
      headmasterCount: s.cast.filter((c, i) => c && blockTypes[i]).length,
      totalCharacters: characterIds.filter((id) => id !== null).length,
      scriptLineCount: s.scriptLines.length,
      minigameCount: s.minigames.length,
      truthBulletCount: s.truthBullets.length,
    },
  };
}
