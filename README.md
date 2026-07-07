# Freestyle Danganronpa Trial Creator

[![Web UI](https://github.com/Saupernova13/freestyle-dangan-trial/actions/workflows/web-ui.yml/badge.svg)](https://github.com/Saupernova13/freestyle-dangan-trial/actions/workflows/web-ui.yml)
[![Engine](https://github.com/Saupernova13/freestyle-dangan-trial/actions/workflows/engine.yml/badge.svg)](https://github.com/Saupernova13/freestyle-dangan-trial/actions/workflows/engine.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Create custom Danganronpa-style class trials: a browser-based authoring tool
plus a Godot 4.5 engine that plays the result. Design a cast, write a branching
script with camera work and effects, configure minigames, and play it back.

**Try it:** [hosted editor](https://saupernova13.github.io/freestyle-dangan-trial/) ·
[downloads](https://github.com/Saupernova13/freestyle-dangan-trial/releases)

The project is two independent components joined by one data format — a
`.drtrial` file. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full map.

## Project status

| Component | Status |
|-----------|--------|
| **Web UI (authoring)** | Stable — full character, script, minigame and evidence editing |
| **Trial engine (Godot)** | Playable — dialogue, camera, effects and five minigames run end to end; still in development |

The engine plays a trial from start to finish: it renders dialogue with a
typewriter reveal and inline highlighting, drives per-line camera motions and
screen effects, runs five minigames with a replay-on-failure loop, tracks the
influence/concentrate gauges, and ends on the game-over screen. What is *not*
done yet is called out under [Not yet implemented](#not-yet-implemented) — the
honest list, rather than the whole feature set being marked "WIP."

---

## Web authoring interface

### Cast & characters
- 16 students + 1 headmaster, each with a profile (name, DOB, blood type,
  physical attributes, personality) and a set of sprite expressions
- Type-specific editing for students vs. the headmaster
- Automatic character IDs used everywhere the script references a character

### Script
- Three line types: **Speaking** (character dialogue), **Narrator**
  (narration), **Minigame** (hand off to a minigame)
- Drag-and-drop reordering with gap insertion, arrow-button single steps, and
  multi-select for batch operations
- Auto-save to `trial.json`

### Per-line properties (speaking lines)
- **Sprite** — the expression shown for that line
- **Voice** — upload/preview an audio clip (MP3, WAV, OGG)
- **Highlighting** — drag-select ranges with custom colours
- **Camera motion** — pan/zoom/rotate/dolly/truck/pedestal/tilt and more
- **Screen effects** — shake, flash, fade, blur, distortion, sepia, grayscale,
  invert, vignette, scanlines, and others

### Also
- Truth bullets (evidence) with images and descriptions
- A configuration editor per minigame type
- Undo/redo across all views (Ctrl+Z / Ctrl+Y or Ctrl+Shift+Z). Undo restores
  the trial structure; binary side files already deleted from disk (e.g. a
  removed voice clip) are not resurrected.
- Dark/light theme, persisted

---

## Game engine (Godot 4.5)

### Minigames

Five are fully playable; three are stubs that show a title card and
auto-complete (placeholders for future mechanics):

| Minigame | Status |
|----------|--------|
| Nonstop Debate | Playable — scrolling statements, truth-bullet shooting, slow-time, weak-point break sequence |
| Hangman's Gambit | Playable — floating-letter word puzzle |
| Logic Dive | Playable — multiple-choice lanes over a scrolling road |
| Debate Scrum | Playable — timed keyword rebuttals |
| Mass Panic Debate | Playable — three-speaker rows with focus switching |
| Rebuttal Showdown / Psyche Taxi / Closing Argument | Stub — title card, then auto-complete |

### Implemented systems
- **Dialogue** — typewriter reveal (speed from settings), inline highlight
  BBCode, per-line dialogue-box styling, voice playback
- **Camera** — `CameraDirector` executes the editor's motion vocabulary with
  easing and duration; a bench camera handles free navigation and focus
- **Screen effects** — `ScreenEffects` runs per-line shake/flash/fade/FOV
  punch/overlay-text/shader-filter effects
- **Minigame framework** — `MinigameBase` provides the lifecycle, timer,
  managed signal connections, standard HUD setup, and a mobile touch HUD
- **Gauges** — influence (damage) and concentrate (slow-time) meters, with
  scene-bound UI
- **Truth bullets** — the selector HUD and bullet-match checking the debate
  minigames use
- **Audio** — runtime decoding of MP3/OGG/WAV voice lines with a small cache
- **Settings, game-over, seeded RNG** — persisted preferences, retry/return
  flow, and reproducible sessions via `GameRandom` (`DANGAN_SEED` env var)

### Not yet implemented
- Character animation — sprites are static (no idle/react/walk)
- Background music — audio is voice-only
- Lie/negative truth bullets — the editor authors `useNegativeBullet`, but the
  player-side toggle isn't bound to input yet
- White-noise debate lines — the field exists but panel placement is disabled
  pending a rework
- `characterSpotlight` — reserved for a lighting effect that doesn't exist yet
  (camera focus follows the speaker regardless)
- The three stub minigames above

---

## Getting started

### Web UI (authoring trials)

**No install:** use the hosted editor at
<https://saupernova13.github.io/freestyle-dangan-trial/>. For an offline copy,
build the single-file editor yourself with `npm run build:single` (it writes a
self-contained `dist/index.html`).

**From source:** Node.js 18+, and a modern browser. Chromium (Chrome, Edge,
Opera) can edit a trial folder on disk; Firefox and Safari work in browser
storage with `.drtrial` import/export (see `web-ui-editor/README.md`).

```bash
cd web-ui-editor
npm install
npm run dev        # open the printed URL
```

1. Use the trial hub to open a folder (Chromium) or create a browser-storage
   trial (any browser), and name it.
2. Fill in the cast and upload sprites.
3. Write the script (📝 Script view); add camera motions, effects, audio, and
   highlighting through the per-line editor.
4. Configure minigames (🎮 Minigames view).
5. Add evidence (💎 Truth Bullets view).
6. Export a `.drtrial` to play in the engine.

### Game engine (playing trials)

Download a prebuilt build from the
[latest release](https://github.com/Saupernova13/freestyle-dangan-trial/releases):
a self-contained **Windows** `.exe` (zipped) or an **Android** `.apk`
(debug-signed — enable "install unknown apps" to sideload). Or run from source:

```bash
cd freestyle-dangan-trial
# Open in Godot 4.5+, press F5
```

From the start menu, choose a `.drtrial` file (desktop uses the native file
dialog; Android uses the storage picker). The trial then loads behind a
progress screen and begins.

---

## Controls (engine)

| Input | Action |
|-------|--------|
| Space / Enter | Advance dialogue (or skip the typewriter) |
| Ctrl (hold) | Fast-forward / auto-skip |
| Esc | Open settings |
| Arrow keys | Navigate between benches |
| Left-click drag | Free-look (springs back on release) |
| Left-click | Shoot truth bullet / select |
| Right-click (hold) / F | Focus (aim) mode |
| Q / E or scroll wheel | Cycle truth bullets |

On touch devices a mobile HUD provides settings, bullet cycling, focus, and
slow-time buttons; tapping the left/right screen thirds navigates benches.

---

## Project structure

```
freestyle-dangan-trial/
├── web-ui-editor/                  # Browser authoring tool (ES modules + Vite)
│   ├── index.html
│   ├── css/styles.css
│   ├── tests/                      # Vitest unit tests
│   └── js/                         # core/, models/, views/, modals/, ui/, ...
│
├── freestyle-dangan-trial/         # Godot 4.5 engine
│   ├── scripts/
│   │   ├── core/                   # Autoload singletons + trial/ loader helpers
│   │   ├── camera/                 # CameraDirector + bench camera rig
│   │   ├── minigames/              # MinigameBase + one script per minigame
│   │   ├── game/                   # TrialRoomManager, CharacterStage, MinigameRunner
│   │   ├── ui/                     # Dialogue box, gauges, cards, menus, mobile HUD
│   │   └── config/, effects/, tools/
│   ├── scenes/                     # Godot scenes (.tscn)
│   ├── shaders/                    # screen_filter.gdshader
│   ├── textures/                   # UI and background textures
│   ├── models/                     # Source 3D art (gitignored; meshes embedded in scenes)
│   └── project.godot
│
├── ARCHITECTURE.md
├── CONTRIBUTING.md
└── README.md
```

---

## Data format

### `.drtrial` file

A `.drtrial` is a ZIP of the trial folder:

```
trial-folder/
├── trial.json                      # metadata, cast ids, script, minigames, truth bullets
├── Characters/
│   └── <Name>/
│       ├── character.json          # profile
│       └── sprite_01.png …         # expressions
├── Audio/                          # per-line voice files
│   └── Minigames/<gameId>/         # minigame voice lines
└── TruthBullets/                   # evidence images (metadata is in trial.json)
```

### `trial.json`

`trial.json` is the contract between editor and engine, formally defined in
[`schema/trial.schema.json`](schema/trial.schema.json) (see ARCHITECTURE.md,
"The trial.json contract"). `characters` is an ordered list of character ids
(one per bench); `minigames` and `truthBullets` are arrays the engine looks
up by `gameId` / `bulletId`.

```json
{
  "trialName": "Investigation Room Case 1",
  "characters": ["JD_19920315_A1B2C3", "JS_19930822_D4E5F6"],
  "script": {
    "lines": [
      {
        "id": "line_1733585420123",
        "type": "speaking",
        "characterId": "JD_19920315_A1B2C3",
        "dialogue": "Something doesn't add up here...",
        "spriteIndex": 2,
        "audioFile": "line_1733585420123.mp3",
        "highlights": [{ "startChar": 0, "endChar": 9, "color": "#FFDD00" }],
        "cameraMotion": { "type": "zoom_in", "duration": 1.5, "easing": "ease-in-out" },
        "specialEffects": { "effects": [{ "type": "shake", "intensity": 0.5 }] }
      },
      { "id": "line_1733585430456", "type": "minigame", "minigameId": "debate_1" }
    ]
  },
  "minigames": [
    { "gameId": "debate_1", "gameType": "nonstop_debate", "name": "...", "difficulty": "medium", "timeLimit": 60, "typeSpecific": {} }
  ],
  "truthBullets": [
    { "bulletId": "tb_1", "name": "Broken Watch", "description": "Stopped at 10:15." }
  ]
}
```

---

## Development

**Web UI**
```bash
cd web-ui-editor
npm run dev        # dev server
npm test           # Vitest
npm run lint       # ESLint
npm run build      # static build to dist/
npm run check      # lint + test + build (the CI gate)
```

**Engine** — open `freestyle-dangan-trial/` in Godot 4.5+ and press F5. A
headless compile check:
```bash
godot --headless --quit-after 5 --path freestyle-dangan-trial
```

### Code style
- GDScript: tabs, `snake_case`; comments only where intent isn't obvious
- JavaScript: 2-space, `camelCase`

### Key files

**Web UI**
- `web-ui-editor/js/core/storage.js` — file I/O and persistence
- `web-ui-editor/js/views/minigameView.js` — minigame coordinator
- `web-ui-editor/js/modals/scriptLineModal.js` — per-line properties editor

**Engine**
- `scripts/core/TrialLoader.gd` — `.drtrial` load facade (`trial/` helpers)
- `scripts/core/ScriptDirector.gd` — script playback state machine
- `scripts/game/TrialRoomManager.gd` — trial-room composition root
- `scripts/game/CharacterStage.gd` — bench sprite population and lookup
- `scripts/game/MinigameRunner.gd` — minigame catalog and replay loop
- `scripts/minigames/MinigameBase.gd` — minigame framework
- `scripts/camera/CameraDirector.gd` — per-line camera motion

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, conventions, and the PR
checklist. Adding a minigame is documented in [ARCHITECTURE.md](ARCHITECTURE.md).

## License

The code in this repository is licensed under the [MIT License](LICENSE).

The license covers the code only. Sample trial content, character art, and
other Danganronpa-styled assets are fan content; rights to the Danganronpa
characters, names, and visual style belong to Spike Chunsoft Co., Ltd. Do not
redistribute those assets outside the context of this fan project.

## Acknowledgments

Inspired by the Danganronpa series by Spike Chunsoft. Built with Godot and web
standards; 3D assets made in Blender. This is a fan creation, not affiliated
with Spike Chunsoft Co., Ltd.
