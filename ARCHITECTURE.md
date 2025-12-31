# Architecture Documentation

## Overview

The Freestyle Danganronpa Trial Creator uses a **modular JavaScript architecture** with a clean separation of concerns. The codebase is organized into logical layers (Core, Models, Views, Modals, UI) with a coordinator pattern for managing complex subsystems.

## Design Principles

1. **Single Responsibility**: Each module handles one specific concern
2. **Separation of Concerns**: Clear boundaries between data, presentation, and logic
3. **Coordinator Pattern**: Lightweight coordinators delegate to specialized modules
4. **Shared State**: Global state managed through core/state.js
5. **File-Based Persistence**: File System Access API for local storage

## Directory Structure

### Web UI Editor

```
web-ui-editor/js/
├── core/                   # Core system files
│   ├── constants.js        # Application constants and defaults
│   ├── state.js            # Global state variables
│   └── storage.js          # File System Access API + persistence (with lazy loading)
│
├── models/                 # Data models and utilities
│   └── characterModel.js   # Character data structures and validation
│
├── views/                  # View rendering logic
│   ├── castView.js         # Character cast grid
│   ├── minigameView.js     # Minigame coordinator (245 lines)
│   ├── truthBulletsView.js # Truth bullets management
│   ├── viewManager.js      # View navigation
│   └── minigames/          # Minigame type editors (modular)
│       ├── nonstopDebateEditor.js
│       ├── logicDiveEditor.js
│       ├── debateScrumEditor.js
│       ├── massPanicDebateEditor.js
│       └── hangmansGambitEditor.js
│
├── modals/                 # Modal dialog components
│   ├── modalCoordinator.js # Shared modal utilities
│   ├── characterModal.js   # Character editing
│   ├── truthBulletModal.js # Truth bullet editing
│   └── scriptLineModal.js  # Script line properties
│
├── ui/                     # UI utilities
│   └── theme.js            # Dark/light theme management
│
├── app.js                  # Application bootstrap
├── settings.js             # Settings management
└── utils.js                # Common utilities
```

### CLI Tool

```
cli/
├── package.json                # Node.js dependencies and metadata
├── .gitignore                  # Ignore node_modules
├── README.md                   # Complete CLI documentation
├── create-character.js         # Main CLI entry point
├── lib/                        # Shared modules
│   ├── character-generator.js  # ID generation (ported from web UI)
│   ├── validator.js            # Field validation with defaults
│   ├── sprite-processor.js     # Sprite discovery and copying
│   ├── trial-updater.js        # trial.json read/write
│   └── logger.js               # Colored console output (using chalk)
└── examples/                   # Example batch files
    ├── characters.json         # JSON batch file example
    └── characters.csv          # CSV batch file example
```

## Module Layers

### Layer 1: Core System
**Load Order**: First (no dependencies)

**core/constants.js**
- Application-wide constants
- Default configuration values
- Magic numbers and string constants

**core/state.js**
- Global state variables (cast, minigames, truthBullets, script, etc.)
- Shared by all modules
- No functions, only variable declarations

**core/storage.js**
- File System Access API integration
- Trial data loading/saving (trial.json)
- Character data loading (Characters/{name}/character.json)
- **Lazy sprite loading optimization**: Only loads first sprite per character initially
- `loadRemainingSprites(charIndex)` - Loads remaining 24 sprites on-demand
- Stores folder handles for deferred loading (~90% memory reduction)
- Audio file loading (Audio/, Audio/Minigames/{gameId}/)
- Image file loading (TruthBullets/, Characters/{name}/sprite_*.png)
- Auto-save functionality

### Layer 2: Models
**Load Order**: After core (depends on state.js)

**models/characterModel.js**
- Character data structure definition
- Character ID generation (human-readable format: `JD_19920315_A1B2C3`)
- Validation functions
- Character type utilities (isStudent, isHeadmaster)

### Layer 3: Views
**Load Order**: After core and models

**views/castView.js**
- Renders character cast grid (17 slots)
- Character card HTML generation
- Cast view event handlers

**views/minigameView.js** (Coordinator - 245 lines)
- Renders minigame list
- Renders common settings (name, order, delete)
- **Delegates** type-specific rendering to minigame editor modules
- Pattern:
```javascript
function renderMinigameEditor(mg) {
  let html = /* common settings */;

  // Delegate to specialized module
  if (mg.gameType === 'nonstop_debate') {
    html += renderNonstopDebateEditor(mg);
  } else if (mg.gameType === 'mass_panic_debate') {
    html += renderMassPanicDebateEditor(mg);
  }
  // ...

  return html;
}
```

