# Trial Editor (Web UI)

Browser-based authoring tool for custom Danganronpa-style trials. Build a cast,
write the trial script, configure minigames and truth bullets, then export a
playable `.drtrial` file for the Godot engine.

## Requirements

- Node.js 18+ (for the dev server and build)
- A Chromium-based browser (Chrome, Edge, Opera). The editor saves trials
  directly to a folder on disk via the
  [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API),
  which Firefox and Safari do not implement.

## Getting started

```bash
npm install
npm run dev      # start the dev server (prints a local URL)
```

To produce a static build (deployable to any static host):

```bash
npm run build    # outputs to dist/
npm run preview  # serve the build locally
```

## Development workflow

| Command                | Purpose                              |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Dev server with hot reload           |
| `npm test`             | Run unit tests (Vitest)              |
| `npm run lint`         | Lint all source (ESLint)             |
| `npm run format`       | Format source (Prettier)             |
| `npm run build`        | Production build to `dist/`          |

Run `npm run lint` and `npm test` before opening a pull request.

## Architecture

The editor is intentionally framework-free: plain ES modules, template-string
rendering, and a single shared state object.

```
js/
├── main.js                 # Entry point; bridges handlers onto window
├── app.js                  # Script editor view + app initialization
├── core/
│   ├── constants.js        # Cast slot constants
│   ├── state.js            # Central mutable state (the only shared state)
│   └── storage.js          # File System Access API persistence
├── export.js               # .drtrial (ZIP) packaging
├── settings.js             # App settings modal + localStorage persistence
├── utils.js                # Pure helpers (escaping, highlight normalization)
├── ui/theme.js             # Dark/light theme
├── components/             # Floating add button, sprite magnifier
├── models/                 # Character helpers
├── views/                  # One module per view + minigame editors
└── modals/                 # Character / truth bullet / script line modals
```

Conventions:

- **All shared trial data lives in `state` (`js/core/state.js`).** Modules
  import it explicitly; there are no ambient globals. UI-local state (open
  modal, drag in progress) stays module-local.
- **Rendered markup uses inline `onclick` handlers**, which resolve through
  `window`. `js/main.js` bridges every exported function onto `window`; if you
  add a handler referenced from markup, export it from its module.
- **Escape user text** with `escapeHtml()` whenever interpolating it into
  HTML attributes or content.
- **Pure logic belongs in `utils.js`** (or another DOM-free module) so it can
  be unit tested. Test files live in `tests/`.

## Trial data format

Trials are folders containing `trial.json`, `Characters/`, `Audio/`, and
`TruthBullets/`. See the repository root README for the full schema. The
"Export to Playable File" button zips the folder into a `.drtrial` file after
sanitizing highlight data.
