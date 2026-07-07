// Serialization of editor state into the trial.json object. Kept separate
// from storage.js so export.js can use it without an import cycle (storage
// imports export's updateExportButtonState), and DOM-free so tests can
// validate its output against schema/trial.schema.json in a node environment.
import { blockTypes, FORMAT_VERSION } from './constants.js';

// Assemble the trial.json object from a state-shaped object ({trialName,
// cast, scriptLines, minigames, truthBullets}).
export function buildTrialJson(s) {
  // Create minimal ID-only references
  let characterIds = s.cast.map((c) => (c ? c.id : null));

  const RUNTIME_FIELDS = new Set(['voiceLineBlob', 'oppositionAudioBlob', 'defenseAudioBlob']);
  let minigamesForSave = JSON.parse(
    JSON.stringify(s.minigames, (k, v) => (RUNTIME_FIELDS.has(k) ? undefined : v))
  );

  return {
    trialName: s.trialName,
    characters: characterIds, // Just an array of IDs or nulls
    truthBullets: s.truthBullets.map((b) => ({
      // Exclude imageDataURL
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
