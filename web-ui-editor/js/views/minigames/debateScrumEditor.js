// Debate Scrum minigame editor
// Handles paired opposition/defense arguments with audio and keywords

// Drag state for arguments
let draggedArgumentId = null;

// Audio players state
const debateScumAudioPlayers = {};

// ==================== Main Rendering ====================

function renderDebateScumEditor(mg) {
  // Initialize typeSpecific
  if (!mg.typeSpecific) {
    mg.typeSpecific = {};
  }
  if (!mg.typeSpecific.arguments) {
    mg.typeSpecific.arguments = [];
  }

  const args = mg.typeSpecific.arguments;

  let html = `
    <div class="minigame-editor-section">
      <h3>Debate Arguments (${args.length}/8)</h3>
      <p class="help-text">Create paired opposition and defense statements.</p>
  `;

  if (args.length === 0) {
    html += `
      <div class="empty-state-small">
        <p>No arguments yet. Click "Add Argument" to create your first paired statement.</p>
      </div>
    `;
  } else {
    html += renderDebateScumArguments(mg.gameId, args);
  }

  html += `</div>`;

  // Add floating button for arguments (only if under max limit)
  if (args.length < 8) {
    html += `
      <button class="minigame-floating-btn"
              onclick="addDebateScumArgument('${mg.gameId}')"
              title="Add Argument">
        ➕ <span class="minigame-floating-btn-text">Add Argument</span>
      </button>
    `;
  }

  return html;
}

function renderDebateScumArguments(gameId, args) {
  let html = '';

  // Add drop zone at top
  html += `<div class="argument-drop-zone"
                data-insert-position="0"
                ondragover="handleArgumentGapDragOver(event)"
                ondrop="handleArgumentDropInGap(event, '${gameId}', 0)"
                ondragleave="handleArgumentGapDragLeave(event)"></div>`;

  args.sort((a, b) => a.order - b.order).forEach((arg, index) => {
    html += `
      <div class="argument-wrapper"
           draggable="true"
           ondragstart="handleArgumentDragStart(event, '${gameId}', '${arg.argumentId}')"
           ondragend="handleArgumentDragEnd(event)">
        ${renderDebateScumArgumentEditor(gameId, arg, index)}
      </div>
      <div class="argument-drop-zone"
           data-insert-position="${index + 1}"
           ondragover="handleArgumentGapDragOver(event)"
           ondrop="handleArgumentDropInGap(event, '${gameId}', ${index + 1})"
           ondragleave="handleArgumentGapDragLeave(event)"></div>
    `;
  });

  return html;
}

