# Changelog

All notable changes to the Freestyle Danganronpa Trial Creator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Major Refactoring: Modular Architecture (2025-12-19)

#### Added
- **Modular Architecture**: Reorganized ~4000 lines of code into 12 focused modules
  - Created `js/core/` directory for system files (constants, state, storage)
  - Created `js/models/` directory for data models
  - Created `js/views/minigames/` directory with 5 specialized minigame editors
  - Created `js/modals/` directory with 3 modal types + coordinator
  - Created `js/ui/` directory for theme management
- **ARCHITECTURE.md**: Comprehensive architecture documentation
  - Module organization and responsibilities
  - Coordinator pattern explanation
  - Guide for adding new features
  - Dependency graph and load order
  - File system structure documentation
- **Backup Files**: Preserved original monolithic files
  - `minigameView-old.js` (2397 lines original)
  - `modal-old.js` (1747 lines original)

#### Changed
- **Minigame System**: Refactored from 2397-line monolith to modular system
  - `minigameView.js`: Reduced to 245-line coordinator (90% reduction)
  - `nonstopDebateEditor.js`: 440 lines (Nonstop Debate editor)
  - `logicDiveEditor.js`: 380 lines (Logic Dive editor)
  - `debateScrumEditor.js`: 520 lines (Debate Scrum editor)
  - `massPanicDebateEditor.js`: 480 lines (Mass Panic Debate editor)
  - `hangmansGambitEditor.js`: 35 lines (Hangman's Gambit editor)
- **Modal System**: Split 1747-line modal.js into 4 focused modules
  - `modalCoordinator.js`: 30 lines (shared utilities, generic close dispatcher)
  - `characterModal.js`: 400 lines (character editing)
  - `truthBulletModal.js`: 235 lines (truth bullet editing)
  - `scriptLineModal.js`: 1175 lines (script line properties)
- **HTML Script Loading**: Updated index.html to load all modules in dependency order
- **README.md**: Updated to reflect new modular structure
  - New project structure section showing all modules
  - Detailed module responsibilities
  - Modular architecture benefits section

#### Benefits
- **Maintainability**: Each module focuses on single responsibility, bugs easier to locate
- **Scalability**: Adding new minigame types requires only creating new editor file
- **Readability**: Files now 35-520 lines instead of 2397 lines
- **Collaboration**: Multiple developers can work without merge conflicts
- **Testing**: Isolated modules easier to test individually
- **Performance**: Smaller files parse faster in browsers

---

## [3.1.0] - Mass Panic Debate Enhancements (2025-12-19)

### Added
- **Mass Panic Debate: Full Line Customization**
  - Sprite selection per speaker line
  - Character selection per speaker line
  - Audio upload per speaker line with preview
  - Voice line file I/O to `Audio/Minigames/{gameId}/`
  - Loud assertion toggle (one per line group)
- **Mass Panic Debate: CSS Styles**
  - `.mass-panic-line-group` styling
  - `.speaker-column` styling for 3-column layout
  - `.audio-preview-small` component styling
  - Fixed audio player width issues

### Changed
- **Mass Panic Debate: Restructured Data Model**
  - Changed from separate arrays to unified `lineGroups` structure
  - Each line group contains `speaker1`, `speaker2`, `speaker3` objects
  - Enforces equal number of lines across all 3 speakers
  - Synchronizes line group deletion and addition
- **Mass Panic Debate: Simplified Answer Selection**
  - Removed "Weak Point Shootable" checkbox
  - Added "Correct Answer Bullet" dropdown per line
  - Enforces only ONE correct answer per entire minigame
  - Clearing answer selection on other lines when setting new answer

### Fixed
- **Mass Panic Debate: Layout Issues**
  - Fixed audio preview width overflow
  - Fixed 3-column layout with proper spacing
  - Improved line group card styling

---

## [3.0.0] - Minigame System & Truth Bullets (2025-12-18)

### Added
- **Minigame Management System**
  - Minigame Details view in navigation
  - Support for 5 minigame types:
    - Nonstop Debate
    - Logic Dive
    - Debate Scrum
    - Mass Panic Debate
    - Hangman's Gambit
  - Add/delete/reorder minigames
  - Minigame name and order configuration

- **Nonstop Debate Editor**
  - Truth bullet selection for debates
  - Dialogue line management (add/delete/reorder)
  - Character selection per dialogue line
  - Sprite selection per dialogue line
  - Audio upload per dialogue line
  - Audio playback with seek bar and time display
  - Voice line file I/O to `Audio/Minigames/{gameId}/dialogue_{lineId}.{ext}`

- **Logic Dive Editor**
  - Multiple choice question management
  - Add/delete questions with drag-drop reordering
  - Answer configuration (3-4 answers per question)
  - Correct answer selection
  - Question text editing

- **Debate Scrum Editor**
  - Argument management (add/delete/reorder)
  - Opposition vs. Defense side-by-side layout
  - Statement configuration for both sides
  - Character selection for both sides
  - Audio upload for both sides
  - Keywords management (array-based, one per line)
  - Audio file I/O: `Audio/Minigames/{gameId}/scrum_{argId}_{side}.{ext}`

- **Hangman's Gambit Editor**
  - Simple answer key configuration

- **Truth Bullets System**
  - Truth Bullets view in navigation
  - Add/edit/delete truth bullets
  - Truth bullet modal with:
    - Name field
    - Description textarea
    - Inversed lie bullet name field
    - Image upload with preview
  - Image file I/O to `TruthBullets/{bulletId}.{ext}`
  - Truth bullet selection in Nonstop Debate and Mass Panic Debate

- **CSS Styles for Minigames**
  - Logic Dive card styles (question cards, answers, drag handles)
  - Debate Scrum styles (argument cards, opposition/defense sides)
  - Mass Panic Debate styles (line groups, speaker columns)
  - Audio preview components (mini and full-sized)

### Changed
- **Navigation**: Added "Truth Bullets" and "Minigame Details" nav items
- **trial.json Schema**: Extended to include `minigames` and `truthBullets` arrays
- **storage.js**: Enhanced to load/save minigame and truth bullet data

---

## [2.0.0] - Script Editor & Advanced Line Properties (2025-12-10)

### Added
- **Script Editor View**
  - Visual script line editor with three line types:
    - Speaking: Character selection + dialogue input
    - Narrator: Pure narration text
    - Minigame Start: Minigame type selection
  - Add/delete script lines
  - Script line reordering:
    - Arrow buttons (▲▼) for precise single-step movement
    - Drag-and-drop with gap-based insertion
    - Multi-select support (Ctrl+Click) for batch operations
  - Visual feedback:
    - Pulsing blue highlight lines for drop targets
    - Ghost preview ("1 line" or "X lines")
    - Smooth CSS animations (300ms transitions)
  - Auto-save to trial.json

- **Script Line Advanced Properties Modal**
  - Five-tab modal for speaking lines:
    1. **Sprite Tab**: Visual grid of character sprites with selection
    2. **Audio Tab**:
       - Voice acting audio upload (MP3, WAV, OGG)
       - HTML5 audio player with play/pause
       - Seek bar with current/total time display
       - Audio files stored in `Audio/line_{id}.{ext}`
    3. **Highlighting Tab**:
       - Drag-to-select interface for text ranges
       - Multiple highlight ranges supported
       - 3 preset colors + custom color picker
       - Live preview of highlights
    4. **Camera Tab**:
       - 17 camera motion types (pan, zoom, rotate, tilt, dolly, truck, pedestal)
       - Duration configuration (0.1-10 seconds)
       - Easing functions (linear, ease-in, ease-out, ease-in-out)
    5. **Effects Tab**:
       - 11 special effect types (shake, flash, fades, blur, filters, etc.)
       - Intensity sliders for applicable effects
       - Multiple simultaneous effects support

### Changed
- **trial.json Schema**: Added `script` object with `lines` array
- **Script Line Schema**: Extended with optional advanced properties:
  - `spriteIndex`: Character sprite to display
  - `audioFile`: Voice acting filename
  - `highlights`: Array of text highlight ranges
  - `cameraMotion`: Camera animation configuration
  - `specialEffects`: Screen effects configuration

### Fixed
- **Layout**: Optimized scrolling with proper overflow handling
  - Body has `overflow: hidden` to prevent whole-page scrolling
  - `#mainGrid` is scrollable container with `overflow-y: auto`
  - Fixed header/sidebar positions maintained

---

## [1.0.0] - Character Cast Manager (2025-12-07)

### Added
- **Character Management System**
  - 17 character slots (16 students + 1 headmaster)
  - Character creation modal with two tabs:
    - Details: Profile information (name, surname, height, weight, etc.)
    - Sprites: Upload interface (individual/bulk)
  - Visual distinction between student (blue gradient) and headmaster (orange gradient)
  - Character ID generation (human-readable format: `JD_19920315_A1B2C3`)

- **Sprite Management**
  - Individual sprite upload with preview
  - Bulk import for all character sprites at once
  - Configurable sprite count (1-100, default: 25)
  - Automatic PNG conversion
  - Standardized naming: `sprite_01.png`, `sprite_02.png`, etc.

- **Workspace Management**
  - File System Access API integration
  - Local directory selection (Choose Folder button)
  - Automatic directory structure creation:
    - `trial.json` (trial metadata)
    - `Characters/{name}/character.json` (character profiles)
    - `Characters/{name}/sprite_*.png` (character sprites)
  - Auto-save functionality

- **User Interface**
  - Responsive grid layout for cast display
  - Dark/Light theme toggle with localStorage persistence
  - Settings modal for configuration
  - Loading states for async operations
  - Custom scrollbar styling
  - Modal-based character editing
  - Real-time validation and error messaging

- **trial.json Schema**
  - `trialName`: User-defined trial name
  - `characters`: Array of 17 character IDs (or null)
  - `metadata`: Version, lastModified, counts

- **character.json Schema**
  - Personal info: name, surname, dob, blood type
  - Physical: heightM, heightCM, weight, chest
  - Personality: likes, dislikes, notes
  - System: id, isHeadmaster, position, lastModified

### Technical Stack
- HTML5 + CSS3 (custom properties for theming)
- Vanilla JavaScript (ES5+, no frameworks)
- File System Access API for local storage
- Google Fonts (Inter family)

---

## [0.1.0] - Initial Project Setup (2025-12-01)

### Added
- **Godot 4.4 Project Structure**
  - 3D models for trial room (Bench, Floor, Headmaster Podium, Walls)
  - Blender source files (.blend)
  - Texture assets (Bench, Floor, Podium, Wall textures)
  - Scene files (HighlightShader.gdshader, trial_env.tscn)
  - project.godot configuration

- **Repository Setup**
  - Git LFS configuration for large assets
  - .gitignore rules
  - README.md with project overview

### Note
- Game engine development postponed until authoring tools are complete
- Focus shifted to web-based Cast Manager

---

## Version History Summary

- **v0.1.0**: Initial project structure (Godot setup)
- **v1.0.0**: Character Cast Manager (core functionality)
- **v2.0.0**: Script Editor + Advanced Line Properties
- **v3.0.0**: Minigame System + Truth Bullets
- **v3.1.0**: Mass Panic Debate Enhancements
- **Current**: Modular Architecture Refactoring

---

## Future Roadmap

### Phase 1: Web UI Polish
- [ ] Character deletion functionality
- [ ] Character reordering/swapping
- [ ] Export/Import trial packages
- [ ] Undo/Redo system
- [ ] Keyboard shortcuts

### Phase 2: Script Writer Completion
- [ ] Evidence management
- [ ] Scene sequence editor
- [ ] Music and sound effect assignment
- [ ] Background selection
- [ ] Script search and filter

### Phase 3: Trial Engine (Godot)
- [ ] 3D trial room environment
- [ ] Character positioning and animations
- [ ] Dialogue system with typewriter effect
- [ ] Evidence presentation mechanics
- [ ] Truth bullet shooting gameplay
- [ ] Contradiction detection
- [ ] Trial progression logic
- [ ] Save/Load system

### Phase 4: Integration
- [ ] Web UI to Godot data pipeline
- [ ] Trial package import in engine
- [ ] Playtest mode
- [ ] Export standalone executables

---

## Contributors

- Sauraav (Primary Developer)

---

## License

This project is open source. License details to be determined.

---

**Note**: This project is a fan creation and is not affiliated with or endorsed by Spike Chunsoft Co., Ltd.
