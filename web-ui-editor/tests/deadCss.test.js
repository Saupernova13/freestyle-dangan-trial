// CSS with no markup behind it is invisible debt: it is read on every page
// load, it turns up in every search for a class name, and nothing about it
// says it is dead. 12 of 285 classes were, some of them whole components left
// over from features that were replaced.
//
// No DOM needed; this reads the sources.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

function filesUnder(dir, ext) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...filesUnder(full, ext));
    else if (entry.endsWith(ext)) out.push(full);
  }
  return out;
}

const cssSource = filesUnder(join(root, 'css'), '.css')
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

const markupSource = [
  ...filesUnder(join(root, 'js'), '.js').map((file) => readFileSync(file, 'utf8')),
  readFileSync(join(root, 'index.html'), 'utf8'),
].join('\n');

// Class names built from a template, which no literal search can find. Each
// is verified live: dialogs.js:28 builds `dr-toast--${type}` from
// error/success/warning and an 'info' default; saveStatus.js:11 builds
// `save-status--${status}`. A scan that does not know about these would
// delete the styling for every toast in the editor.
const TEMPLATE_BUILT = [/^dr-toast--/, /^save-status--/];

describe('the stylesheet', () => {
  it('has markup behind every class it styles', () => {
    const declared = new Set();
    const withoutComments = cssSource.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [, name] of withoutComments.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
      declared.add(name);
    }
    expect(declared.size).toBeGreaterThan(200);

    const orphans = [...declared].filter(
      (name) => !markupSource.includes(name) && !TEMPLATE_BUILT.some((re) => re.test(name))
    );
    expect(orphans).toEqual([]);
  });

  it('has not grown back the components that were replaced', () => {
    // Each of these outlived its feature: the character <select> became the
    // searchable dropdown, the three add buttons became the floating one,
    // and .badge-weak had no counterpart in what mass panic renders.
    for (const gone of [
      'theme-toggle',
      'minigame-bar',
      'minigame-id-badge',
      'minigame-id-display',
      'placeholder-content',
      'script-character-select',
      'selection-preview',
      'debate-dialogue-add-btn',
      'logic-dive-add-btn',
      'mass-panic-controls',
      'dr-modal-small',
      'badge-weak',
    ]) {
      expect(cssSource).not.toContain(gone);
    }
  });

  it('still styles the template-built names', () => {
    // The other half of the risk: these look dead to a literal scan and are
    // not. If one disappears, the scan above quietly stops guarding it.
    for (const name of [
      'dr-toast--error',
      'dr-toast--info',
      'dr-toast--success',
      'dr-toast--warning',
      'save-status--saved',
      'save-status--error',
    ]) {
      expect(cssSource).toContain(`.${name}`);
    }
    expect(markupSource).toContain('dr-toast dr-toast--${type}');
    expect(markupSource).toContain('save-status save-status--${status}');
  });
});
