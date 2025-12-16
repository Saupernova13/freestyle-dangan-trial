// Storage layer - handles file I/O and trial data persistence

async function chooseTrialDir() {
  try {
    showLoader(true);
    let dH = await window.showDirectoryPicker({ id: 'dr-trial-dir', mode: 'readwrite' });
    dirHandle = dH;
    renderDirDisplay(dirHandle);

    let files = [];
    for await (const entry of dirHandle.values()) files.push(entry.name);

    if (files.includes("trial.json")) {
      try {
        const file = await dirHandle.getFileHandle("trial.json").then(fh => fh.getFile());
        const data = JSON.parse(await file.text());
        trialName = data.trialName || "";
        document.getElementById('trialNameInput').value = trialName;

        // Load characters from ID references
        await loadCharactersFromIds(data.characters || []);

        // Load script lines
        if (data.script && data.script.lines) {
          scriptLines = data.script.lines;
        } else {
          scriptLines = [];
        }

        // Load minigames
        if (data.minigames && Array.isArray(data.minigames)) {
          minigames = data.minigames;
          await loadMinigameAudio();
        } else {
          minigames = [];
        }

        // Load truth bullets
        if (data.truthBullets && Array.isArray(data.truthBullets)) {
          truthBullets = data.truthBullets;
          await loadTruthBulletImages();
        } else {
          truthBullets = [];
        }
      } catch (error) {
        console.error("Failed to parse trial.json:", error);
        // Initialize with empty trial if corrupted
        trialName = "";
        document.getElementById('trialNameInput').value = "";
        cast = Array(BLOCK_COUNT).fill(null);
        scriptLines = [];
        minigames = [];
        truthBullets = [];
      }
    } else {
      trialName = "";
      document.getElementById('trialNameInput').value = "";
      cast = Array(BLOCK_COUNT).fill(null);
      scriptLines = [];
      minigames = [];
      truthBullets = [];
      await dirHandle.getDirectoryHandle('Characters', { create: true });
    }

    showLoader(false);
    renderActiveView();
  } catch (err) {
    console.log(err);
    showLoader(false);
  }
}

