# Contributing

Thanks for your interest in improving the Freestyle Danganronpa Trial Creator!
The project has two main components with different workflows.

## Repository layout

| Path                      | Component                              |
| ------------------------- | -------------------------------------- |
| `web-ui-editor/`          | Browser-based trial authoring tool     |
| `freestyle-dangan-trial/` | Godot 4.5 trial engine                 |

## Running all checks

`tools/check.sh` (POSIX / Git Bash) and `tools/check.ps1` (PowerShell) run
everything CI runs: editor lint + tests + build, engine gdlint, headless
import, and the gdUnit4 suites. Steps whose tools are missing are skipped
with a warning, so web-only contributors are not blocked.

Optional but recommended: enable the fast pre-commit hook (eslint/prettier/
gdlint on staged files only):

```bash
git config core.hooksPath .githooks
```

## Web UI (web-ui-editor)

### Setup

```bash
cd web-ui-editor
npm install
npm run dev
```

### Before you open a PR

```bash
npm run check   # lint + tests + build, all must pass
```

### Guidelines

- Read `web-ui-editor/README.md` for the architecture and conventions.
- Shared trial data goes through `state` (`js/core/state.js`) — never add new
  ambient globals.
- Write HTML via `setHtml()` from `js/ui/dom.js` (raw `innerHTML` assignment
  is a lint error) and escape user-entered text with `escapeHtml()`.
- Put pure logic in DOM-free modules and add unit tests in `tests/` (vitest
  runs in a node environment — no DOM).
- Functions referenced by inline `onclick` markup must be exported (the
  `js/main.js` bridge exposes them on `window`).

## Godot engine (freestyle-dangan-trial)

- Open the project in Godot 4.5+ and run with F5.
- GDScript style: gdlint-enforced (see `freestyle-dangan-trial/gdlintrc`);
  tab indentation, snake_case functions/variables, lines up to 120 chars.
- UI belongs in `.tscn` scenes and animations in resource files — scripts only
  bind data and trigger animations.
- Log through the `Log` autoload (`Log.info("Tag", "msg")`), not `print()`.
  `Log.debug/info` are muted in release builds unless `DANGAN_VERBOSE=1`.

### Engine tests (gdUnit4)

Unit tests live in `freestyle-dangan-trial/tests/unit/` and run on gdUnit4
(vendored at `addons/gdUnit4`, currently v6.1.3 — update by replacing the
directory with a newer release tag). Run them with a Godot 4.5 binary:

```powershell
# Windows
$env:GODOT_BIN = "C:\path\to\Godot_v4.5.1-stable_win64_console.exe"
cd freestyle-dangan-trial
.\addons\gdUnit4\runtest.cmd -a res://tests/unit
```

```bash
# Linux/macOS
GODOT_BIN=/path/to/godot bash freestyle-dangan-trial/addons/gdUnit4/runtest.sh -a res://tests/unit
```

## Changing the trial.json format

`schema/trial.schema.json` is the contract between editor and engine — see
"The trial.json contract" in [ARCHITECTURE.md](ARCHITECTURE.md) for the
change workflow. Never change the format on one side only.

## Releases

1. Update `CHANGELOG.md` (move Unreleased into a new version section).
2. `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. The Release workflow builds the single-file editor HTML and attaches it to
   the GitHub release. Engine binaries are not built in CI: the main scene
   depends on the large texture/mesh assets that are gitignored, so a clean
   checkout cannot export it. Export the engine locally from a full checkout
   (`--export-release "Windows"`) if a desktop binary is needed.

## Commit messages

Use [conventional commits](https://www.conventionalcommits.org/):

```
type(scope): short imperative description
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `style`.
Examples:

- `feat(script-editor): add chapter break line type`
- `fix(export): include nested audio folders in .drtrial`

Keep commits focused — one topic per commit.

## Reporting bugs

Open a GitHub issue with:

1. What you did, what you expected, what happened
2. Browser and version (web UI) or Godot version (engine)
3. The browser console output if there was an error
4. A minimal trial folder that reproduces it, when possible

## Questions

Open a GitHub issue or discussion.
