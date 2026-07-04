# Contributing

Thanks for your interest in improving the Freestyle Danganronpa Trial Creator!
The project has two main components with different workflows.

## Repository layout

| Path                      | Component                              |
| ------------------------- | -------------------------------------- |
| `web-ui-editor/`          | Browser-based trial authoring tool     |
| `freestyle-dangan-trial/` | Godot 4.5 trial engine                 |

## Web UI (web-ui-editor)

### Setup

```bash
cd web-ui-editor
npm install
npm run dev
```

### Before you open a PR

```bash
npm run lint    # must pass with no errors
npm test        # must pass
npm run build   # must succeed
```

### Guidelines

- Read `web-ui-editor/README.md` for the architecture and conventions.
- Shared trial data goes through `state` (`js/core/state.js`) — never add new
  ambient globals.
- Escape user-entered text with `escapeHtml()` before putting it in markup.
- Put pure logic in DOM-free modules and add unit tests in `tests/`.
- Functions referenced by inline `onclick` markup must be exported (the
  `js/main.js` bridge exposes them on `window`).

## Godot engine (freestyle-dangan-trial)

- Open the project in Godot 4.5+ and run with F5.
- GDScript style: 4-space indentation, snake_case functions/variables.
- UI belongs in `.tscn` scenes and animations in resource files — scripts only
  bind data and trigger animations.

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
