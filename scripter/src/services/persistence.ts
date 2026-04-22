import { CAST_SLOTS } from '../domain/constants.js';
import type { Character, TrialData, TruthBullet, SpriteData } from '../domain/types.js';
import type { Minigame } from '../domain/minigame-types.js';
import { TrialAPI } from '../api/trial-api.js';
import type { FileSystemAdapter } from './filesystem.js';

/**
 * PersistenceService — handles loading/saving trial data to the filesystem.
 * Maps between the domain model and the on-disk format.
 */
export class PersistenceService {
  constructor(private fs: FileSystemAdapter) {}

  // ---- Load ----

  async loadTrial(): Promise<TrialAPI> {
    const data = await this.fs.readJSON<TrialData>('trial.json');
    const characters = await this.loadCharacters(data.characters ?? []);
    return TrialAPI.fromJSON(data, characters);
  }

  private async loadCharacters(characterIds: (string | null)[]): Promise<(Character | null)[]> {
    const cast: (Character | null)[] = new Array(CAST_SLOTS).fill(null);

    let charFolders: string[];
    try {
      charFolders = await this.fs.listDirectory('Characters');
    } catch {
      return cast;
    }

    for (let i = 0; i < characterIds.length && i < CAST_SLOTS; i++) {
      const charId = characterIds[i];
      if (!charId) continue;

      for (const folderName of charFolders) {
        try {
          const charData = await this.fs.readJSON<Character>(`Characters/${folderName}/character.json`);
          if (charData.id === charId) {
            charData.position = i;
            cast[i] = charData;
            break;
          }
        } catch {
          continue;
        }
      }
    }

    return cast;
  }

  /** Load the first sprite for a character (used in cast grid) */
  async loadFirstSprite(characterId: string): Promise<SpriteData | null> {
    const cast = await this.findCharacterFolder(characterId);
    if (!cast) return null;

    try {
      const file = await this.fs.readFile(`Characters/${cast}/sprite_01.png`);
      const dataURL = await fileToDataUrl(file);
      return { dataURL, filename: file.name, blob: file };
    } catch {
      return null;
    }
  }

  /** Load all sprites for a character (used when opening character modal) */
  async loadAllSprites(characterId: string, maxSprites: number): Promise<(SpriteData | null)[]> {
    const folder = await this.findCharacterFolder(characterId);
    if (!folder) return [];

    const sprites: (SpriteData | null)[] = [];
    for (let i = 1; i <= maxSprites; i++) {
      try {
        const filename = `sprite_${String(i).padStart(2, '0')}.png`;
        const file = await this.fs.readFile(`Characters/${folder}/${filename}`);
        const dataURL = await fileToDataUrl(file);
        sprites.push({ dataURL, filename: file.name, blob: file });
      } catch {
        sprites.push(null);
      }
    }
    return sprites;
  }

  private async findCharacterFolder(characterId: string): Promise<string | null> {
    let folders: string[];
    try {
      folders = await this.fs.listDirectory('Characters');
    } catch {
      return null;
    }

    for (const folder of folders) {
      try {
        const data = await this.fs.readJSON<{ id: string }>(`Characters/${folder}/character.json`);
        if (data.id === characterId) return folder;
      } catch {
        continue;
      }
    }
    return null;
  }

  /** Load truth bullet images */
  async loadTruthBulletImages(bullets: ReadonlyArray<TruthBullet>): Promise<Map<string, string>> {
    const images = new Map<string, string>();
    for (const bullet of bullets) {
      if (bullet.imageFile) {
        try {
          const file = await this.fs.readFile(`TruthBullets/${bullet.imageFile}`);
          const dataURL = await fileToDataUrl(file);
          images.set(bullet.bulletId, dataURL);
        } catch {
          // Skip failed images
        }
      }
    }
    return images;
  }