**views/minigames/*.js** (Type-Specific Editors)
Each minigame editor exports:
- `render{Type}Editor(minigame)` - Returns HTML string for editor UI
- `add{Type}{Entity}()` - Adds new entity (line, question, argument, etc.)
- `update{Type}{Field}()` - Updates entity field
- `delete{Type}{Entity}()` - Removes entity
- `handle{Type}AudioUpload()` - Manages audio files (if applicable)

**views/truthBulletsView.js**
- Renders truth bullets grid
- Bullet card display
- Add/delete truth bullets
- Opens truthBulletModal for editing

**views/viewManager.js**
- Handles view switching (Cast/Script/Truth Bullets/Minigames)
- Updates navigation UI state
- Renders active view

### Layer 4: Modals
**Load Order**: After views (depends on state, views, and storage)

**modals/modalCoordinator.js**
- Generic `closeModal()` function that dispatches to specific modal
- Shared error state variables (`bulletModalErr`, `bulletModalMsg`)
- Determines which modal is open based on active state variables

**modals/characterModal.js**
- `openCharModal(idx)` - **Async** opens character editor with lazy sprite loading
- Calls `loadRemainingSprites(idx)` to load sprites 2-25 on-demand
- `renderCharacterModal()` - Renders modal HTML
- `closeCharModal()` - Closes and cleans up
- `saveCharacter()` - Validates and saves to Characters/{name}/
- State: `activeIdx`, `charFields`, `modalTab`

**modals/truthBulletModal.js**
- `openTruthBulletModal(bulletId)` - Opens bullet editor
- `renderTruthBulletModal()` - Renders modal HTML
- `closeTruthBulletModal()` - Closes and cleans up
- `saveTruthBullet()` - Saves to TruthBullets/
- State: `activeBulletId`, `bulletFields`

**modals/scriptLineModal.js** (1175 lines - complex)
- `openScriptLineModal(lineId)` - Opens line properties editor
- `renderScriptLineModal()` - Renders 5 tabs (sprite, audio, highlights, camera, effects)
- `closeScriptLineModal()` - Closes and cleans up audio
- `saveScriptLine()` - Saves properties and audio to Audio/
- State: `activeLineId`, `scriptLineFields`, `modalTab`

### Layer 5: UI & Utilities
**Load Order**: Early (minimal dependencies)

**ui/theme.js**
- `toggleTheme()` - Switches between dark/light
- `initTheme()` - Loads from localStorage
- Updates `data-theme` attribute on `<body>`

**settings.js**
- Settings object management
- LocalStorage persistence
- Settings modal UI

**utils.js**
- `showLoader(visible)` - Show/hide loading overlay
- `fileToDataURL(file)` - Convert File to data URL for preview
- `renderDirDisplay()` - Render selected directory path
- Common helper functions

### Layer 6: Application Bootstrap
**Load Order**: Last (depends on everything)

**app.js**
- Application initialization
- Global event handler setup
- Initial view rendering

## Data Flow

### Application Startup
1. **index.html** loads scripts in dependency order
2. **core/** modules define constants and state
3. **app.js** initializes application
4. User clicks "Choose Folder"
5. **storage.js** loads trial.json
6. **storage.js** loads character data for each ID in trial.json
7. **castView.js** renders character grid

### Editing a Character
1. User clicks character card
2. **castView.js** calls `openCharModal(idx)`
3. **characterModal.js** renders modal with character data
4. User edits fields → updates `charFields` state
5. User clicks "Save"
6. **characterModal.js** validates and calls **storage.js**
7. **storage.js** writes character.json and sprite files
8. **castView.js** re-renders grid

### Editing a Minigame
1. User switches to "Minigame Details" view
2. **viewManager.js** calls `renderMinigamesView()`
3. **minigameView.js** renders list, delegates editor rendering
4. **minigames/nonstopDebateEditor.js** (for example) renders editor
5. User adds dialogue line → calls `addDialogueLine()`
6. **nonstopDebateEditor.js** updates `minigames` array in state
7. Calls `autoSaveTrial()` in **storage.js**
8. Re-renders editor UI

### File System Operations
All file I/O goes through **storage.js**:

**Reading:**
- `loadTrial()` - Loads trial.json
- `loadCharacterData(id)` - Loads Characters/{name}/character.json
- Loads audio files from Audio/ and Audio/Minigames/{gameId}/
- Loads images from TruthBullets/ and Characters/{name}/

**Writing:**
- `autoSaveTrial()` - Saves trial.json
- Character save → writes character.json + sprites
- Truth bullet save → writes to TruthBullets/{bulletId}.{ext}
- Audio upload → writes to Audio/ or Audio/Minigames/{gameId}/

## State Management

Global state is defined in **core/state.js**:

```javascript
// Trial metadata
let trialName = "";
let dirHandle = null;

// Cast data
let cast = new Array(17).fill(null);

// Script data
let script = { lines: [] };

// Minigame data
let minigames = [];

// Truth bullets
let truthBullets = [];

// Settings
let appSettings = { maxSprites: 25 };
```

**Access Pattern:**
- All modules access state variables directly (global scope)
- Modifications trigger re-renders
- `autoSaveTrial()` called after state changes

## Coordinator Pattern Details

### Minigame Coordinator Pattern
**Problem**: 2397-line monolithic file with all minigame logic

**Solution**:
- **minigameView.js** (245 lines) handles common functionality
- Each minigame type has its own editor module (35-520 lines)
- Coordinator delegates rendering based on `gameType`

**Benefits**:
- Adding new minigame type: create new editor file, register in coordinator
- Bug in Logic Dive? Only edit logicDiveEditor.js
- Easy to find code: each file has clear purpose

**Example Delegation**:
```javascript
// In minigameView.js
function renderMinigameEditor(mg) {
  let html = renderCommonSettings(mg);  // Name, order, delete

  // Delegate type-specific rendering
  switch (mg.gameType) {
    case 'nonstop_debate':
      html += renderNonstopDebateEditor(mg);
      break;
    case 'logic_dive':
      html += renderLogicDiveEditor(mg);
      break;
    // ... other types
  }

  return html;
}
```

### Modal Coordinator Pattern
**Problem**: 1747-line modal.js with 3 different modal types

**Solution**:
- **modalCoordinator.js** (30 lines) provides shared utilities
- Each modal type in separate file (235-1175 lines)
- Generic `closeModal()` dispatches to specific close function

**Benefits**:
- Isolated modal logic
- No conflicts between modal types
- Easy to add new modal types

## Adding New Features

### Adding a New Minigame Type

1. **Create editor file**: `web-ui-editor/js/views/minigames/myGameEditor.js`

```javascript
// Render function (returns HTML string)
function renderMyGameEditor(minigame) {
  return `
    <div class="my-game-editor">
      <h4>My Game Configuration</h4>
      <!-- Your editor UI -->
    </div>
  `;
}

// Add entity function
function addMyGameEntity(gameId) {
  const mg = minigames.find(m => m.gameId === gameId);
  const newEntity = {
    entityId: `entity_${Date.now()}`,
    // ... entity fields
  };
  mg.typeSpecific.entities.push(newEntity);
  renderMinigameDetails();
  autoSaveTrial();
}

// Update entity function
function updateMyGameEntity(gameId, entityId, field, value) {
  const mg = minigames.find(m => m.gameId === gameId);
  const entity = mg.typeSpecific.entities.find(e => e.entityId === entityId);
  entity[field] = value;
  autoSaveTrial();
}
```

2. **Register in coordinator**: Edit `minigameView.js`

```javascript
function renderMinigameEditor(mg) {
  let html = renderCommonSettings(mg);

  // Add your case
  if (mg.gameType === 'my_game') {
    html += renderMyGameEditor(mg);
  }
  // ... existing cases

  return html;
}
```

3. **Add to HTML**: Edit `index.html`

```html
<!-- Add before minigameView.js -->
<script src="js/views/minigames/myGameEditor.js"></script>
<script src="js/views/minigameView.js"></script>
```

4. **Add CSS**: Edit `styles.css`

```css
/* My Game Styles */
.my-game-editor {
  /* Your styles */
}
```

5. **Update storage.js** (if needed for file I/O):

```javascript
// In loadTrial() function
if (mg.gameType === 'my_game' && mg.typeSpecific.entities) {
  // Load any files for your minigame
}
```

### Adding a New Modal Type

1. **Create modal file**: `web-ui-editor/js/modals/myModal.js`

```javascript
let activeMyEntityId = null;
let myEntityFields = {};

