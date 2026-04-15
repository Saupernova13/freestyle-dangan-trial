import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryFileSystemAdapter } from '../../src/services/filesystem.js';
import { PersistenceService } from '../../src/services/persistence.js';
import { TrialAPI } from '../../src/api/trial-api.js';
import type { Character, TrialData } from '../../src/domain/types.js';

function makeTrialJson(overrides: Partial<TrialData> = {}): TrialData {
  return {
    trialName: 'Test Trial',
    characters: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    truthBullets: [],
    minigames: [],
    script: { lines: [], lastModified: new Date().toISOString() },
    metadata: {
      version: '4.0',
      lastModified: new Date().toISOString(),
      totalCharacters: 0,
      scriptLineCount: 0,
      minigameCount: 0,
      truthBulletCount: 0,
    },
    ...overrides,
  };
}

function makeCharacter(id: string, name: string, surname: string): Character {
  return {
    id,
    name,
    surname,
    heightM: 1,
    heightCM: 60,
    weight: '52',
    chest: '75',
    blood: 'A',
    dob: '1993-02-05',
    likes: '',
    dislikes: '',
    notes: '',
    isHeadmaster: false,
    position: 0,
    lastModified: new Date().toISOString(),
  };
}

describe('PersistenceService', () => {
  let fs: InMemoryFileSystemAdapter;
  let service: PersistenceService;

  beforeEach(() => {
    fs = new InMemoryFileSystemAdapter();
    service = new PersistenceService(fs);
  });

  describe('loadTrial', () => {
    it('loads a basic trial', async () => {
      const trialData = makeTrialJson({ trialName: 'Chapter 1' });
      fs = new InMemoryFileSystemAdapter({
        'trial.json': JSON.stringify(trialData),
      });
      await fs.chooseDirectory();
      service = new PersistenceService(fs);

      const api = await service.loadTrial();
      expect(api.getTrialName()).toBe('Chapter 1');
      expect(api.getCast().length).toBe(17);
    });

    it('loads characters from folder structure', async () => {
      const char = makeCharacter('NK_19930205_ABC123', 'Makoto', 'Naegi');
      const trialData = makeTrialJson({
        trialName: 'Test',
        characters: ['NK_19930205_ABC123', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      });

      fs = new InMemoryFileSystemAdapter({
        'trial.json': JSON.stringify(trialData),
        'Characters/Naegi_Makoto/character.json': JSON.stringify(char),
      });
      await fs.chooseDirectory();
      service = new PersistenceService(fs);

      const api = await service.loadTrial();
      expect(api.getCharacterAtPosition(0)?.name).toBe('Makoto');
      expect(api.getCharacterAtPosition(0)?.surname).toBe('Naegi');
      expect(api.getCharacterAtPosition(1)).toBeNull();
    });

    it('loads truth bullets', async () => {
      const trialData = makeTrialJson({
        truthBullets: [
          { bulletId: 'tb_1', name: 'Knife', description: 'A bloody knife', imageFile: null, inversedLieBulletName: '' },
        ],
      });

      fs = new InMemoryFileSystemAdapter({
        'trial.json': JSON.stringify(trialData),
      });
      await fs.chooseDirectory();
      service = new PersistenceService(fs);

      const api = await service.loadTrial();
      expect(api.getTruthBullets().length).toBe(1);
      expect(api.getTruthBullets()[0].name).toBe('Knife');
    });

    it('loads minigames', async () => {
      const trialData = makeTrialJson({
        minigames: [
          {
            gameId: 'mg_1',
            name: 'Test Debate',
            gameType: 'nonstop_debate',
            difficulty: 'medium',
            timeLimit: 60,
            typeSpecific: { selectedBullets: [], dialogueLines: [] },
          },
        ],
      });

      fs = new InMemoryFileSystemAdapter({
        'trial.json': JSON.stringify(trialData),
      });
      await fs.chooseDirectory();
      service = new PersistenceService(fs);

      const api = await service.loadTrial();
      expect(api.getMinigames().length).toBe(1);
      expect(api.getMinigames()[0].gameType).toBe('nonstop_debate');
    });
  });

  describe('saveTrial', () => {
    it('saves and reloads round-trip', async () => {
      fs = new InMemoryFileSystemAdapter({});
      await fs.chooseDirectory();
      service = new PersistenceService(fs);

      const api = new TrialAPI();
      api.setTrialName('Round Trip Test');
      api.addTruthBullet({ name: 'Clue', description: 'Important', imageFile: null, inversedLieBulletName: '' });
      api.addScriptLine({
        type: 'narrator',
        dialogue: 'The trial begins...',
        audioFile: null,
        highlights: [],
        specialEffects: { effects: [] },
        dialogueBoxStyle: { style: 'default', borderColor: '#FFF', bgOpacity: 0.9, borderThickness: 2 },
      });

      await service.saveTrial(api);

      // Verify file was written
      expect(fs.has('trial.json')).toBe(true);

      // Reload
      const api2 = await service.loadTrial();
      expect(api2.getTrialName()).toBe('Round Trip Test');
      expect(api2.getTruthBullets().length).toBe(1);
      expect(api2.getScriptLines().length).toBe(1);
    });
  });

  describe('hasExistingTrial', () => {
    it('returns true when trial.json exists', async () => {
      fs = new InMemoryFileSystemAdapter({
        'trial.json': JSON.stringify(makeTrialJson()),
      });
      await fs.chooseDirectory();
      service = new PersistenceService(fs);

      expect(await service.hasExistingTrial()).toBe(true);
    });

    it('returns false when trial.json is missing', async () => {
      fs = new InMemoryFileSystemAdapter({});
      await fs.chooseDirectory();
      service = new PersistenceService(fs);

      expect(await service.hasExistingTrial()).toBe(false);
    });
  });
});