  /** Load audio blobs for minigames */
  async loadMinigameAudio(minigames: ReadonlyArray<Minigame>): Promise<Map<string, Blob>> {
    const audioMap = new Map<string, Blob>();

    for (const mg of minigames) {
      try {
        if (mg.gameType === 'nonstop_debate' && mg.typeSpecific.dialogueLines) {
          for (const line of mg.typeSpecific.dialogueLines) {
            if (line.voiceLineFile) {
              try {
                const file = await this.fs.readFile(`Audio/Minigames/${mg.gameId}/${line.voiceLineFile}`);
                audioMap.set(`${mg.gameId}:${line.lineId}`, file);
              } catch { /* skip */ }
            }
          }
        }

        if (mg.gameType === 'debate_scrum' && mg.typeSpecific.arguments) {
          for (const arg of mg.typeSpecific.arguments) {
            if (arg.oppositionAudioFile) {
              try {
                const file = await this.fs.readFile(`Audio/Minigames/${mg.gameId}/${arg.oppositionAudioFile}`);
                audioMap.set(`${mg.gameId}:${arg.argumentId}:opposition`, file);
              } catch { /* skip */ }
            }
            if (arg.defenseAudioFile) {
              try {
                const file = await this.fs.readFile(`Audio/Minigames/${mg.gameId}/${arg.defenseAudioFile}`);
                audioMap.set(`${mg.gameId}:${arg.argumentId}:defense`, file);
              } catch { /* skip */ }
            }
          }
        }

        if (mg.gameType === 'mass_panic_debate' && mg.typeSpecific.lineGroups) {
          for (const group of mg.typeSpecific.lineGroups) {
            for (const key of ['speaker1', 'speaker2', 'speaker3'] as const) {
              const line = group[key];
              if (line?.voiceLineFile) {
                try {
                  const file = await this.fs.readFile(`Audio/Minigames/${mg.gameId}/${line.voiceLineFile}`);
                  audioMap.set(`${mg.gameId}:${group.groupId}:${key}`, file);
                } catch { /* skip */ }
              }
            }
          }
        }
      } catch {
        // Skip entire minigame audio on error
      }
    }

    return audioMap;
  }

  // ---- Save ----

  async saveTrial(api: TrialAPI): Promise<void> {
    const data = api.toJSON();
    await this.fs.writeJSON('trial.json', data);
  }

  async saveCharacter(character: Character, sprites: (SpriteData | null)[]): Promise<void> {
    const folderName = `${character.name}_${character.surname}`.replace(/[^a-zA-Z0-9_\- ]/g, '_');
    const charPath = `Characters/${folderName}`;

    await this.fs.ensureDirectory(charPath);

    // Save character.json (without runtime fields)
    const charJson = { ...character };
    await this.fs.writeJSON(`${charPath}/character.json`, charJson);

    // Save sprites
    for (let i = 0; i < sprites.length; i++) {
      const sprite = sprites[i];
      if (sprite?.blob) {
        const filename = `sprite_${String(i + 1).padStart(2, '0')}.png`;
        await this.fs.writeFile(`${charPath}/${filename}`, sprite.blob);
      }
    }
  }

  async saveTruthBulletImage(_bulletId: string, imageBlob: Blob, filename: string): Promise<void> {
    await this.fs.ensureDirectory('TruthBullets');
    await this.fs.writeFile(`TruthBullets/${filename}`, imageBlob);
  }

  async saveMinigameAudio(gameId: string, filename: string, audioBlob: Blob): Promise<void> {
    await this.fs.ensureDirectory(`Audio/Minigames/${gameId}`);
    await this.fs.writeFile(`Audio/Minigames/${gameId}/${filename}`, audioBlob);
  }

  // ---- Check ----

  async hasExistingTrial(): Promise<boolean> {
    try {
      const files = await this.fs.listDirectory('');
      return files.includes('trial.json');
    } catch {
      return false;
    }
  }
}

// ============================================================
// Helper
// ============================================================

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export { fileToDataUrl };
