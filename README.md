# Freestyle Danganronpa Trial Creator

A modular, browser-based tool for creating custom Danganronpa-style trials. This project allows creators to design their own cast of characters, manage character profiles and sprites, and eventually script complete trial sequences using an intuitive web interface.

## Project Status

**Web UI (Script Writer)**: 🟢 In Active Development
**Trial Engine (Godot 4.4)**: 🔴 Not Started (Asset Modeling Phase)

Currently, the focus is on the **Danganronpa Cast Manager**, a web-based interface for creating and managing trial casts, character profiles, and sprite collections. The game engine implementation will follow once the authoring tools are complete.

---

## Features

### Current Features (Web UI)

- **Workspace Management**
  - File System Access API integration for local project storage
  - Automatic directory structure creation
  - Trial metadata management with auto-save

- **Character Management**
  - Support for 17 character slots (16 students + 1 headmaster)
  - Comprehensive character profiles with physical attributes, personality traits, and backstory
  - Visual distinction between student and headmaster character types
  - Unique ID generation for reliable character tracking

- **Sprite System**
  - Individual sprite upload with preview
  - Bulk import for all character sprites at once
  - Configurable sprite count per character (1-100, default: 25)
  - Automatic PNG conversion and standardized naming

- **Script Editor** 🆕
  - Visual script line editor with three line types:
    - **Speaking**: Character selection + dialogue input
    - **Narrator**: Pure narration text
    - **Minigame Start**: Minigame type selection
  - Clickable arrow buttons (▲▼) for precise single-step reordering
  - Intuitive drag-and-drop reordering with gap-based insertion
  - Pulsing blue highlight lines show where items will be inserted
  - Multi-select support (Ctrl+Click) to move multiple lines at once
  - Smooth CSS animations during reordering
  - Ghost preview showing what's being dragged ("1 line" or "X lines")
  - Auto-save to trial.json with complete script preservation

- **User Experience**
  - Dark/Light theme toggle with localStorage persistence
  - Responsive grid layout for all screen sizes
  - Real-time validation and error messaging
  - Intuitive modal-based character editing
  - Loading states for async operations

---

## Getting Started

### Prerequisites

- A modern web browser

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/freestyle-dangan-trial.git
   cd freestyle-dangan-trial
   ```

2. Open the web interface:
   ```bash
   cd web-ui-editor
   # Open index.html in your browser
   ```
---

## Usage Guide

### Creating Your First Trial

1. **Open the Web Interface**
   - Launch `web-ui-editor/index.html` in a supported browser

2. **Select a Workspace Folder**
   - Click the "📁 Choose Folder" button
   - Select or create a new folder for your trial (e.g., `C:\Users\YourName\Desktop\Trials\MyTrial`)
   - Grant read/write permissions when prompted

3. **Name Your Trial**
   - Enter a descriptive trial name in the "Trial Name" input field
   - The trial metadata saves automatically

4. **Create Characters**
   - Click on any empty cast block (Student 01-16 or Headmaster)
   - Fill in the character details:
     - **Personal Info**: Name, surname, date of birth, blood type
     - **Physical**: Height (m/cm), weight (kg), chest measurement (cm)
     - **Personality**: Likes, dislikes, character notes

5. **Add Character Sprites**
   - Switch to the "Sprites" tab in the character modal
   - **Option A**: Click individual sprite slots to upload one at a time
   - **Option B**: Use "📁 Bulk Import" to select all 25 sprites at once
   - All sprites must be uploaded before saving

6. **Save Your Character**
   - Click "Save Student" or "Save Headmaster"
   - The character folder and files are created automatically

### Managing Your Cast

- **Edit a Character**: Click on any filled cast block to reopen the modal
- **View Character Type**: Students have blue gradient backgrounds, headmasters have orange
- **Theme Preference**: Click the 🌙/☀️ icon to toggle between dark and light modes
- **Adjust Settings**: Click the ⚙️ icon to configure max sprites per character

### Creating Trial Scripts 🆕

1. **Switch to Script View**
   - Click the "📝 Script" navigation item in the sidebar
   - This switches from Cast management to Script editing mode

2. **Add Script Lines**
   - Click the "➕ Add Line" button to create a new script line
   - Each line has up/down arrow buttons (▲▼), line number, content area, type selector, and delete button

3. **Configure Line Types**
   - Use the dropdown on the right side of each line to select the type:
     - **Speaking**: Select a character from your cast and enter their dialogue
     - **Narrator**: Enter narration text (no character selection)
     - **Minigame Start**: Select which minigame to trigger (Truth Bullets, Hangman's Gambit, Rebuttal Showdown)

4. **Reorder Script Lines**

   **Method 1: Arrow Buttons (Precise Single-Step Movement)**
   - Click the **▲** button to move a line up one position
   - Click the **▼** button to move a line down one position
   - Arrows change color on hover for visual feedback

   **Method 2: Drag-and-Drop (Flexible Multi-Line Movement)**
   - **Single line**: Click and drag any line (anywhere on the bar or the arrow area)
   - **Multiple lines**: Hold Ctrl (Cmd on Mac) and click lines to select them, then drag to move all at once
   - **Drop target**: Drag to the **gap between two lines** (not onto a line itself)
   - Visual feedback:
     - Dragged lines become semi-transparent with dashed borders
     - A **pulsing blue highlight line** appears in the gap where you're hovering
     - The gap expands slightly to make targeting easier
     - Ghost preview shows "1 line" or "X lines" being dragged
     - Smooth animations when lines reorder

5. **Edit Script Content**
   - Click into any input field to edit dialogue or narration text
   - Use character dropdowns to change who is speaking
   - All changes auto-save to trial.json

6. **Delete Script Lines**
   - Click the 🗑️ button on any line to remove it
   - Remaining lines automatically renumber

---

## Data Structure & JSON Schema

### Project Directory Structure

When you select a workspace folder, the system creates the following structure:

```
[Your Workspace Folder]/
├── trial.json                    # Trial metadata and character references
└── Characters/                   # Character data folder
    ├── John_Doe/
    │   ├── character.json        # Character profile data
    │   ├── sprite_01.png         # Character sprites (25 by default)
    │   ├── sprite_02.png
    │   ├── sprite_03.png
    │   └── ...
    │   └── sprite_25.png
    ├── Jane_Smith/
    │   ├── character.json
    │   └── [sprites...]
    └── [Additional characters...]
