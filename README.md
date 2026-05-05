# Freestyle Danganronpa Trial Creator

A comprehensive tool for creating custom Danganronpa-style trials, featuring both a browser-based authoring interface and a fully-implemented Godot 4.5 game engine. Design your cast, write scripts, and play interactive trials with minigame mechanics.

## Project Status

| Component | Status | Details |
|-----------|--------|---------|
| **Web UI (Authoring)** | 🟢 Stable | Character management, script writing, minigame configuration, asset management |
| **Trial Engine (Godot)** | 🟡 Proof-of-Concept | 6 minigame POCs (no animations), basic dialogue/camera/effects, many parameters not yet interpreted from scripter |
| **Integration** | 🔴 WIP | Trial loading works, but parameter interpretation and full feature support missing |

---

## Key Features

### Web-Based Authoring Interface

#### Cast & Character Management
- Create 16 students + 1 headmaster with detailed profiles
- Character profiles: name, date of birth, blood type, physical attributes, personality
- Sprite system: upload 1-100 character expressions (default 25)
- Type-specific editing (students vs. headmaster)
- Automatic character ID generation for tracking

#### Script Writing
- Three line types: **Speaking** (character dialogue), **Narrator** (narration text), **Minigame** (trigger minigame)
- Visual drag-and-drop editor with gap-based insertion
- Arrow buttons for precise single-step reordering
- Multi-select support for batch operations
- Real-time auto-save to trial.json

#### Advanced Line Properties (Speaking Only)
- 🎭 **Sprite Selection**: Choose character expression per line
- 🔊 **Voice Acting**: Upload and preview audio files (MP3, WAV, OGG)
- 🖍️ **Text Highlighting**: Drag-to-select highlighting with custom colors
- 📹 **Camera Motion**: 17 motion types (pan, zoom, rotate, dolly, truck, pedestal, tilt)
- ✨ **Screen Effects**: 11 effect types (shake, flash, fade, blur, distortion, sepia, grayscale, invert, vignette, scanlines)

#### Additional Features
- Dark/Light theme with persistent settings
- Truth bullets management (evidence system)
- Minigame configuration editors for each minigame type
- Responsive grid layout optimized for all screen sizes
- Settings configuration (max sprites per character, etc.)

### Game Engine (Godot 4.5) — Work in Progress

**Status**: POC implementations for core systems. Many parameters from the web UI scripter are not yet interpreted by the engine. Minigames are functional but lack animations and polish.

#### Minigames (POC Status)

1. **Nonstop Debate** — Rapid-fire statements with truth bullet shooting (basic hit detection, no character animations)
2. **Debate Scrum** — Turn-based arguments with timer system (POC, minimal UI)
3. **Logic Dive** — Multiple-choice questions (basic implementation)
4. **Hangman's Gambit** — Letter puzzle mechanic (working state)
5. **Mass Panic Debate** — Three-speaker line groups (structural WIP)
6. **Rebuttal Showdown** — Stub implementation

#### Partially Implemented Systems

**Dialogue & Script Playback**
- Basic script-based progression through dialogue lines
- Character selection and sprite display (static, no animations)
- Audio playback (not always synchronized with script timing)
- Many advanced properties (highlighting, effects, camera motion) not yet interpreted

**Camera System**
- 17 motion types defined in code
- Basic motion types working (pan, zoom)
- Missing: smooth animations, easing implementation, proper duration handling
- Free-look bench camera functional

**Audio Management**
- Voice file playback for dialogue
- Basic audio management
- Missing: Background music, proper file path resolution

**Game Mechanics**
- Influence gauge (tracks damage)
- Concentrate gauge (Nonstop Debate)
- Slow-time mode (partial implementation)
- Truth bullet manager (structure in place, not fully integrated)

**Screen Effects**
- Framework in place for shake, flash, fade effects
- Missing: Animations, proper timing, effect composition

**Input Management**
- Keyboard and mouse controls working
- Free-look camera with mouse rotation
- Action bindings partially implemented

#### Known Issues & WIP Items

- Camera motion duration and easing not properly applied
- Text highlighting from scripter not rendered
- Special effects parameters not interpreted
- Character animations missing (static sprites only)
- Typewriter effect not implemented
- Many dialogue parameters ignored
- Some signal connection issues under restart conditions
- Trial loading path configuration problematic

#### Technical Stack
- ~5000 lines of GDScript
- Godot 4.5 engine
- Modular manager singletons (ScriptDirector, AudioManager, InputManager, etc.)
- Signal-driven event system
- Trial data loader from directory structure

---

## Getting Started

### Web UI (Authoring Trials)

#### Prerequisites
- Modern Chromium-based browser (Chrome, Edge, Opera)
- File System Access API support

#### Installation & Usage

1. **Open the authoring tool**:
   ```bash
   # Navigate to web-ui-editor folder and open index.html in a browser
   cd web-ui-editor
   # Open index.html in Chrome/Edge/Opera
   ```