function renderDebateScumArgumentEditor(gameId, arg, index) {
  return `
    <div class="debate-argument-card" data-argument-id="${arg.argumentId}">
      <div class="argument-header">
        <div class="argument-drag-handle">
          <div class="arrow-btn arrow-up"
               onclick="event.stopPropagation(); moveArgumentUp('${gameId}', '${arg.argumentId}')"
               title="Move up">▲</div>
          <div class="arrow-btn arrow-down"
               onclick="event.stopPropagation(); moveArgumentDown('${gameId}', '${arg.argumentId}')"
               title="Move down">▼</div>
        </div>
        <div class="argument-number">Argument #${index + 1}</div>
        <button class="btn-icon"
                onclick="event.stopPropagation(); deleteDebateScumArgument('${gameId}', '${arg.argumentId}')"
                title="Delete argument">🗑️</button>
      </div>

      <div class="argument-body">
        <div class="argument-side opposition-side">
          <h4>🔴 Opposition Side</h4>

          <div class="form-group">
            <label>Character</label>
            <select class="form-input"
                    onchange="updateDebateScumArgument('${gameId}', '${arg.argumentId}', 'oppositionCharacterId', this.value)">
              <option value="">None</option>
              ${cast.filter(c => c).map(c => `
                <option value="${c.id}" ${arg.oppositionCharacterId === c.id ? 'selected' : ''}>
                  ${c.name} ${c.surname}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Statement</label>
            <textarea class="form-input"
                      rows="3"
                      placeholder="Opposition statement..."
                      onchange="updateDebateScumArgument('${gameId}', '${arg.argumentId}', 'oppositionStatement', this.value)">${arg.oppositionStatement || ''}</textarea>
          </div>

          <div class="form-group">
            <label>Keywords (one per line)</label>
            <textarea class="form-input keywords-input"
                      rows="2"
                      placeholder="Enter keywords, one per line..."
                      onchange="updateDebateScumArgumentKeywords('${gameId}', '${arg.argumentId}', 'opposition', this.value)">${(arg.oppositionKeywords || []).join('\n')}</textarea>
            <small style="color: var(--text-tertiary);">Keywords that will be highlighted during this argument</small>
          </div>

          <div class="form-group">
            <label>Voice Line Audio</label>
            ${arg.oppositionAudioFile ? `
              <div class="audio-preview-mini">
                <span class="audio-icon">🎵</span>
                <span class="audio-filename">${arg.oppositionAudioFile}</span>
                <button class="btn btn-secondary btn-sm"
                        id="scrum-play-btn-${arg.argumentId}-opposition"
                        onclick="playDebateScumAudio('${gameId}', '${arg.argumentId}', 'opposition')">
                  ▶️ Play
                </button>
                <button class="btn btn-secondary btn-sm"
                        onclick="clearDebateScumAudio('${gameId}', '${arg.argumentId}', 'opposition')">
                  🗑️ Remove
                </button>
              </div>
            ` : `
              <input type="file"
                     accept="audio/*"
                     onchange="handleDebateScumAudioUpload('${gameId}', '${arg.argumentId}', 'opposition', event)">
            `}
          </div>
        </div>

        <div class="argument-side defense-side">
          <h4>🔵 Defense Side</h4>

          <div class="form-group">
            <label>Character</label>
            <select class="form-input"
                    onchange="updateDebateScumArgument('${gameId}', '${arg.argumentId}', 'defenseCharacterId', this.value)">
              <option value="">None</option>
              ${cast.filter(c => c).map(c => `
                <option value="${c.id}" ${arg.defenseCharacterId === c.id ? 'selected' : ''}>
                  ${c.name} ${c.surname}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Counter Statement</label>
            <textarea class="form-input"
                      rows="3"
                      placeholder="Defense counter statement..."
                      onchange="updateDebateScumArgument('${gameId}', '${arg.argumentId}', 'defenseStatement', this.value)">${arg.defenseStatement || ''}</textarea>
          </div>

          <div class="form-group">
            <label>Keywords (one per line)</label>
            <textarea class="form-input keywords-input"
                      rows="2"
                      placeholder="Enter keywords, one per line..."
                      onchange="updateDebateScumArgumentKeywords('${gameId}', '${arg.argumentId}', 'defense', this.value)">${(arg.defenseKeywords || []).join('\n')}</textarea>
            <small style="color: var(--text-tertiary);">Keywords that will be highlighted during this argument</small>
          </div>

          <div class="form-group">
            <label>Voice Line Audio</label>
            ${arg.defenseAudioFile ? `
              <div class="audio-preview-mini">
                <span class="audio-icon">🎵</span>
                <span class="audio-filename">${arg.defenseAudioFile}</span>
                <button class="btn btn-secondary btn-sm"
                        id="scrum-play-btn-${arg.argumentId}-defense"
                        onclick="playDebateScumAudio('${gameId}', '${arg.argumentId}', 'defense')">
                  ▶️ Play
                </button>
                <button class="btn btn-secondary btn-sm"
                        onclick="clearDebateScumAudio('${gameId}', '${arg.argumentId}', 'defense')">
                  🗑️ Remove
                </button>
              </div>
            ` : `
              <input type="file"
                     accept="audio/*"
                     onchange="handleDebateScumAudioUpload('${gameId}', '${arg.argumentId}', 'defense', event)">
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==================== Argument Management ====================

function addDebateScumArgument(gameId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  if (!mg.typeSpecific) mg.typeSpecific = {};
  if (!mg.typeSpecific.arguments) mg.typeSpecific.arguments = [];

  if (mg.typeSpecific.arguments.length >= 8) {
    alert('Maximum 8 arguments allowed');
    return;
  }

  const newArg = {
    argumentId: `arg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    order: mg.typeSpecific.arguments.length,
    // Opposition side
    oppositionStatement: "",
    oppositionCharacterId: "",
    oppositionAudioFile: null,
    oppositionAudioBlob: null,
    oppositionKeywords: [],
    // Defense side
    defenseStatement: "",
    defenseCharacterId: "",
    defenseAudioFile: null,
    defenseAudioBlob: null,
    defenseKeywords: []
  };

  mg.typeSpecific.arguments.push(newArg);
  renderMinigameDetails();
  autoSaveTrial();
}

function deleteDebateScumArgument(gameId, argumentId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  mg.typeSpecific.arguments = mg.typeSpecific.arguments.filter(a => a.argumentId !== argumentId);

  // Re-index order
  mg.typeSpecific.arguments.forEach((a, index) => {
    a.order = index;
  });

  renderMinigameDetails();
  autoSaveTrial();
}

function updateDebateScumArgument(gameId, argumentId, field, value) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find(a => a.argumentId === argumentId);
  if (!arg) return;

  arg[field] = value;
  autoSaveTrial();
}

function updateDebateScumArgumentKeywords(gameId, argumentId, side, value) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find(a => a.argumentId === argumentId);
  if (!arg) return;

  // Split by newlines and filter empty
  const keywords = value.split('\n').map(k => k.trim()).filter(k => k.length > 0);

  if (side === 'opposition') {
    arg.oppositionKeywords = keywords;
  } else {
    arg.defenseKeywords = keywords;
  }

  autoSaveTrial();
}

// ==================== Argument Reordering ====================

function moveArgumentUp(gameId, argumentId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const args = mg.typeSpecific.arguments;
  const currentIndex = args.findIndex(a => a.argumentId === argumentId);
  if (currentIndex <= 0) return;

  [args[currentIndex], args[currentIndex - 1]] = [args[currentIndex - 1], args[currentIndex]];
  args.forEach((a, index) => { a.order = index; });

  renderMinigameDetails();
  autoSaveTrial();
}

function moveArgumentDown(gameId, argumentId) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const args = mg.typeSpecific.arguments;
  const currentIndex = args.findIndex(a => a.argumentId === argumentId);
  if (currentIndex === -1 || currentIndex >= args.length - 1) return;

  [args[currentIndex], args[currentIndex + 1]] = [args[currentIndex + 1], args[currentIndex]];
  args.forEach((a, index) => { a.order = index; });

  renderMinigameDetails();
  autoSaveTrial();
}

// ==================== Drag-and-Drop for Arguments ====================

function handleArgumentDragStart(event, gameId, argumentId) {
  draggedArgumentId = argumentId;
  event.target.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
}

function handleArgumentDragEnd(event) {
  event.target.classList.remove('dragging');
  draggedArgumentId = null;
  document.querySelectorAll('.drag-over-gap').forEach(el => {
    el.classList.remove('drag-over-gap');
  });
}

function handleArgumentDropInGap(event, gameId, insertPosition) {
  event.preventDefault();
  event.stopPropagation();

  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg || !draggedArgumentId) return;

  const args = mg.typeSpecific.arguments;
  const draggedIndex = args.findIndex(a => a.argumentId === draggedArgumentId);

  if (draggedIndex === -1) return;
  if (insertPosition === draggedIndex || insertPosition === draggedIndex + 1) {
    draggedArgumentId = null;
    renderMinigameDetails();
    return;
  }

  const [draggedArg] = args.splice(draggedIndex, 1);
  let adjustedPosition = insertPosition;
  if (draggedIndex < insertPosition) adjustedPosition--;

  args.splice(adjustedPosition, 0, draggedArg);
  args.forEach((a, index) => { a.order = index; });

  draggedArgumentId = null;
  renderMinigameDetails();
  autoSaveTrial();
}

function handleArgumentGapDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('drag-over-gap');
}

function handleArgumentGapDragLeave(event) {
  event.currentTarget.classList.remove('drag-over-gap');
}

// ==================== Audio Handling ====================

async function handleDebateScumAudioUpload(gameId, argumentId, side, event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type (audio only)
  if (!file.type.startsWith('audio/')) {
    alert('Please select an audio file');
    event.target.value = '';
    return;
  }

  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find(a => a.argumentId === argumentId);
  if (!arg) return;

  try {
    // Create nested directory: Audio/Minigames/{gameId}/
    const audioDir = await dirHandle.getDirectoryHandle("Audio", { create: true });
    const minigamesDir = await audioDir.getDirectoryHandle("Minigames", { create: true });
    const gameAudioDir = await minigamesDir.getDirectoryHandle(gameId, { create: true });

    // Generate filename: scrum_{argumentId}_{side}.{ext}
    const ext = file.name.split('.').pop();
    const audioFileName = `scrum_${argumentId}_${side}.${ext}`;

    // Write audio file to disk
    const audioFileHandle = await gameAudioDir.getFileHandle(audioFileName, { create: true });
    const writable = await audioFileHandle.createWritable();
    await writable.write(file);
    await writable.close();

    // Store file information
    if (side === 'opposition') {
      arg.oppositionAudioFile = audioFileName;
      arg.oppositionAudioBlob = file;
    } else {
      arg.defenseAudioFile = audioFileName;
      arg.defenseAudioBlob = file;
    }

    renderMinigameDetails();
    autoSaveTrial();
  } catch (error) {
    console.error("Error saving audio:", error);
    alert(`Failed to save audio: ${error.message}`);
  }
}

async function clearDebateScumAudio(gameId, argumentId, side) {
  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find(a => a.argumentId === argumentId);
  if (!arg) return;

  const audioFile = side === 'opposition' ? arg.oppositionAudioFile : arg.defenseAudioFile;

  // Delete file from disk
  if (audioFile) {
    try {
      const audioDir = await dirHandle.getDirectoryHandle("Audio", { create: false });
      const minigamesDir = await audioDir.getDirectoryHandle("Minigames", { create: false });
      const gameAudioDir = await minigamesDir.getDirectoryHandle(gameId, { create: false });
      await gameAudioDir.removeEntry(audioFile);
    } catch (e) {
      console.warn("Could not remove audio file:", e);
    }
  }

  // Clear metadata
  if (side === 'opposition') {
    arg.oppositionAudioFile = null;
    arg.oppositionAudioBlob = null;
  } else {
    arg.defenseAudioFile = null;
    arg.defenseAudioBlob = null;
  }

  renderMinigameDetails();
  autoSaveTrial();
}

// ==================== Audio Playback ====================

async function playDebateScumAudio(gameId, argumentId, side) {
  const playerKey = `${gameId}_${argumentId}_${side}`;
  const player = debateScumAudioPlayers[playerKey];

  // Toggle pause if already playing
  if (player && !player.paused) {
    player.pause();
    player.currentTime = 0;
    updateDebateScumPlayButton(argumentId, side, false);
    return;
  }

  const mg = minigames.find(m => m.gameId === gameId);
  if (!mg) return;

  const arg = mg.typeSpecific.arguments.find(a => a.argumentId === argumentId);
  if (!arg) return;

  // Get audio file and blob
  const audioFile = side === 'opposition' ? arg.oppositionAudioFile : arg.defenseAudioFile;
  let audioBlob = side === 'opposition' ? arg.oppositionAudioBlob : arg.defenseAudioBlob;

  if (!audioFile) return;

  // Load audio from disk if needed
  if (!audioBlob) {
    try {
      const audioDir = await dirHandle.getDirectoryHandle("Audio", { create: false });
      const minigamesDir = await audioDir.getDirectoryHandle("Minigames", { create: false });
      const gameAudioDir = await minigamesDir.getDirectoryHandle(gameId, { create: false });
      const fileHandle = await gameAudioDir.getFileHandle(audioFile);
      const file = await fileHandle.getFile();
      audioBlob = file;

      // Store blob for future use
      if (side === 'opposition') {
        arg.oppositionAudioBlob = file;
      } else {
        arg.defenseAudioBlob = file;
      }
    } catch (error) {
      console.error("Error loading audio:", error);
      alert("Failed to load audio file");
      return;
    }
  }

  try {
    const blobUrl = URL.createObjectURL(audioBlob);

    // Create or reuse audio element
    if (!debateScumAudioPlayers[playerKey]) {
      const audio = new Audio();
      debateScumAudioPlayers[playerKey] = audio;

      audio.onended = () => {
        updateDebateScumPlayButton(argumentId, side, false);
        URL.revokeObjectURL(audio.src);
      };

      audio.onerror = () => {
        alert("Audio playback error");
        updateDebateScumPlayButton(argumentId, side, false);
      };
    }

    const audio = debateScumAudioPlayers[playerKey];
    audio.src = blobUrl;
    await audio.play();
    updateDebateScumPlayButton(argumentId, side, true);
  } catch (error) {
    console.error("Error playing audio:", error);
    alert(`Failed to play audio: ${error.message}`);
  }
}

function updateDebateScumPlayButton(argumentId, side, isPlaying) {
  const btn = document.getElementById(`scrum-play-btn-${argumentId}-${side}`);
  if (btn) {
    btn.innerHTML = isPlaying ? '⏸️ Pause' : '▶️ Play';
  }
}
