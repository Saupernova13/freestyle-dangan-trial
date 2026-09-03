// Two failure modes this stylesheet actually had.
//
// One: the focus ring - three declarations, byte for byte - written out in six
// partials, because the token system had shadows and radii but nothing for
// focus. Changing the ring meant finding all six.
//
// Two: a second `.script-line-bar { transition: ... }` 824 lines below the
// first, uncommented, silently overriding it. A reader at the first rule had
// no way to know the value they were reading was not the one in effect.
//
// No DOM needed; this reads the sources.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

function cssFiles(dir = join(root, 'css')) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...cssFiles(full));
    else if (entry.endsWith('.css')) out.push(full);
  }
  return out;
}

const files = cssFiles().map((path) => ({
  name: relative(root, path).replace(/\\/g, '/'),
  source: readFileSync(path, 'utf8'),
}));

const allCss = files.map((f) => f.source).join('\n');

// Strips comments and the contents of at-rule blocks, leaving the top-level
// rules. A media override repeating a selector is the point of a media query.
function topLevelRules(source) {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const rules = [];
  let i = 0;
  while (i < withoutComments.length) {
    const open = withoutComments.indexOf('{', i);
    if (open === -1) break;
    const selector = withoutComments.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < withoutComments.length && depth > 0) {
      if (withoutComments[j] === '{') depth += 1;
      else if (withoutComments[j] === '}') depth -= 1;
      j += 1;
    }
    if (!selector.startsWith('@')) {
      rules.push({
        selector: selector.split(/\s+/).join(' '),
        line: withoutComments.slice(0, open).split('\n').length,
      });
    }
    i = j;
  }
  return rules;
}

describe('the focus ring', () => {
  it('is a token', () => {
    const tokens = files.find((f) => f.name.endsWith('base/tokens.css'));
    expect(tokens.source).toContain('--focus-ring:');
  });

  it('is never spelled out again', () => {
    // Everywhere but the one line that defines it.
    for (const file of files) {
      if (file.name.endsWith('base/tokens.css')) continue;
      expect(file.source).not.toContain('0 0 0 2px rgba(var(--primary-rgb), 0.15)');
    }
  });

  it('is what every focused text control wears', () => {
    // Six sites, five partials. A seventh control that invents its own ring
    // is the drift this closes.
    const uses = allCss.match(/box-shadow: var\(--focus-ring\);/g) || [];
    expect(uses.length).toBeGreaterThanOrEqual(6);
  });
});

describe('a selector declared twice in one file', () => {
  it('is always within sight of its other half', () => {
    // Two legitimate cases exist - a growable-textarea block and the sprite
    // magnifier's cursor - and both sit within twenty lines of the rule they
    // extend, with a comment saying why. The hazard is the far-away repeat:
    // the reader of the first rule cannot see that it is being overridden.
    const NEARBY_LINES = 40;
    const distant = [];
    for (const file of files) {
      const byselector = new Map();
      for (const rule of topLevelRules(file.source)) {
        const previous = byselector.get(rule.selector);
        if (previous !== undefined && rule.line - previous > NEARBY_LINES) {
          distant.push(`${file.name}: "${rule.selector}" at ${previous} and again at ${rule.line}`);
        }
        byselector.set(rule.selector, rule.line);
      }
    }
    expect(distant).toEqual([]);
  });
});

describe('the two script line buttons', () => {
  it('share one body', () => {
    // Same button with a different hover. The body was written out twice,
    // 445 lines apart.
    const scriptEditor = files.find((f) => f.name.endsWith('script-editor.css'));
    expect(scriptEditor.source).toContain('.script-line-edit,\n.script-line-delete {');
    // ...and never again as a rule of its own.
    expect(scriptEditor.source).not.toContain('\n\n.script-line-delete {');
  });
});