async function loadCharactersFromIds(characterIds) {
  cast = Array(BLOCK_COUNT).fill(null);

  let charsDir = await dirHandle.getDirectoryHandle("Characters", { create: false }).catch(() => null);
  if (!charsDir) return;

  for (let i = 0; i < characterIds.length; i++) {
    const charId = characterIds[i];
    if (charId) {
      try {
        // Find character folder by ID
        for await (const [folderName, folderHandle] of charsDir.entries()) {
          if (folderHandle.kind === 'directory') {
            try {
              let charFile = await folderHandle.getFileHandle("character.json");
              let charData = JSON.parse(await (await charFile.getFile()).text());

              if (charData.id === charId) {
                // Load sprites
                charData.sprites = [];
                const spriteCount = appSettings.maxSprites;
                for (let j = 1; j <= spriteCount; j++) {
                  try {
                    let f = await folderHandle.getFileHandle(`sprite_${String(j).padStart(2, '0')}.png`);
                    let file = await f.getFile();
                    let b64 = await fileToDataUrl(file);
                    charData.sprites.push({ dataURL: b64, fname: file.name, blob: file });
                  } catch {
                    charData.sprites.push(null);
                  }
                }

                cast[i] = charData;
                break;
              }
            } catch {
              continue;
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to load character at position ${i}:`, error);
      }
    }
  }
}

async function loadTruthBulletImages() {
  let bulletsDir = await dirHandle.getDirectoryHandle("TruthBullets", { create: false }).catch(() => null);
  if (!bulletsDir) return;

  for (let bullet of truthBullets) {
    if (bullet.imageFile) {
      try {
        const fileHandle = await bulletsDir.getFileHandle(bullet.imageFile);
        const file = await fileHandle.getFile();
        const dataURL = await fileToDataUrl(file);
        bullet.imageDataURL = dataURL;
      } catch (error) {
        console.warn(`Failed to load image for bullet ${bullet.bulletId}:`, error);
      }
    }
  }
}

async function loadMinigameAudio() {
  try {
    const audioDir = await dirHandle.getDirectoryHandle("Audio", { create: false });
    const minigamesDir = await audioDir.getDirectoryHandle("Minigames", { create: false });

    for (let mg of minigames) {
      try {
        const gameAudioDir = await minigamesDir.getDirectoryHandle(mg.gameId, { create: false });

        // Load Nonstop Debate dialogue audio
        if (mg.gameType === 'nonstop_debate' && mg.typeSpecific && mg.typeSpecific.dialogueLines) {
          for (let line of mg.typeSpecific.dialogueLines) {
            if (line.voiceLineFile) {
              try {
                const fileHandle = await gameAudioDir.getFileHandle(line.voiceLineFile);
                const file = await fileHandle.getFile();
                line.voiceLineBlob = file;
              } catch (error) {
                console.warn(`Failed to load audio for dialogue line ${line.lineId}:`, error);
              }
            }
          }
        }

        // Load Debate Scrum argument audio
        if (mg.gameType === 'debate_scrum' && mg.typeSpecific && mg.typeSpecific.arguments) {
          for (let arg of mg.typeSpecific.arguments) {
            if (arg.oppositionAudioFile) {
              try {
                const fileHandle = await gameAudioDir.getFileHandle(arg.oppositionAudioFile);
                const file = await fileHandle.getFile();
                arg.oppositionAudioBlob = file;
              } catch (error) {
                console.warn(`Failed to load opposition audio for argument ${arg.argumentId}:`, error);
              }
            }
            if (arg.defenseAudioFile) {
              try {
                const fileHandle = await gameAudioDir.getFileHandle(arg.defenseAudioFile);
                const file = await fileHandle.getFile();
                arg.defenseAudioBlob = file;
              } catch (error) {
                console.warn(`Failed to load defense audio for argument ${arg.argumentId}:`, error);
              }
            }
          }
        }

        // Load Mass Panic Debate speaker audio (line groups structure)
        if (mg.gameType === 'mass_panic_debate' && mg.typeSpecific && mg.typeSpecific.lineGroups) {
          for (let group of mg.typeSpecific.lineGroups) {
            // Each group has speaker1, speaker2, speaker3 lines
            for (let speakerKey of ['speaker1', 'speaker2', 'speaker3']) {
              const line = group[speakerKey];
              if (line && line.voiceLineFile) {
                try {
                  const fileHandle = await gameAudioDir.getFileHandle(line.voiceLineFile);
                  const file = await fileHandle.getFile();
                  line.voiceLineBlob = file;
                } catch (error) {
                  console.warn(`Failed to load audio for panic line ${group.groupId}-${speakerKey}:`, error);
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to load audio for minigame ${mg.gameId}:`, error);
      }
    }
  } catch (error) {
    console.warn("Failed to load minigame audio:", error);
  }
}

async function autoSaveTrial() {
  if (!dirHandle) return;

  // Create minimal ID-only references
  let characterIds = cast.map(c => c ? c.id : null);

  let trialJs = {
    trialName,
    characters: characterIds, // Just an array of IDs or nulls
    truthBullets: truthBullets.map(b => ({  // Exclude imageDataURL
      bulletId: b.bulletId,
      name: b.name,
      description: b.description,
      imageFile: b.imageFile,
      inversedLieBulletName: b.inversedLieBulletName
    })),
    minigames: minigames,
    script: {
      lines: scriptLines,
      lastModified: new Date().toISOString()
    },
    metadata: {
      version: "4.0",
      lastModified: new Date().toISOString(),
      studentCount: blockTypes.filter(t => !t).length,
      headmasterCount: blockTypes.filter(t => t).length,
      totalCharacters: characterIds.filter(id => id !== null).length,
      scriptLineCount: scriptLines.length,
      minigameCount: minigames.length,
      truthBulletCount: truthBullets.length
    }
  };

  let fHandle = await dirHandle.getFileHandle("trial.json", { create: true });
  let wr = await fHandle.createWritable();
  await wr.write(JSON.stringify(trialJs, null, 2));
  await wr.close();
}
