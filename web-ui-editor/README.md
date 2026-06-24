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

| Command                | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Dev server with hot reload                         |
| `npm test`             | Run unit tests (Vitest)                            |
| `npm run lint`         | Lint all source (ESLint)                           |
| `npm run format`       | Format source (Prettier)                           |
| `npm run build`        | Production build to `dist/`                        |
| `npm run build:single` | Self-contained single-file `dist/index.html`       |
| `npm run check`        | Lint + tests + build (run this before a PR)        |

`npm run build:single` produces one HTML file with all JS/CSS inlined — handy
for sharing the editor with non-technical users. If the browser refuses the
folder picker when opened via double-click, serve it over HTTP instead.

## Architecture

The editor is intentionally framework-free: plain ES modules, template-string
rendering, and a single shared state object.

```
js/
├── main.js                 # Entry point; bridges handlers onto window
├── app.js                  # Script editor view + app initialization
├── core/
│   ├── constants.js        # Cast slot + minigame label constants
│   ├── state.js            # Central mutable state (the only shared state)
│   ├── storage.js          # File System Access API persistence
│   ├── listOps.js          # Shared list reorder/drag helpers
│   └── minigameAudio.js    # Minigame voice-line file storage
├── export.js               # .drtrial (ZIP) packaging
├── settings.js             # App settings modal + localStorage persistence
├── utils.js                # Pure helpers (escaping, highlight normalization)
├── ui/                     # Theme, inline SVG icons, themed dialogs/toasts,
│                           #   save-status indicator, modal + a11y behaviors
├── components/             # Floating add button, sprite magnifier,
│                           #   shared audio preview, character search dropdown
├── models/                 # Character helpers
├── views/                  # One module per view + one per minigame editor
└── modals/
    ├── characterModal.js
    ├── truthBulletModal.js
    ├── modalCoordinator.js
    ├── scriptLineModal.js  # Coordinator: shell, lifecycle, save
    └── scriptLine/         # One module per modal tab (sprite, audio, box
                            #   style, camera, effects, highlighting) + state
```

CSS mirrors this: `css/styles.css` is an `@import` index that defines the
cascade, with one partial per section under `css/{base,layout,components,views}`.

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
