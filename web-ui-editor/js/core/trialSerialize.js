// Editor state -> the trial.json object. Separate from storage.js so
// export.js can use it without an import cycle, and DOM-free so the tests can
// validate its output against schema/trial.schema.json under node.
import { blockTypes, FORMAT_VERSION } from './constants.js';

// `s` is state-shaped: { trialName, cast, scriptLines, minigames, truthBullets }.
export function buildTrialJson(s) {
  let characterIds = s.cast.map((c) => (c ? c.id : null));

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
      studentCount: blockTypes.filter((t) => !t).length,
      headmasterCount: blockTypes.filter((t) => t).length,
      totalCharacters: characterIds.filter((id) => id !== null).length,
      scriptLineCount: s.scriptLines.length,
      minigameCount: s.minigames.length,
      truthBulletCount: s.truthBullets.length,
    },
  };
}
