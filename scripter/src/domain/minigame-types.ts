import type { Difficulty, TextEffect, TextFont, TextMovementDirection } from './constants.js';

// ============================================================
// Minigame — discriminated union on `gameType`
// ============================================================

export type Minigame =
  | NonstopDebate
  | MassPanicDebate
  | LogicDive
  | DebateScrum
  | HangmansGambit
  | RebuttalShowdown
  | PsycheTaxi
  | ClosingArgument;

/** Shared fields across all minigame types */
export interface BaseMinigame {
  gameId: string;
  name: string;
  difficulty: Difficulty;
  timeLimit: number;
}

// ============================================================
// Nonstop Debate
// ============================================================

export interface NonstopDebate extends BaseMinigame {
  gameType: 'nonstop_debate';
  typeSpecific: NonstopDebateData;
}

export interface NonstopDebateData {
  selectedBullets: string[];
  dialogueLines: NonstopDialogueLine[];
}

export interface NonstopDialogueLine {
  lineId: string;
  order: number;
  sentenceBeginning: string;
  target: string;
  sentenceEnd: string;
  isShootable: boolean;
  answerBulletId: string | null;
  useNegativeBullet: boolean;
  characterId: string;
  voiceLineFile: string | null;
  textEffect: TextEffect;
  textFont: TextFont;
  textMovementDirection: TextMovementDirection;
  characterSpotlight: boolean;
  userFailedComment: string;
  userWrongAnswerComment: string;
}

// ============================================================
// Mass Panic Debate
// ============================================================

export interface MassPanicDebate extends BaseMinigame {
  gameType: 'mass_panic_debate';
  typeSpecific: MassPanicDebateData;
}

export interface MassPanicDebateData {
  speaker1CharacterId: string;
  speaker2CharacterId: string;
  speaker3CharacterId: string;
  lineGroups: MassPanicLineGroup[];
}

export interface MassPanicLineGroup {
  groupId: string;
  order: number;
  speaker1: MassPanicSpeakerLine;
  speaker2: MassPanicSpeakerLine;
  speaker3: MassPanicSpeakerLine;
}

export interface MassPanicSpeakerLine {
  sentenceBeginning: string;
  target: string;
  sentenceEnd: string;
  isLoudAssertion: boolean;
  answerBulletId: string | null;
  textEffect: TextEffect;
  textMovementDirection: TextMovementDirection;
  textFont: TextFont;
  voiceLineFile: string | null;
}

// ============================================================
// Logic Dive
// ============================================================

export interface LogicDive extends BaseMinigame {
  gameType: 'logic_dive';
  typeSpecific: LogicDiveData;
}

export interface LogicDiveData {
  questions: LogicDiveQuestion[];
}

export interface LogicDiveQuestion {
  questionId: string;
  order: number;
  questionText: string;
  answers: LogicDiveAnswer[];
}

export interface LogicDiveAnswer {
  answerId: string;
  answerText: string;
  isCorrect: boolean;
}

// ============================================================
// Debate Scrum
// ============================================================

export interface DebateScrum extends BaseMinigame {
  gameType: 'debate_scrum';
  typeSpecific: DebateScrumData;
}

export interface DebateScrumData {
  arguments: DebateScrumArgument[];
}

export interface DebateScrumArgument {
  argumentId: string;
  order: number;
  oppositionStatement: string;
  oppositionCharacterId: string;
  oppositionAudioFile: string | null;
  oppositionKeywords: string[];
  defenseStatement: string;
  defenseCharacterId: string;
  defenseAudioFile: string | null;
  defenseKeywords: string[];
}

// ============================================================
// Hangman's Gambit
// ============================================================

export interface HangmansGambit extends BaseMinigame {
  gameType: 'hangmans_gambit';
  typeSpecific: HangmansGambitData;
}

export interface HangmansGambitData {
  answerKey: string;
}

// ============================================================
// Stub types (not yet implemented in Godot, no editor yet)
// ============================================================

export interface RebuttalShowdown extends BaseMinigame {
  gameType: 'rebuttal_showdown';
  typeSpecific: Record<string, unknown>;
}

export interface PsycheTaxi extends BaseMinigame {
  gameType: 'psyche_taxi';
  typeSpecific: Record<string, unknown>;
}

export interface ClosingArgument extends BaseMinigame {
  gameType: 'closing_argument';
  typeSpecific: Record<string, unknown>;
}

// ============================================================
// Default typeSpecific factories
// ============================================================

export function createDefaultTypeSpecific(gameType: string): Record<string, unknown> {
  switch (gameType) {
    case 'nonstop_debate':
      return { selectedBullets: [], dialogueLines: [] } satisfies NonstopDebateData;
    case 'mass_panic_debate':
      return {
        speaker1CharacterId: '',
        speaker2CharacterId: '',
        speaker3CharacterId: '',
        lineGroups: [],
      } satisfies MassPanicDebateData;
    case 'logic_dive':
      return { questions: [] } satisfies LogicDiveData;
    case 'debate_scrum':
      return { arguments: [] } satisfies DebateScrumData;
    case 'hangmans_gambit':
      return { answerKey: '' } satisfies HangmansGambitData;
    default:
      return {};
  }
}
