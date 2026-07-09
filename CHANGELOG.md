# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Trial file format versions (`metadata.version` in `trial.json`) are tracked
separately in `schema/trial.schema.json`.

## [Unreleased]

### Added
- Nonstop debates now darken the scene and apply a crimson filter with an edge
  vignette while the debate runs, fading in at the start and out at the end.
  The grade is a shader on `scenes/minigames/debate_ambience.tscn`; tint,
  desaturation, darkening, and vignette are material parameters, and the fade
  timing is the scene's `show` / `dismiss` animations.
- Breaking a statement now freezes a screenshot of the screen, grows crack
  lines outward from the shot panel, shatters the frame into glass shards that
  reveal black behind, then races the BREAK! text in from a distance, holds it,
  and zooms it past the camera. The whole sequence is one scrubbable
  `break_sequence` animation in `scenes/minigames/break_shatter.tscn`; the
  crack pattern (cell count, seed, crack width and color, shard flight) is
  exposed as material parameters.

### Changed
- Every visual element and animation is now owned by a scene and editable in
  the Godot editor. Code-built nodes and `create_tween()` animations were
  replaced by `.tscn` scenes with `AnimationPlayer` clips across the screen
  effects overlay, the minigame overlays, the slow-time vignette, Hangman's
  floating letters, the Logic Dive road and question entrance, the debate
  panels, bullet projectiles, the evidence card, the minigame title card, the
  dialogue typewriter, and the start menu's roaming text. Scripts now only bind
  live data and trigger animations. See `UI_GUIDE.md` for the layer map and the
  short list of things that legitimately stay in code.
- `ScreenEffects` clips are authored one second long and stretched with
  `speed_scale`, so per-line `duration` and `color` from trial data still drive
  scene-authored curves. Each overlay rect has its own `AnimationPlayer`, so
  several effects on one dialogue line no longer cancel each other.
- The minigame title card's fly-in/fly-out keys proportional anchors instead of
  pixel positions, so it enters and exits fully offscreen at any resolution.
- The camera director's cross dissolve and screen shake now delegate to
  `ScreenEffects`; shake consequently respects the screen-shake accessibility
  setting.
- Renamed all GDScript files to snake_case per the official Godot style guide
  (e.g. `TrialLoader.gd` -> `trial_loader.gd`, `UITheme.gd` -> `ui_theme.gd`).
  Autoload names and `class_name` identifiers are unchanged.
- Renamed the trial-room textures and the Lexend font to snake_case, fixing the
  `UV_Walls_1X` capital-X inconsistency. Resource UIDs are preserved, so scene
  references resolve unchanged.
- Renamed the animation resources to snake_case (`UI_Anim_Lib.tres` ->
  `ui_anim_lib.tres`, `Load_In_Chamber.res` -> `load_in_chamber.res`, etc.);
  animation-name keys inside the libraries are unchanged.

### Removed
- Deleted `scripts/effects/effect_builders.gd`. Its node-building, self-tweening
  factories were replaced by the spawnable VFX scenes in `scenes/effects/` and
  by animation clips on the scenes that own the affected nodes. The dead
  `SHATTER_GRID`, `SLOW_VIGNETTE_*`, `COLOR_SCREEN_SHARD`, `COLOR_SLOW_VIGNETTE`
  and `FONT_SIZE_POPUP` constants went with it — those values now live in the
  scenes.
- Deleted the bundled `trial_data/` sample trial (17 DRV3 character folders,
  generated audio and truth bullets). `makoto` remains the default portrait and
  `tests/fixtures/minimal-trial/` the only in-repo sample.
- Removed dead assets: the archived UI texture set (`textures/_archive/`), eight
  orphaned `.uid` sidecars, the unused `Loop_Summary.res`, and duplicated
  trial-room texture copies.

## [1.1.1] - 2026-07-08

### Fixed
- Engine: startup crash on the Windows build (`Nonexistent function
  'character_at_bench' in base 'Nil'`) when the bench-focus camera fired its
  initial focus before `TrialRoomManager` had assigned `_stage`.
  `on_bench_focused` now no-ops until the stage is ready.

## [1.1.0] - 2026-07-07

### Added
- Releases now ship prebuilt engine binaries: a zipped self-contained Windows
  `.exe` and a debug-signed Android `.apk` (arm64, prebuilt template, keystore
  generated in CI). The release workflow also runs on `workflow_dispatch` as a
  build-only dry run.
- Committed `models/textures/1x/` (the trial-room textures the main scene
  references) so a clean checkout can export the engine in CI.

### Changed
- The release workflow no longer attaches the web editor; the editor ships via
  GitHub Pages and `npm run build:single` for offline use.
- Editor toolchain bumped to ESLint 10, Vite 8, and Vitest 4; CI runs on
  Node 22.
- Windows export preset embeds the pck into a single `.exe`; the Android export
  preset is named `Android` with package `za.co.raavivi.customronpa`.

## [1.0.0] - 2026-07-07

First tagged release. Editor and engine were already feature-complete for
authoring and playing trials; this release adds the contract, safety, and
release infrastructure around them.

### Added

- MIT license.
- `schema/trial.schema.json`: the formal trial.json contract between the
  editor and the engine, with a shared fixture trial and validators on both
  sides (editor: `js/core/trialSchema.js`; engine: `TrialValidator.gd`).
  Both sides now check the format version and reject files from a newer
  major version with a clear message.
- Editor: undo/redo (Ctrl+Z / Ctrl+Y or Ctrl+Shift+Z) across cast, script,
  minigames, and truth bullets.
- Editor: trial.json validation on load (warning dialog), save (console
  warning), and export (pre-flight check).
- Engine: typed trial data model (`ScriptLine`, `MinigameData`,
  `TrialManifest`) parsed once at load, replacing scattered Dictionary
  access.
- Engine: `Log` autoload with debug/info/warn/error levels; debug and info
  are muted in release builds (set `DANGAN_VERBOSE=1` to re-enable).
- Engine: gdUnit4 test suites for the validator, archive extraction, data
  model, and seeded RNG; gdlint configuration.
- CI: engine workflow (gdlint, headless import, unit tests), GitHub Pages
  deploy of the editor, and a tag-triggered release workflow that publishes
  the single-file editor HTML.
- Repo: issue/PR templates, dependabot, cross-platform check scripts
  (`tools/check.sh`, `tools/check.ps1`), and an opt-in pre-commit hook.

### Changed

- Editor: all `innerHTML` writes route through a single `setHtml()` helper,
  enforced by eslint; `escapeHtml` also escapes single quotes.
- Engine: the Windows export preset is named `Windows` (was a duplicate
  `CustomRonpa`, which broke CLI export selection by name).

### Known gaps

- Android release builds are not produced by CI (requires signing secrets).
- `characterSpotlight`, white-noise debate lines, and the lie-bullet input
  binding remain unimplemented (see ARCHITECTURE.md, Known debt).

[Unreleased]: https://github.com/Saupernova13/freestyle-dangan-trial/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Saupernova13/freestyle-dangan-trial/releases/tag/v1.0.0