function openMyModal(entityId) {
  activeMyEntityId = entityId;
  // Load entity data into myEntityFields
  renderMyModal();
}

function renderMyModal() {
  const root = document.getElementById("modalroot");
  root.innerHTML = `
    <div class="dr-modal-bg">
      <div class="dr-modal">
        <button class="dr-close" onclick="closeMyModal()">&times;</button>
        <!-- Your modal content -->
      </div>
    </div>
  `;
}

function closeMyModal() {
  document.getElementById("modalroot").innerHTML = "";
  activeMyEntityId = null;
}

function saveMyEntity() {
  // Validation and saving logic
  autoSaveTrial();
  closeMyModal();
}
```

2. **Register in coordinator**: Edit `modalCoordinator.js`

```javascript
function closeModal() {
  // ... existing checks

  // Add your check
  else if (typeof activeMyEntityId !== 'undefined' && activeMyEntityId !== null) {
    closeMyModal();
  }

  // ... fallback
}
```

3. **Add to HTML**: Edit `index.html`

```html
<!-- Add with other modals -->
<script src="js/modals/myModal.js"></script>
```

## Module Dependencies

### Dependency Graph

```
Layer 1 (Core - No dependencies)
  core/constants.js
  core/state.js

Layer 2 (Utilities - Depends on core)
  utils.js
  ui/theme.js

