# Trial Editor (Web UI)

Browser-based authoring tool for custom Danganronpa-style trials. Build a cast,
write the trial script, configure minigames and truth bullets, then export a
playable `.drtrial` file for the Godot engine.

## Requirements

- Node.js 18+ (for the dev server and build)
- A modern browser. There are two storage backends, chosen automatically:
  - **Chromium (Chrome, Edge, Opera):** edit a trial folder **on disk** via the
    [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API);
    changes save in place.
  - **Firefox / Safari (and Chromium too):** store trials in **browser storage**
    via the [Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system).
    These browsers don't implement the on-disk folder picker, so trials move in
    and out with **Export** (download a `.drtrial`) and **Import** (load one back).

Browser-storage trials live inside the browser/origin and aren't visible in your
OS file manager — use Export to get a portable `.drtrial`, and Import to bring it
into another browser or machine.

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
├── main.js                 # Entry point: imports every module, then boots
├── app.js                  # Script editor view
├── core/
│   ├── constants.js        # Cast slot + enum label + format version constants
│   ├── state.js            # Central mutable state (the only shared state)
│   ├── storage.js          # File System Access API persistence
│   ├── trialAssets.js      # Reading sprites, profiles, images and audio off disk
│   ├── history.js          # Undo/redo snapshot stack (Ctrl+Z / Ctrl+Y)
│   ├── trialSchema.js      # trial.json validator (mirrors schema/trial.schema.json)
│   ├── trialSerialize.js   # state -> trial.json object assembly
│   ├── listOps.js          # Shared list reorder/drag helpers
│   └── minigameAudio.js    # Minigame voice-line file storage + the audio slot walk
├── export.js               # .drtrial (ZIP) packaging
├── settings.js             # App settings modal + localStorage persistence
├── utils.js                # Pure helpers (escaping, highlight normalization)
├── ui/                     # Theme, inline SVG icons, themed dialogs/toasts,
│                           #   save-status indicator, modal + a11y behaviors,
│                           #   actions.js (delegated events), options.js (<option>)
├── components/             # Floating add button, sprite magnifier,
│                           #   shared audio preview, character search dropdown
├── models/                 # Character helpers + the character field table
├── views/                  # One module per view + one per minigame editor;
│                           #   minigames/ also holds the shared drag-reorder
│                           #   and voice-line field
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
- **Rendered markup names its behaviour in `data-on-<event>`**, and one
  delegated listener per event type dispatches it (`js/ui/actions.js`). A
  control's arguments travel in escaped `data-*` attributes and are read from
  `element.dataset`; a form control's value is read from the element. Register
  handlers with `registerActions('click', { ... })` in the module that owns
  them. Nothing is put on `window`, and no trial-derived value ever reaches an
  executable string. Two rules replace inline `event.stopPropagation()`: the
  innermost element claiming an event handles it, and `data-stop-<event>` lets
  an element claim one and do nothing.
- **Write HTML through `setHtml()`** (`js/ui/dom.js`) — raw `innerHTML`
  assignment is an eslint error — and **escape user text** with `escapeHtml()`
  whenever interpolating it into HTML attributes or content.
- **State mutations are undoable for free.** Anything that persists through
  `scheduleAutoSave()`/`autoSaveTrial()` is recorded by `core/history.js`;
  no per-feature undo wiring is needed.
- **trial.json shape changes go through the schema.** See "The trial.json
  contract" in the repo-root ARCHITECTURE.md before touching
  `trialSchema.js`, `trialSerialize.js`, or the format version.
- **Pure logic belongs in `utils.js`** (or another DOM-free module) so it can
  be unit tested. Test files live in `tests/`.

## Deliberately not changed

Recorded so these do not get "cleaned up" by a later pass. Each was reviewed
and rejected on merit, not missed.

- **A unified, data-driven minigame editor.** The card bodies genuinely
  differ: a dialogue line is a three-part sentence plus a bullet answer plus
  three collapsibles; a scrum argument is a two-column opposition/defense pair
  with keyword textareas; a logic dive question is a text field plus a two-to-
  five radio list. A schema expressive enough for all three would be harder to
  read than the three explicit renderers, and every new minigame type would
  fight it. The duplication was in the chrome, and that is what got extracted:
  the drag-reorder, the voice line field, the option builder, the card CSS.
- **A generic minigame-CRUD wrapper.** `const mg = findMinigame(gameId); if
  (!mg) return;` appears dozens of times, as does
  `renderMinigameDetails(); autoSaveTrial();`. The guards genuinely differ -
  some check `typeSpecific`, some the list, some both - several are async, and
  some deliberately skip the re-render. Parameterising makes each call site
  longer than the four lines it replaces.
- **Restructuring debate scrum's `opposition*`/`defense*` field pairs** into a
  nested `{ opposition, defense }`. It would delete four
  `if (side === 'opposition')` branches, but those names are in `trial.json`,
  in `trialSerialize.js`, in the audio slot walk, and in the engine. That is a
  schema migration for one file's readability.
- **Renaming `app.js` to `views/scriptView.js`.** It is the only view outside
  `views/`, which is why several modules import from `'../app.js'`. The
  bootstrap it also held moved to `main.js`; the rename on its own is motion,
  and it would bury a future real change under a path churn across five
  importers.
- **Merging the two sprite grids** (`characterModal.js` and
  `scriptLine/spriteTab.js`). Superficially similar; one uploads and one
  selects.
- **`hangmansGambitEditor.js` is not copy-paste debt.** It is small because
  the feature is small - one scalar, no ids, no ordering.

## Worth keeping as it is

- **`normalizeHighlights` in `utils.js`** paints a per-character colour map and
  re-emits runs, so overlapping, stale and out-of-bounds ranges cannot survive
  the function. That is making illegal states unrepresentable in plain JS, and
  it is the model to follow.
- **`dropAtGap` in `core/listOps.js`** - the index adjustment is correct for
  multi-select drags in both directions, and the NUL-joined comparison that
  detects a real reorder is deliberate.
- **`ui/dialogs.js`** escaping, **`views/viewManager.js`** hub rendering,
  **`modals/characterModal.js`** edit buffering, and the cross-repo version
  note in **`core/constants.js`**.
- **`ui/actions.js` reports a duplicate action name** rather than letting the
  last registration silently win - the same guard `main.js`'s old `window`
  bridge carried, kept when the bridge went.

## Trial data format

Trials are folders containing `trial.json`, `Characters/`, `Audio/`, and
`TruthBullets/`. See the repository root README for the full schema. The
"Export to Playable File" button zips the folder into a `.drtrial` file after
sanitizing highlight data.