2. **Create a trial workspace**:
   - Click "📁 Choose Folder"
   - Select or create a directory for your trial
   - Enter a trial name

3. **Build your cast**:
   - Click empty student/headmaster blocks
   - Fill in character details and upload sprites
   - Save characters to create directories

4. **Write your script**:
   - Switch to "📝 Script" view
   - Add dialogue, narrator, and minigame lines
   - Use drag-and-drop or arrow buttons to reorder
   - Click edit (✏️) to configure advanced properties
   - Add camera motions, effects, audio, highlighting

5. **Configure minigames**:
   - Switch to "🎮 Minigames" view
   - Set up Nonstop Debate, Debate Scrum, Logic Dive, etc.
   - Configure difficulty, audio, and answers

6. **Manage evidence**:
   - Switch to "💎 Truth Bullets" view
   - Add evidence items with images and descriptions

### Game Engine (Playing Trials) — Early POC

⚠️ **Warning**: The engine is in early POC stage. Many features are non-functional or incomplete. Expect bugs and missing functionality.

#### Running a Trial in Godot

1. **Prepare a trial**:
   - Create a trial using the web UI (character, script, minigames)
   - Or manually create a trial directory with the correct structure

2. **Load the Godot project**:
   ```bash
   cd freestyle-dangan-trial
   # Open in Godot 4.5 or later
   # Press F5 to run
   ```

3. **Load a trial**:
   - Click "Choose Trial Folder" button
   - Select your trial directory
   - Click "Load Trial"

4. **Play** (limited functionality):
   - Navigate bench with arrow keys (basic free-look works)
   - Dialogue progresses through script lines
   - Minigames trigger but lack polish and animations
   - **Not working**: Camera motions, most text effects, highlighting, proper audio sync

#### Current Limitations
- Script parameters (camera motion, effects, highlighting) mostly ignored
- No character animations
- Minigames are functional but lack visual polish
- Some trial loading issues with absolute paths

---

## Command-Line Tools

### Batch Character Creation (CLI)

For rapid character setup, use the Node.js CLI tool to batch-create characters:

```bash
cd cli
npm install
node create-character.js --batch characters.json --dest "C:\Path\To\Trial"
```

Supports JSON and CSV batch files with automatic sprite discovery.

---

## Project Structure

```
freestyle-dangan-trial/
├── web-ui-editor/                  # Browser-based authoring tool
│   ├── index.html                  # Main entry point
│   ├── css/styles.css              # Complete styling system with theming
│   └── js/
│       ├── core/                   # State management, storage, constants
│       ├── models/                 # Data structures (character, etc.)
│       ├── views/                  # UI rendering and controllers
│       ├── modals/                 # Dialog components
│       ├── ui/                     # Theme management
│       └── app.js, settings.js, utils.js
│
├── cli/                            # Node.js batch character creation
│   ├── create-character.js         # CLI entry point
│   ├── lib/                        # Character generator, validators, sprite processor
│   └── examples/                   # Sample batch files (JSON, CSV)
│
├── freestyle-dangan-trial/         # Godot 4.5 game engine
│   ├── scripts/
│   │   ├── core/                   # System managers (ScriptDirector, AudioManager, InputManager, etc.)
│   │   ├── minigames/              # Minigame implementations (6 types)
│   │   ├── Camera/                 # Camera systems and controllers
│   │   ├── ui/                     # UI components (gauges, crosshair, etc.)
│   │   └── [other scripts]
│   ├── scenes/                     # Godot scene files (.tscn)
│   ├── models/                     # 3D model assets (.blend)
│   ├── textures/                   # Texture and material files
│   ├── shaders/                    # Godot shader files (.gdshader)
│   ├── project.godot               # Godot project configuration
│   └── .godot/                     # Godot cache (ignored)
│
├── .gitignore
├── .gitattributes
└── README.md
```

---

## Data Structure

### Trial File Format (.drtrial)

Trials are stored as directories with the following structure:

```
trial-folder/
├── trial.json                      # Trial metadata and script
├── Characters/
│   ├── CharacterName/
│   │   ├── character.json          # Profile data
│   │   ├── sprite_01.png           # Character expressions
│   │   └── ...
│   └── ...
├── Audio/                          # Voice acting files
│   ├── line_1733585420123.mp3
│   └── ...
└── TruthBullets/                   # Evidence items
    ├── bullet_ID/
    │   ├── bullet.json             # Evidence metadata
    │   └── image.png               # Evidence image
    └── ...
```

### trial.json Schema

```json
{
  "trialName": "Investigation Room Case 1",
  "characters": ["JD_19920315_A1B2C3", "JS_19930822_D4E5F6", ...],
  "script": {
    "lines": [
      {
        "id": "line_1733585420123",
        "type": "speaking",
        "characterId": "JD_19920315_A1B2C3",
        "dialogue": "Something doesn't add up here...",
        "spriteIndex": 2,
        "audioFile": "line_1733585420123.mp3",
        "cameraMotion": {"type": "zoom_in", "duration": 1.5},
        "specialEffects": {"effects": [{"type": "shake", "intensity": 0.5}]}
      },
      {
        "id": "line_1733585430456",
        "type": "minigame",
        "minigameId": "truth_bullets"
      }
    ]
  },
  "minigames": {...},
  "truthBullets": {...}
}
```