```

### trial.json Schema

The root trial metadata file that references all characters in the cast and contains the trial script:

```json
{
  "trialName": "Investigation Room Case 1",
  "characters": [
    "JD_19920315_A1B2C3",           // Character ID or null
    "JS_19930822_D4E5F6",
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    "MN_19700101_G7H8I9"            // Position 16: Headmaster
  ],
  "script": {
    "lines": [
      {
        "id": "line_1733585420123",
        "order": 0,
        "type": "speaking",
        "characterId": "JD_19920315_A1B2C3",
        "dialogue": "Something doesn't add up here..."
      },
      {
        "id": "line_1733585430456",
        "order": 1,
        "type": "narrator",
        "text": "The room fell silent as everyone considered the evidence."
      },
      {
        "id": "line_1733585440789",
        "order": 2,
        "type": "minigame",
        "minigameId": "truth_bullets"
      }
    ],
    "lastModified": "2025-12-07T15:30:00Z"
  },
  "metadata": {
    "version": "3.0",
    "lastModified": "2025-12-07T15:30:00Z",
    "studentCount": 16,
    "headmasterCount": 1,
    "totalCharacters": 3,
    "scriptLineCount": 3
  }
}
```

**Field Descriptions:**
- `trialName` (string): User-defined trial name (max 60 characters)
- `characters` (array[17]): Array of character IDs or null values
  - Indices 0-15: Student slots
  - Index 16: Headmaster slot
- `script` (object): 🆕 Trial script data
  - `lines` (array): Array of script line objects in sequence order
  - `lastModified`: ISO 8601 timestamp of last script modification
- `metadata` (object): System-generated metadata
  - `version`: Data format version
  - `lastModified`: ISO 8601 timestamp
  - `studentCount`: Number of student slots (always 16)
  - `headmasterCount`: Number of headmaster slots (always 1)
  - `totalCharacters`: Count of non-null character entries
  - `scriptLineCount`: 🆕 Total number of script lines

### Script Line Schema 🆕

Each script line object in the `script.lines` array has the following structure:

**Speaking Line:**
```json
{
  "id": "line_1733585420123",
  "order": 0,
  "type": "speaking",
  "characterId": "JD_19920315_A1B2C3",
  "dialogue": "Something doesn't add up here..."
}
```

**Narrator Line:**
```json
{
  "id": "line_1733585430456",
  "order": 1,
  "type": "narrator",
  "text": "The room fell silent as everyone considered the evidence."
}
```

**Minigame Line:**
```json
{
  "id": "line_1733585440789",
  "order": 2,
  "type": "minigame",
  "minigameId": "truth_bullets"
}
```

**Field Descriptions:**
- `id` (string): Unique line identifier (format: `line_[timestamp]`)
- `order` (number): Zero-based position in script sequence
- `type` (string): Line type - `"speaking"`, `"narrator"`, or `"minigame"`
- `characterId` (string): Character ID reference (speaking lines only)
- `dialogue` (string): Character dialogue text (speaking lines only)
- `text` (string): Narration text (narrator lines only)
- `minigameId` (string): Minigame type identifier (minigame lines only)
  - Options: `"truth_bullets"`, `"hangmans_gambit"`, `"rebuttal_showdown"`

### character.json Schema

Individual character profile stored in `Characters/[CharacterName]/character.json`:

```json
{
  "id": "JD_19920315_A1B2C3",
  "name": "John",
  "surname": "Doe",
  "heightM": 1,
  "heightCM": 75,
  "weight": 68,
  "chest": 92,
  "blood": "A",
  "dob": "1992-03-15",
  "likes": "Mystery novels, coffee, classical music, solving puzzles",
  "dislikes": "Dishonesty, loud noises, injustice, being underestimated",
  "notes": "Ultimate Detective. Analytical and observant with a calm demeanor. Has a strong sense of justice but can be overly serious at times.",
  "isHeadmaster": false,
  "position": 0,
  "lastModified": "2025-12-07T15:30:00Z"
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (format: `InitialsSurname_InitialsName_YYYYMMDD_Random6`) |
| `name` | string | Character's first name |
| `surname` | string | Character's last name |
| `heightM` | number | Height in meters (0.9-2.5) |
| `heightCM` | number | Additional centimeters (0-99) |
| `weight` | number | Weight in kilograms (0-300) |
| `chest` | number | Chest measurement in centimeters (0-200) |
| `blood` | string | Blood type (`A`, `B`, `O`, `AB`, `Unknown`) |
| `dob` | string | Date of birth in YYYY-MM-DD format |
| `likes` | string | Character's likes and interests |
| `dislikes` | string | Character's dislikes and aversions |
| `notes` | string | Character backstory, personality, or ultimate talent |
| `isHeadmaster` | boolean | `true` for headmaster, `false` for student |
| `position` | number | Position in cast array (0-16) |
| `lastModified` | string | ISO 8601 timestamp of last modification |

### Character ID Format

Character IDs are generated using a human-readable format for easier debugging and reference:

```
Format: [First Letter Surname][First Letter Name]_[YYYYMMDD]_[Random 6-char]
Example: JD_19920315_A1B2C3

Components:
- JD: John Doe's initials (surname first, then name)
- 19920315: Date of birth (March 15, 1992)
- A1B2C3: Random alphanumeric string for uniqueness
```

### Sprite Naming Convention

Character sprites are saved with zero-padded sequential numbering:

```
sprite_01.png
sprite_02.png
sprite_03.png
...
sprite_25.png
```

All sprites are automatically converted to PNG format regardless of the original upload format.

---

## Technology Stack

### Web Interface

- **HTML5**: Semantic structure and File System Access API
- **CSS3**: Custom properties (variables) for theming, Grid/Flexbox layouts
- **Vanilla JavaScript**: Modular ES5+ with no framework dependencies
- **Google Fonts**: Inter font family for clean typography

### APIs & Standards

- **File System Access API**: Local directory read/write operations
- **LocalStorage API**: Theme and settings persistence
- **FileReader API**: Image processing and data URL generation
- **Canvas API**: (Future) Image manipulation and sprite processing

### Game Engine (Planned)

- **Godot 4.4**: Open-source game engine for trial execution
- **GDScript**: Scripting language for game logic
- **3D Assets**: Custom models for trial room environment

---

## Project Structure

```
freestyle-dangan-trial/
├── web-ui-editor/                  # Web-based authoring tool (CURRENT FOCUS)
│   ├── index.html                  # Main entry point
│   ├── css/
│   │   └── styles.css              # Complete styling system with theming
│   └── js/
│       ├── app.js                  # Core application logic and cast management
│       ├── modal.js                # Character creation/editing modal system
│       ├── settings.js             # Application settings management
│       └── utils.js                # Utility functions (loader, theme, file handling)
│
├── freestyle-dangan-trial/         # Godot 4.4 game engine project (NOT STARTED)
│   ├── models/                     # 3D models for trial room
│   │   ├── Bench.blend             # Student seating
│   │   ├── Floor.blend
│   │   ├── Headmaster_Podium.blend
│   │   └── Walls.blend
│   ├── scenes/                     # Godot scene files
│   │   ├── HighlightShader.gdshader
│   │   └── trial_env.tscn
│   ├── scripts/                    # GDScript files (empty - awaiting development)
│   ├── textures/                   # 3D texture assets
│   │   ├── Bench_Textures/
│   │   ├── Floor_Textures/
│   │   ├── Podium_Textures/
│   │   └── Wall_Textures/
│   └── project.godot               # Godot project configuration
│
├── .gitattributes                  # Git LFS configuration
├── .gitignore                      # Git ignore rules
└── README.md                       # This file
```

### Module Responsibilities

**app.js** (Main Controller)
- Cast array management (17 character slots)
- Workspace folder selection and file system integration
- Trial metadata loading and auto-saving
- Character data loading from ID references
- Cast grid rendering and UI updates
- Character type utilities (student/headmaster distinction)
- 🆕 View management (Cast/Script view switching)
- 🆕 Script editor rendering with drop zone gaps
- 🆕 Script line CRUD operations (add, delete, update, reorder)
- 🆕 Arrow button navigation (moveLineUp/moveLineDown)
- 🆕 Gap-based drag-and-drop with position calculation
- 🆕 Multi-select support for batch line operations
- 🆕 Script line type handling (speaking, narrator, minigame)
- 🆕 Script data persistence in trial.json

**modal.js** (Character Editor)
- Character modal lifecycle (open/close/render)
- Details tab: Profile form with validation
- Sprites tab: Upload interface (individual/bulk)
- Character ID generation with human-readable format
- Character data validation and saving
- Sprite file writing with error handling

**settings.js** (Configuration)
- Application settings object management
- Max sprites per character configuration (1-100)
- LocalStorage persistence for settings
- Settings modal UI

**utils.js** (Helpers)
- Loading overlay display
- File to data URL conversion for previews
- Directory display rendering
- Theme toggle and initialization
- Common utility functions

**styles.css** (Presentation)
- CSS custom properties for light/dark themes
- Responsive grid layouts for cast display
- Modal styling with animations
- Character type visual distinction (student/headmaster)
- Custom scrollbar and form styling
- 🆕 Script editor layout and line styling
- 🆕 Arrow button styling with hover/active states
- 🆕 Drop zone gap styling (invisible by default, visible on hover)
- 🆕 Pulsing highlight line animation for drop targets
- 🆕 Drag-and-drop visual states (dragging, selected)
- 🆕 Ghost element preview styling
- 🆕 Smooth reordering animations (300ms transitions)

---

## Default Trial Storage Location

By default, trials created with this tool are saved to:

```
C:\Users\Sauraav\Desktop\Trials\
```

You can choose any folder on your system when prompted by the "Choose Folder" dialog.

---

## Roadmap

### Phase 1: Web UI (Current)
- [x] Character cast management system
- [x] Character profile creation and editing
- [x] Sprite upload and management
- [x] Student/Headmaster type support
- [x] Dark/Light theme system
- [x] Settings configuration
- [ ] Character deletion functionality
- [ ] Character reordering/swapping
- [ ] Export/Import trial packages

### Phase 2: Script Writer (In Progress)
- [x] Dialogue scripting interface with speaking/narrator/minigame lines
- [x] Gap-based drag-and-drop reordering with pulsing highlight lines
- [x] Arrow button navigation for precise single-step reordering
- [x] Multi-select support for batch operations
- [x] Visual feedback and animations
- [x] Auto-save script to trial.json
- [ ] Evidence management
- [ ] Truth bullets system
- [ ] Scene sequence editor
- [ ] Music and sound effect assignment
- [ ] Background selection
- [ ] Character expression/sprite mapping per line

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

## Browser Compatibility

### Fully Supported
- Chrome 86+
- Edge 86+
- Opera 72+

### Not Supported (File System Access API Unavailable)
- Firefox (all versions)
- Safari (all versions)

For unsupported browsers, consider using a Chromium-based alternative or implementing a fallback with traditional file downloads.

---

## Development

### Running Locally

1. Clone the repository
2. Open `web-ui-editor/index.html` in a supported browser
3. No build process required - pure HTML/CSS/JS

### Recommended Development Tools

- **VS Code** with Live Server extension
- **Chrome DevTools** for debugging File System Access API calls
- **Git LFS** for managing large 3D assets

### Code Style

- ES5+ JavaScript with modern syntax
- Consistent 2-space indentation
- Descriptive variable and function names
- Comments for complex logic
- Modular file organization

---

## Contributing

Contributions are welcome! Areas where help is needed:

- **UI/UX Improvements**: Enhanced character management workflows
- **Feature Additions**: Character deletion, reordering, search/filter
- **Browser Support**: Fallback implementations for non-Chromium browsers
- **Documentation**: Tutorial videos, screenshots, usage examples
- **Testing**: Cross-browser testing, edge case identification
- **Godot Development**: Trial engine implementation

Please open an issue to discuss major changes before submitting a pull request.

---

## License

This project is open source. License details to be determined.

---

## Acknowledgments

- Inspired by the Danganronpa series by Spike Chunsoft
- Built with modern web standards and open-source technologies
- 3D assets created with Blender

---

## Contact

For questions, suggestions, or collaboration inquiries, please open an issue on GitHub.

---

**Note**: This project is a fan creation and is not affiliated with or endorsed by Spike Chunsoft Co., Ltd.
