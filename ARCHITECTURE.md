# Architecture

Two independent components share one data format:

```
web-ui-editor/            Browser editor: author a trial, export .drtrial
freestyle-dangan-trial/   Godot 4.7 engine: load .drtrial, play the trial
```

A `.drtrial` file is a ZIP of the trial folder the editor maintains:

```
trial-folder/
├── trial.json          # metadata, cast ids, script lines, minigames, truth bullets
├── Characters/<Name>/  # character.json + sprite_01.png … sprite_NN.png
├── Audio/              # per-line voice files; Minigames/<gameId>/ for minigame voices
└── TruthBullets/       # evidence images
```

`trial.json` is the contract between the two components. The editor writes it,
`trial_loader.gd` reads it.

## The trial.json contract

The normative definition of the format lives in
[`schema/trial.schema.json`](schema/trial.schema.json) (JSON Schema). Three
things track it, and CI cross-checks all of them against the shared fixture
trial in `freestyle-dangan-trial/tests/fixtures/minimal-trial/`:

- the editor's runtime validator (`web-ui-editor/js/core/trialSchema.js`),
  cross-checked against the schema by ajv in `tests/schema.test.js`;
- the engine's validator (`scripts/core/trial/trial_validator.gd`) and typed
  model (`scripts/core/trial/model/`), exercised by the gdUnit4 suites;
- the format version: the editor writes `metadata.version`
  (`FORMAT_VERSION` in `js/core/constants.js`), the engine checks it
  (`TrialValidator.SUPPORTED_FORMAT_MAJOR`). Both sides reject files from a
  newer major version and warn on older ones.

To change the format: update the schema, then the editor validator/writer
and its tests, then the engine validator/model and its tests, then the
fixture. Bump the minor version for additive changes, the major for breaking
ones. A change that lands on only one side fails the other side's CI.

## Web editor

Framework-free ES modules bundled with Vite. See
[web-ui-editor/README.md](web-ui-editor/README.md) for the module map,
conventions, and dev workflow — that document is kept current.

## Godot engine

GDScript, organized under `freestyle-dangan-trial/scripts/`:

```
core/       Autoload singletons (see below) + trial/ loader helpers and AudioStreamLoader
camera/     CameraDirector autoload + bench_focus_camera rig
config/     MinigameConfig (tuning constants), ResourceRegistry (scene keys), UITheme
effects/    EffectBuilders — shared visual effect construction
game/       TrialRoomManager (composition root), CharacterStage, MinigameRunner, roaming text
minigames/  MinigameBase + one script per minigame type; debate/ for shared pieces
tools/      Start-menu file picker, small editor/debug helpers
ui/         DialogueBox, HUD gauges, cards, settings menu, mobile touch HUD
```

`TrialLoader` is a thin facade: `core/trial/trial_archive.gd` does ZIP
extraction and `core/trial/character_library.gd` owns character data and the
sprite-texture cache. `TrialRoomManager` is a composition root that wires
`ScriptDirector` signals to `CharacterStage` (3D bench sprites) and
`MinigameRunner` (the minigame catalog and replay loop).

### Autoloads (project.godot)

| Autoload | Role |
| --- | --- |
| `TrialLoader` | Extracts `.drtrial`, parses `trial.json`, caches character data and sprite textures. Sync path for direct scene launch, threaded async path behind the loading screen. |
| `ScriptDirector` | State machine that walks script lines (speaking / narrator / minigame) and emits signals the trial room reacts to. |
| `AudioManager` | Voice line playback. |
| `InputManager` | Central input → signals (advance, skip, settings, focus). |
| `InfluenceGauge` / `ConcentrateGauge` | Player health / slow-time meters (state only; UI scenes bind to them). |
| `TruthBulletManager` | Evidence available to the current minigame. |
| `CameraDirector` | Executes per-line camera motions from script data. |
| `ScreenEffects` | Full-screen effects requested by script lines. |
| `Settings` | User preferences persisted to `user://`. |
| `GameRandom` | Seeded RNG streams so a session is reproducible (`DANGAN_SEED` env var). |

### Flow

1. `start_menu.tscn` → `TrialFilePicker` selects a `.drtrial` →
   `loading_screen.tscn` drives `TrialLoader.load_trial_async()`.
2. `thh_trial_room_1.tscn` opens; `TrialRoomManager` seats the cast on benches
   and connects to `ScriptDirector` signals, then starts the script.
3. Speaking/narrator lines go through `DialogueBox` (typewriter, highlights,
   voice); camera and screen effects come from per-line script data.
4. A minigame line hands off to `MinigameRunner`, which instantiates the
   matching `MinigameBase` subclass (`MinigameRunner.MINIGAME_SCRIPTS`). The
   base class provides lifecycle, timers, managed signal connections, and
   standard HUD setup via `ResourceRegistry`. Success advances the script;
   failure replays the minigame; a depleted influence gauge ends in the
   game-over screen. The gauge is reset once per minigame *line*, so damage
   carries across replays of the same line, and `MinigameRunner.MAX_ATTEMPTS`
   caps the loop for the three minigames that never damage it.

### Adding a minigame

1. Create `scripts/minigames/my_game.gd` extending `MinigameBase`
   (implement `start()`, call `_finish(success, data)`).
2. Register its script path in `MinigameRunner.MINIGAME_SCRIPTS` and any
   scenes it needs in `ResourceRegistry.SCENES`.
3. Add the matching editor UI in `web-ui-editor/js/views/minigames/` so the
   game type can be authored (see the web UI README).

## Scene-owned UI

Editable UI is authored in `.tscn` scenes; scripts bind data and trigger
animations, they don't build node trees. This covers the settings menu, the
mobile HUD and toast, the screen-effects overlay, and the per-item minigame
pieces (Hangman slots, Debate Scrum keyword buttons, Logic Dive lanes, the
Nonstop Debate bullet preview and evidence card, the fallback file list). New UI
belongs in a scene, instantiated via `ResourceRegistry`.

What stays in code is procedural visual effects, not authorable screens:
`EffectBuilders` (shatter/particle systems), the slow-time vignette, the camera
cross-dissolve, and `roaming_text_path` (one label per character along a curve).
Their tweens have data-driven durations/colors and per-frame or per-item counts,
so they can't be fixed AnimationPlayer clips. The same reasoning keeps the
`ScreenEffects` effect tweens and the gauge-fill / typewriter tweens in code.

## UI textures

`freestyle-dangan-trial/textures/ui/` is the single runtime texture set; node
sizes are defined in scenes and never derived from texture resolution, so
swapping art never moves layout. Stretch mode is deliberately disabled --
window size never rescales the UI; the Settings "UI Scale" option
(`Window.content_scale_factor`) is the only canvas scale. Full rules,
including why 9-slice sources must stay at design resolution, live in
`freestyle-dangan-trial/textures/ui/README.md`.

## Known debt

- `scenes/thh_trial_room_1.tscn` — the room the runtime actually loads
  (`loading_screen.gd`, `vbox_selector.gd`) — embeds ~97MB of mesh data. It
  stays under GitHub's hard limit but should eventually reference external
  mesh resources. The gitignored `thh_default_trial_room.tscn` is referenced
  by nothing at runtime; it is a local-only authoring asset kept out of git
  because its embedded meshes exceed GitHub's file size limit.
- A few authored fields aren't wired up yet: `characterSpotlight` (reserved for
  an unimplemented lighting effect), white-noise debate lines (disabled pending
  a layout rework). The camera motions, screen effects, highlight ranges and
  the lie/negative-bullet toggle the editor authors *are* interpreted.
