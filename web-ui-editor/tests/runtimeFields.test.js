// @vitest-environment jsdom
//
// RUNTIME_FIELDS in trialSerialize.js is a schema contract wearing the clothes
// of an optimisation. It lists every Blob field the minigame tree can hold so
// JSON.stringify drops them. A fourth blob field added by a new editor would
// be written to trial.json as `{}` and read back by the engine as a corrupt
// record - and nothing would fail, because the schema allows unknown keys.
//
// So this checks the set against the blob fields the audio walk actually
// knows about, which is where a new one would be declared.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minigameAudioSlots } from '../js/core/minigameAudio.js';
import { buildTrialJson } from '../js/core/trialSerialize.js';
import { MINIGAME_TYPE_LABELS } from '../js/core/constants.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const readSource = (file) => readFileSync(join(root, file), 'utf8');

// One minigame per audio-bearing type, each holding every list the walk reads.
function everyAudioSlot() {
  const typeSpecific = {
    dialogueLines: [{ lineId: 'l1' }],
    arguments: [{ argumentId: 'a1' }],
    lineGroups: [{ groupId: 'g1', speaker1: {}, speaker2: {}, speaker3: {} }],
  };
  return Object.keys(MINIGAME_TYPE_LABELS).flatMap((gameType) => [
    ...minigameAudioSlots({ gameId: 'g', gameType, typeSpecific }),
  ]);
}

function declaredRuntimeFields() {
  const source = readSource('js/core/trialSerialize.js');
  const line = source.match(/const RUNTIME_FIELDS = new Set\(\[([^\]]*)\]\)/);
  return new Set([...line[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
}

describe('the fields stripped from trial.json', () => {
  it('covers every blob field the audio walk knows about', () => {
    const walked = new Set(everyAudioSlot().map((slot) => slot.blob));
    expect(walked.size).toBeGreaterThan(0);
    for (const field of walked) {
      expect([...declaredRuntimeFields()]).toContain(field);
    }
  });

  it('lists nothing the walk does not produce', () => {
    // A stale entry is harmless but misleading: it says a field exists that
    // no editor writes any more.
    const walked = new Set(everyAudioSlot().map((slot) => slot.blob));
    for (const field of declaredRuntimeFields()) {
      expect([...walked]).toContain(field);
    }
  });

  it('keeps a blob out of the saved trial', () => {
    const json = buildTrialJson({
      trialName: 'T',
      cast: [],
      scriptLines: [],
      truthBullets: [],
      minigames: [
        {
          gameId: 'g1',
          gameType: 'nonstop_debate',
          typeSpecific: {
            dialogueLines: [
              { lineId: 'l1', voiceLineFile: 'a.wav', voiceLineBlob: new Blob(['x']) },
            ],
          },
        },
      ],
    });
    const line = json.minigames[0].typeSpecific.dialogueLines[0];
    expect(line.voiceLineFile).toBe('a.wav');
    // Not `{}`, which is what an unlisted Blob serializes to.
    expect('voiceLineBlob' in line).toBe(false);
  });
});

describe('the sprite magnifier lens', () => {
  it('is the size its CSS draws it', () => {
    // The lens is positioned by subtracting half of this and the zoomed
    // background is offset by the same, so a mismatch puts the magnified
    // pixel under the wrong point of the cursor.
    const size = readSource('js/components/spriteMagnifier.js').match(
      /const SPRITE_MAGNIFIER_SIZE = (\d+)/
    )[1];
    const css = readSource('css/components/modal.css');
    const lens = css.slice(css.indexOf('.sprite-magnifier-lens {'));
    expect(lens).toContain(`width: ${size}px;`);
    expect(lens).toContain(`height: ${size}px;`);
  });
});
