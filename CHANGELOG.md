# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Trial file format versions (`metadata.version` in `trial.json`) are tracked
separately in `schema/trial.schema.json`.

## [Unreleased]

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
