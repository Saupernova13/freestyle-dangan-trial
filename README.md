# Freestyle Danganronpa Trial Creator

A comprehensive tool for creating custom Danganronpa-style trials, featuring both a browser-based authoring interface and a fully-implemented Godot 4.5 game engine. Design your cast, write scripts, and play interactive trials with minigame mechanics.

## Project Status

| Component | Status | Details |
|-----------|--------|---------|
| **Web UI (Authoring)** | 🟢 Complete | Character management, script writing, minigame configuration, asset management |
| **Trial Engine (Godot)** | 🟢 Feature-Complete | 6 playable minigames, dialogue system, camera/effects system, influence mechanics |
| **Integration** | 🟡 In Progress | Supports .drtrial file export/import, playable trials |

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

### Game Engine (Godot 4.5)

#### Implemented Minigames

**1. Nonstop Debate**
- Rapid-fire statements from opponents
- Shoot truth bullets to find contradictions
- Three-zone hit detection (weak point, prefix, suffix)
- White noise statements for extra challenge
- Influence and concentrate gauges

**2. Debate Scrum**
- Turn-based argument system
- Per-turn countdown timer
- Defense vs. opposition arguments
- Zone-based hit detection with damage/heal mechanics
- Color-coded timer (green → yellow → red)

**3. Logic Dive**
- Multiple-choice question format
- Scrolling dashed-road visual effect
- Question transitions with fade-ins and staggered animations
- Answer selection feedback

**4. Hangman's Gambit**
- Fill-in-the-blanks letter puzzle
- Auto-revealing spaces in answer key
- Difficulty-based letter movement speed
- Influence gauge depletion on wrong answers

**5. Mass Panic Debate**
- Three synchronized speakers per line group
- Line-group based editing (all 3 speakers' lines together)
- Single correct answer per minigame
- Loud assertion toggle (one per group)
- Full customization (audio, sprites, effects)

**6. Rebuttal Showdown**
- Head-to-head accusation system
- Evidence presentation mechanics
- Cross-examination dialogue

#### Core Systems

**Dialogue & Playback**
- Script-based dialogue system with character sequencing
- Typewriter effect for text display
- Sprite-based character rendering with expression selection
- Audio playback with synchronized dialogue timing

**Camera System**
- 17 distinct camera motion types
- Smooth tweening animations
- Configurable duration (0.1-10 seconds)
- Multiple easing options (linear, ease-in, ease-out, ease-in-out)
- Dynamic motion composition

**Audio Management**
- Voice acting playback during dialogue
- Audio file organization (Audio/Minigames/ per minigame)
- Background music support
- Sound effect system

**Game Mechanics**
- **Influence Gauge**: Shared depletion on wrong answers (per trial)
- **Concentrate Gauge**: Stamina bar for slow-time activation (Nonstop Debate)
- **Slow-Time Mode**: 30% time acceleration with stamina drain
- **Truth Bullets**: Evidence-based accusation system
- **Turn System**: Per-minigame turn tracking and progression

**Screen Effects**
- Real-time visual effects (shake, flash, fade, blur)
- Distortion, color filters (sepia, grayscale, invert)
- Vignette and scanlines (retro effect)
- Multi-effect composition

**Input Management**
- Keyboard and mouse controls
- Touch support for mobile
- Action binding system (debate actions, shoot, pause)
- Camera free-look mode (bench navigation)

#### Technical Architecture
- ~5000 lines of GDScript
- Modular component design with manager singletons
- Scene-based minigame implementation
- Signal-driven event system
- Trial data loader from .drtrial files

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

### Game Engine (Playing Trials)

#### Running a Trial in Godot

1. **Export a trial**:
   - From the web UI, click "Export Trial" to generate a .drtrial file
   - Or manually copy your trial folder structure

2. **Load the Godot project**:
   ```bash
   cd freestyle-dangan-trial
   # Open in Godot 4.5+
   ```

3. **Select a trial to play**:
   - Click "Choose Trial Folder" on startup
   - Select your exported .drtrial file or trial directory
   - Click "Load Trial"

4. **Play the trial**:
   - Navigate the bench with keyboard (arrow keys)
   - Listen to dialogue and progress through script lines
   - Engage with minigames as scripted
   - Use truth bullets to find contradictions

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

## Roadmap

### Complete ✅
- [x] Web UI character management
- [x] Web UI script writing
- [x] Godot trial engine with 6 minigames
- [x] Camera motion system (17 types)
- [x] Screen effects system (11 types)
- [x] Dialogue playback with typewriter effect
- [x] Audio management
- [x] Influence and concentrate gauges
- [x] Truth bullet system
- [x] CLI batch character tool
- [x] Input management and controls
- [x] Free-look bench camera

### In Progress
- [ ] Full integration testing
- [ ] Example trial creation
- [ ] Tutorial documentation

### Future
- [ ] Character deletion/reordering UI
- [ ] Evidence cross-examination system
- [ ] Scene transitions
- [ ] Particle effects
- [ ] Mobile app version
- [ ] Multiplayer trial creation

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