---

## Technology Stack

### Web Interface
- **HTML5**: Semantic structure, File System Access API
- **CSS3**: Custom properties, Grid/Flexbox, responsive design
- **JavaScript**: Modular ES6+, no framework dependencies
- **APIs**: LocalStorage, FileReader, Canvas

### Game Engine
- **Godot 4.5**: Open-source game engine
- **GDScript**: Native Godot scripting language
- **GLSL**: Shaders for visual effects
- **3D Assets**: Blender models

### CLI Tool
- **Node.js 18+**: Runtime
- **JavaScript**: Batch processing

---

## Development Roadmap

### Web UI (Stable) ✅
- [x] Character management (create, edit, delete)
- [x] Script writing (dialogue, narrator, minigame lines)
- [x] Sprite management with lazy loading
- [x] Advanced line properties (highlighting, camera, effects)
- [x] Minigame configuration editors
- [x] Truth bullets management
- [x] Dark/Light theme
- [x] Auto-save to JSON
- [x] CLI batch character tool

### Game Engine — Priority Order

**High Priority** (Core gameplay)
- [ ] Interpret camera motion parameters (duration, easing, type)
- [ ] Implement character animations (walk, idle, react)
- [ ] Render text highlighting from scripter
- [ ] Apply screen effects from script data
- [ ] Proper audio synchronization with dialogue timing
- [ ] Typewriter/text reveal effect

**Medium Priority** (Polish)
- [ ] Minigame animations (panel movement, bullet effects, transitions)
- [ ] Scene transitions and fades
- [ ] Background image support
- [ ] Music and ambient audio
- [ ] Visual feedback for player actions

**Lower Priority** (Extended features)
- [ ] Cross-examination system
- [ ] Evidence presentation mechanics
- [ ] Alternative trial paths/branching
- [ ] Particle effects
- [ ] Mobile optimization

### Known Blockers
- Many scripter parameters not yet passed to engine
- No animation system for characters
- Camera motion system framework incomplete
- Effect timing and composition not working

---

## Browser Compatibility

**Fully Supported** (File System Access API):
- Chrome 86+
- Edge 86+
- Opera 72+

**Not Supported**:
- Firefox (no File System Access API)
- Safari (no File System Access API)

---

## Controls (Game Engine)

### Bench Navigation
- **Arrow Keys**: Move camera around bench
- **Mouse Drag**: Free-look camera rotation (left-click + drag)
- **Scroll**: Zoom in/out

### Minigames
- **Left Mouse**: Shoot truth bullet / Select answer
- **Space**: Trigger minigame action (context-dependent)
- **Escape**: Pause/Resume

### Free Camera
- **Mouse Left-Click + Drag**: Rotate camera
- **Mouse Scroll**: Adjust distance

---

## Development

### Running Locally

**Web UI**:
```bash
cd web-ui-editor
# Open index.html in Chrome/Edge/Opera
# Or use VS Code Live Server extension
```

**Game Engine**:
```bash
cd freestyle-dangan-trial
# Open with Godot 4.5+
# Press F5 to run
```

### Code Style
- GDScript: 4-space indentation, snake_case for functions/variables
- JavaScript: 2-space indentation, camelCase for functions/variables
- Comments for complex logic only

### Key Files to Know

**Web UI**:
- `web-ui-editor/js/core/storage.js` — File I/O and persistence
- `web-ui-editor/js/views/minigameView.js` — Minigame coordinator
- `web-ui-editor/js/modals/scriptLineModal.js` — Advanced properties editor

**Game Engine**:
- `freestyle-dangan-trial/scripts/core/ScriptDirector.gd` — Script playback & progression
- `freestyle-dangan-trial/scripts/minigames/NonstopDebate.gd` — Nonstop debate implementation
- `freestyle-dangan-trial/scripts/Camera/CameraDirector.gd` — Camera motion system

---

## Known Limitations

- Web UI only works in Chromium browsers (File System Access API limitation)
- Trial file picker in Godot requires manual folder selection
- Multi-language text support is limited to English
- No built-in audio editing (use external tools)

---

## Contributing

Contributions welcome! Areas of interest:
- Bug reports and fixes
- UI/UX improvements
- Additional minigame types
- Documentation and tutorials
- Testing on different systems

---

## License

Open source. License details to be finalized.

---

## Acknowledgments

- Inspired by Danganronpa series by Spike Chunsoft
- Built with Godot Engine and web standards
- 3D assets created in Blender

---

## Contact

For questions or collaboration: Open an issue on GitHub.

**Note**: This is a fan creation, not affiliated with Spike Chunsoft Co., Ltd.
