import type {
  BloodType,
  CameraEasing,
  CameraMotionType,
  DialogueBoxStyle,
  SpecialEffectType,
} from './constants.js';

// ============================================================
// Character
// ============================================================

export interface Character {
  id: string;
  name: string;
  surname: string;
  heightM: number;
  heightCM: number;
  weight: number;
  chest: number;
  blood: BloodType;
  dob: string;
  likes: string;
  dislikes: string;
  notes: string;
  isHeadmaster: boolean;
  position: number;
  lastModified: string;
}

/** Runtime sprite data (not persisted in trial.json) */
export interface SpriteData {
  dataURL: string | null;
  filename: string;
  blob: Blob | null;
}

// ============================================================
// Script Lines — discriminated union on `type`
// ============================================================

export type ScriptLine = SpeakingLine | NarratorLine | MinigameLine;

interface BaseScriptLine {
  id: string;
  order: number;
}

export interface SpeakingLine extends BaseScriptLine {
  type: 'speaking';
  characterId: string;
  dialogue: string;
  spriteIndex: number | null;
  audioFile: string | null;
  highlights: Highlight[];
  cameraMotion: CameraMotion;
  specialEffects: SpecialEffectsConfig;
  dialogueBoxStyle: DialogueBoxStyleConfig;
}

export interface NarratorLine extends BaseScriptLine {
  type: 'narrator';
  dialogue: string;
  audioFile: string | null;
  highlights: Highlight[];
  specialEffects: SpecialEffectsConfig;
  dialogueBoxStyle: DialogueBoxStyleConfig;
}

export interface MinigameLine extends BaseScriptLine {
  type: 'minigame';
  minigameId: string;
}

// ============================================================
// Script Line sub-types
// ============================================================

export interface Highlight {
  startChar: number;
  endChar: number;
  color: string;
}

export interface CameraMotion {
  type: CameraMotionType;
  duration: number;
  easing: CameraEasing;
}

export interface SpecialEffect {
  type: SpecialEffectType;
  intensity?: number;
  duration?: number;
  color?: string;
}

export interface SpecialEffectsConfig {
  effects: SpecialEffect[];
}

export interface DialogueBoxStyleConfig {
  style: DialogueBoxStyle;
  borderColor: string;
  bgOpacity: number;
  borderThickness: number;
}

// ============================================================
// Truth Bullets
// ============================================================

export interface TruthBullet {
  bulletId: string;
  name: string;
  description: string;
  imageFile: string | null;
  inversedLieBulletName: string;
}

// ============================================================
// Trial Data — the root serialization shape (trial.json)
// ============================================================

export interface TrialData {
  trialName: string;
  characters: (string | null)[]; // Array of character IDs or nulls, length = CAST_SLOTS
  truthBullets: TruthBullet[];
  minigames: SerializedMinigame[];
  script: {
    lines: ScriptLine[];
    lastModified?: string;
  };
  metadata: TrialMetadata;
}

export interface TrialMetadata {
  version: string;
  lastModified: string;
  studentCount?: number;
  headmasterCount?: number;
  totalCharacters: number;
  scriptLineCount: number;
  minigameCount: number;
  truthBulletCount: number;
}

/**
 * Serialized minigame shape as stored in trial.json.
 * The `typeSpecific` field is a plain object whose shape depends on `gameType`.
 * For typed access, use the discriminated Minigame union from minigame-types.ts.
 */
export interface SerializedMinigame {
  gameId: string;
  name: string;
  gameType: string;
  difficulty: string;
  timeLimit: number;
  typeSpecific: Record<string, unknown>;
}

// ============================================================
// Defaults
// ============================================================

export const DEFAULT_CAMERA_MOTION: CameraMotion = {
  type: 'none',
  duration: 1.0,
  easing: 'ease-in-out',
};

export const DEFAULT_SPECIAL_EFFECTS: SpecialEffectsConfig = {
  effects: [],
};

export const DEFAULT_DIALOGUE_BOX_STYLE: DialogueBoxStyleConfig = {
  style: 'default',
  borderColor: '#FFFFFF',
  bgOpacity: 0.9,
  borderThickness: 2,
};