Layer 3 (Models - Depends on state)
  models/characterModel.js

Layer 4 (Storage - Depends on state, utils)
  core/storage.js

Layer 5 (Views - Depends on state, models, utils)
  views/castView.js
  views/minigameView.js
  views/minigames/*.js
  views/truthBulletsView.js
  views/viewManager.js

Layer 6 (Modals - Depends on state, storage, views)
  modals/modalCoordinator.js
  modals/characterModal.js
  modals/truthBulletModal.js
  modals/scriptLineModal.js

Layer 7 (Settings - Depends on utils)
  settings.js

Layer 8 (App - Depends on everything)
  app.js
```

### Load Order in index.html

```html
<!-- Layer 1: Core -->
<script src="js/core/constants.js"></script>
<script src="js/core/state.js"></script>

<!-- Layer 2: Utilities -->
<script src="js/utils.js"></script>
<script src="js/ui/theme.js"></script>

<!-- Layer 3: Models -->
<script src="js/models/characterModel.js"></script>

<!-- Layer 4: Storage -->
<script src="js/core/storage.js"></script>

<!-- Layer 5: Views -->
<script src="js/views/castView.js"></script>

<!-- Minigame editor modules (before minigameView.js) -->
<script src="js/views/minigames/nonstopDebateEditor.js"></script>
<script src="js/views/minigames/logicDiveEditor.js"></script>
<script src="js/views/minigames/debateScrumEditor.js"></script>
<script src="js/views/minigames/massPanicDebateEditor.js"></script>
<script src="js/views/minigames/hangmansGambitEditor.js"></script>

<script src="js/views/minigameView.js"></script>
<script src="js/views/truthBulletsView.js"></script>
<script src="js/views/viewManager.js"></script>

<!-- Layer 6: Settings -->
<script src="js/settings.js"></script>

<!-- Layer 7: Modals -->
<script src="js/modals/modalCoordinator.js"></script>
<script src="js/modals/characterModal.js"></script>
<script src="js/modals/truthBulletModal.js"></script>
<script src="js/modals/scriptLineModal.js"></script>

<!-- Layer 8: App -->
<script src="js/app.js"></script>
```

## File System Structure

### Trial Directory Layout

When a user selects a workspace folder, the following structure is created:

```
[Workspace Folder]/
├── trial.json                          # Trial metadata + references
├── Characters/                         # Character data
│   ├── John_Doe/
│   │   ├── character.json              # Character profile
│   │   ├── sprite_01.png
│   │   ├── sprite_02.png
│   │   └── ... (up to sprite_25.png)
│   └── [Other characters...]
│
├── Audio/                              # Voice acting audio
│   ├── line_1733585420123.mp3          # Script line audio
│   ├── line_1733585430456.wav
│   └── Minigames/                      # Minigame audio
│       ├── game_1733585440123/         # Per-minigame directory
│       │   ├── dialogue_line_1.mp3     # Nonstop Debate lines
│       │   ├── dialogue_line_2.mp3
│       │   ├── scrum_arg1_opposition.mp3  # Debate Scrum audio
│       │   └── scrum_arg1_defense.mp3
│       └── [Other minigames...]
│
└── TruthBullets/                       # Truth bullet images
    ├── bullet_1733585450123.png
    ├── bullet_1733585460456.jpg
    └── ...
```

### File Naming Conventions

**Characters**: `[Name]_[Surname]/` (spaces replaced with underscores)
**Character JSON**: `character.json`
**Sprites**: `sprite_01.png`, `sprite_02.png`, ... `sprite_25.png` (zero-padded)
**Trial Metadata**: `trial.json`
**Script Audio**: `line_[timestamp].{ext}`
**Minigame Audio**: `dialogue_[lineId].{ext}` or `scrum_[argId]_[side].{ext}`
**Truth Bullet Images**: `[bulletId].{ext}`

## Error Handling

### Modal Error States
Each modal has its own error state variables to prevent cross-contamination:

- **characterModal.js**: Uses `modalErr` and `modalMsg` (local to character modal)
- **truthBulletModal.js**: Uses `bulletModalErr` and `bulletModalMsg` (shared via modalCoordinator)
- **scriptLineModal.js**: Uses `scriptLineModalErr` and `scriptLineModalMsg` (local)

### File I/O Error Handling
All file operations are wrapped in try-catch blocks:

```javascript
try {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
} catch (error) {
  console.error("File write failed:", error);
  alert(`Failed to save: ${error.message}`);
}
```

### Validation
- Character names: Required, non-empty
- Sprites: All slots must be filled before saving
- Audio files: Type validation (audio/* MIME types)
- Images: Type validation (image/* MIME types)

## CLI Tool Architecture

The CLI tool is designed to replicate the web UI's character creation functionality for batch operations.

### Design Principles

1. **Web UI Compatibility**: Uses identical ID generation and file structure
2. **Modularity**: Clean separation between validation, sprite processing, and file I/O
3. **Error Resilience**: Continues batch processing on errors, logs all issues
4. **Minimal Dependencies**: Only 4 npm packages (commander, csv-parse, chalk)

### Module Breakdown

**create-character.js** (Main Entry Point)
- CLI argument parsing using `commander`
- Batch file loading (JSON/CSV auto-detection)
- Character creation orchestration
- Error logging and summary reporting

**lib/character-generator.js** (ID Generation)
- **Ported directly from web UI** (`characterModal.js:23-31`)
- `generateCharacterId(name, surname, dob)` - Identical algorithm
- `sanitizeDirectoryName(name, surname)` - Same regex as web UI
- `isHeadmaster(position)` - Position 16 logic

**lib/validator.js** (Validation)
- Validates required fields (name, surname, dob, weight, chest, etc.)
- Auto-fills defaults (blood: "A", heightM: 1.75, heightCM: 0)
- Type coercion (strings to numbers for height/weight/chest)
- Date format validation (YYYY-MM-DD)

**lib/sprite-processor.js** (Sprite Handling)
- `findSprites(folderName, spriteRoot)` - Discovers PNG files
- Alphabetical sorting, takes first 25
- `copySprites(sourcePaths, destDir)` - Copies with standardized naming
- Error handling for missing folders or insufficient sprites

**lib/trial-updater.js** (trial.json Management)
- `loadTrialData(trialDir)` - Loads or creates trial.json
- `updateCharacter(trial, position, characterId)` - Updates character array
- Position conflict detection
- Metadata recalculation (totalCharacters count)
- `saveTrialData(trialDir, trial)` - Writes trial.json

**lib/logger.js** (Console Output)
- Colored output using `chalk` (green ✓, red ✗, yellow ⚠, cyan ℹ)
- Success, error, warning, info message functions
- Consistent formatting across CLI

### Data Flow

**Batch Character Creation**:
1. User runs: `node create-character.js --batch characters.json --dest "C:\Path"`
2. `create-character.js` parses arguments, loads batch file
3. For each character:
   - `validator.js` validates and normalizes data
   - `character-generator.js` generates unique ID
   - Creates `Characters/[Name]_[Surname]/` directory
   - `sprite-processor.js` finds and copies 25 sprites
   - Writes `character.json` with exact web UI schema
   - `trial-updater.js` updates trial.json with character ID
4. Logs summary (X created, Y skipped)

### Web UI Parity

The CLI maintains 100% compatibility:

| Feature | Web UI | CLI | Match |
|---------|--------|-----|-------|
| ID Generation | `generateCharacterId()` | Same function | ✓ |
| Directory Naming | `[Name]_[Surname]` sanitized | Same regex | ✓ |
| Sprite Naming | `sprite_01.png` - `sprite_25.png` | Same format | ✓ |
| character.json Schema | Lines 283-299 | Identical structure | ✓ |
| trial.json Update | ID-only array | Same structure | ✓ |

### Batch File Support

**JSON Format**:
- Structured data with nested configuration
- Supports comments (via spriteSourceRoot field)
- Best for complex character data

**CSV Format**:
- Spreadsheet-friendly (Excel, Google Sheets)
- Easier for non-technical users
- Auto-parsed using `csv-parse`

### Error Handling Philosophy

**Non-Fatal Errors (continue batch)**:
- Missing sprite folder
- Insufficient sprites
- Duplicate position
- Invalid field values

**Fatal Errors (stop execution)**:
- Destination directory doesn't exist
- trial.json corrupted (invalid JSON)

This ensures batch operations complete as much as possible, with clear logging of what succeeded and what failed.

## Performance Considerations

### Lazy Sprite Loading (Web UI)

**Problem**: Loading 17 characters × 25 sprites = 425 images consumed ~700MB RAM

**Solution**:
- Load only first sprite per character on initial trial load
- Store folder handle reference in character object
- Lazy load remaining 24 sprites when opening character modal
- Uses async/await with loader overlay for UX

**Implementation**:
```javascript
// storage.js - Initial load
charData.sprites = [];
charData.sprites[0] = { dataURL: b64, fname: file.name, blob: file };
charData._folderHandle = folderHandle;  // Store for later

// characterModal.js - On modal open
async function openCharModal(idx) {
  // ... setup
  if (c.id && c._folderHandle) {
    showLoader(true);
    await loadRemainingSprites(idx);  // Load sprites 2-25
    showLoader(false);
  }
  renderCharacterModal();
}
```

**Impact**:
- Initial load: 17 sprites (~50-70MB) vs 425 sprites (~700MB)
- **~90% memory reduction**
- Faster initial load time
- Sprites load in <1s when opening character modal

### Module Loading
- Scripts loaded synchronously in dependency order
- No bundler required - modern browsers handle multiple small files efficiently
- Total JavaScript: ~12 files in core system + 5 minigame editors + 3 modals = ~20 files
- Total size: Smaller individual files allow better browser caching

### Re-rendering Strategy
- Full re-renders on state changes (simple, predictable)
- No virtual DOM or diffing (vanilla JS)
- Adequate performance for editor use case (not real-time game)

### File System Access
- Asynchronous file operations (async/await)
- Auto-save debouncing (if needed, add later)
- Lazy loading of audio/images (loaded on demand when modal opens)

### State Management
- Global state (simple, no framework overhead)
- Direct property access (fast)
- No reactivity system (explicit re-renders)

## Testing Strategy

### Manual Testing Checklist
Each module can be tested in isolation:

**Character Modal**:
- Create student
- Create headmaster
- Edit existing character
- Upload sprites individually
- Bulk import sprites
- Validation errors

**Minigame Editors**:
- Add/delete entities (lines, questions, arguments)
- Reorder entities (drag-drop if applicable)
- Upload audio files
- Select truth bullets
- Configure settings

**Truth Bullets**:
- Add bullet
- Edit bullet (name, description, image)
- Delete bullet
- Image upload

**File Persistence**:
- Save trial
- Close and reopen
- Verify all data loads correctly
- Check file system structure

### Future: Automated Testing
- Unit tests for data validation functions
- Integration tests for file I/O
- E2E tests for user workflows

## Migration Notes

### From Monolithic to Modular

**Original Structure**:
- `modal.js`: 1747 lines (character + truth bullet + script line modals)
- `minigameView.js`: 2397 lines (all 5 minigame types)

**New Structure**:
- **Modal Modules**: 4 files (30 + 400 + 235 + 1175 = 1840 lines total)
- **Minigame Modules**: 6 files (245 + 440 + 380 + 520 + 480 + 35 = 2100 lines total)

**Changes**:
- Function names unchanged (e.g., `renderNonstopDebateEditor()` in same scope)
- State variables unchanged (global scope)
- HTML structure unchanged (same IDs, classes)
- Onclick handlers unchanged (function names in global scope)

**Backup Files**:
- `minigameView-old.js`: Original monolithic minigame file
- `modal-old.js`: Original monolithic modal file

These can be deleted once modular approach is verified stable.

## Conclusion

This modular architecture provides:
- **Scalability**: Easy to add new features
- **Maintainability**: Small, focused files
- **Clarity**: Clear separation of concerns
- **Flexibility**: Can modify one module without affecting others
- **Collaboration**: Multiple developers can work simultaneously

The coordinator pattern balances simplicity with modularity, avoiding over-engineering while achieving excellent code organization.
