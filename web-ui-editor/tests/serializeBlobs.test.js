// Runtime audio Blobs live several levels down inside typeSpecific, so a
// shallow strip would leave them in trial.json - where JSON.stringify turns a
// Blob into {} and the file quietly grows a field the engine cannot use. The
// suite covered the pure modules that were already simple and none of the ones
// that can damage a trial (#53).
import { describe, expect, it } from 'vitest';
import { buildTrialJson } from '../js/core/trialSerialize.js';

// Stands in for a File/Blob without needing one: the replacer keys on the
// field name, so what the value is does not matter.
const BLOB = { size: 1234, type: 'audio/mpeg' };

function stateWith(minigames) {
  return { trialName: 'T', cast: [], scriptLines: [], truthBullets: [], minigames };
}

describe('buildTrialJson', () => {
  it('drops a blob nested in a nonstop dialogue line', () => {
    const out = buildTrialJson(
      stateWith([
        {
          gameId: 'mg_1',
          gameType: 'nonstop_debate',
          typeSpecific: {
            dialogueLines: [{ lineId: 'l1', voiceLineFile: 'l1.mp3', voiceLineBlob: BLOB }],
          },
        },
      ])
    );
    const line = out.minigames[0].typeSpecific.dialogueLines[0];
    expect(line.voiceLineBlob).toBeUndefined();
    // The filename is what the engine loads from, so it has to survive.
    expect(line.voiceLineFile).toBe('l1.mp3');
  });

  it('drops a blob two levels down in a mass panic group', () => {
    const out = buildTrialJson(
      stateWith([
        {
          gameId: 'mg_1',
          gameType: 'mass_panic_debate',
          typeSpecific: {
            lineGroups: [
              {
                groupId: 'g1',
                speaker1: { voiceLineFile: 'a.mp3', voiceLineBlob: BLOB },
                speaker2: { voiceLineFile: null, voiceLineBlob: BLOB },
              },
            ],
          },
        },
      ])
    );
    const group = out.minigames[0].typeSpecific.lineGroups[0];
    expect(group.speaker1.voiceLineBlob).toBeUndefined();
    expect(group.speaker2.voiceLineBlob).toBeUndefined();
    expect(group.speaker1.voiceLineFile).toBe('a.mp3');
  });

  it('drops both scrum audio blobs', () => {
    const out = buildTrialJson(
      stateWith([
        {
          gameId: 'mg_1',
          gameType: 'debate_scrum',
          typeSpecific: {
            arguments: [
              {
                argumentId: 'a1',
                oppositionAudioFile: 'o.mp3',
                oppositionAudioBlob: BLOB,
                defenseAudioFile: 'd.mp3',
                defenseAudioBlob: BLOB,
              },
            ],
          },
        },
      ])
    );
    const arg = out.minigames[0].typeSpecific.arguments[0];
    expect(arg.oppositionAudioBlob).toBeUndefined();
    expect(arg.defenseAudioBlob).toBeUndefined();
    expect(arg.oppositionAudioFile).toBe('o.mp3');
    expect(arg.defenseAudioFile).toBe('d.mp3');
  });

  it('leaves the saved minigames disconnected from live state', () => {
    // The serializer round-trips through JSON, so a later edit to state must
    // not reach an object the caller is about to write.
    const state = stateWith([
      { gameId: 'mg_1', gameType: 'hangmans_gambit', typeSpecific: { answerKey: 'KNIFE' } },
    ]);
    const out = buildTrialJson(state);
    state.minigames[0].typeSpecific.answerKey = 'CHANGED';
    expect(out.minigames[0].typeSpecific.answerKey).toBe('KNIFE');
  });

  it('keeps truth bullet image data out of the file', () => {
    const out = buildTrialJson({
      trialName: 'T',
      cast: [],
      scriptLines: [],
      minigames: [],
      truthBullets: [
        {
          bulletId: 'tb_1',
          name: 'Knife',
          description: '',
          imageFile: 'tb_1.png',
          inversedLieBulletName: '',
          imageDataURL: 'data:image/png;base64,AAAA',
        },
      ],
    });
    expect(out.truthBullets[0].imageDataURL).toBeUndefined();
    expect(out.truthBullets[0].imageFile).toBe('tb_1.png');
  });
});
