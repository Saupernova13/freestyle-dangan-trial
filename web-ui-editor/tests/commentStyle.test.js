// Two conventions this repo settled on, kept from drifting back.
//
// Section banners: 22 heavy `// ==== Title ====` rules lived in the four
// minigame editors and nowhere else in 58 files, while ui/icons.js used a
// light `// --- actions ---` form. The light form won - it still marks the
// sections in the long editors without a rule of equals signs.
//
// ASCII in comments: an em dash reads fine in a UI string and badly in a
// terminal, a diff, or an editor with the wrong encoding. Display text keeps
// its typography; comments do not.
//
// No DOM needed; this reads the sources.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

function jsFiles(dir = join(root, 'js')) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...jsFiles(full));
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = jsFiles().map((path) => ({
  name: relative(root, path).replace(/\\/g, '/'),
  lines: readFileSync(path, 'utf8').split('\n'),
}));

describe('comment style', () => {
  it('has files to check', () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it('marks sections with the light rule, not a bar of equals signs', () => {
    const heavy = [];
    for (const file of files) {
      file.lines.forEach((line, i) => {
        if (/\/\/ ={4,}/.test(line)) heavy.push(`${file.name}:${i + 1}`);
      });
    }
    expect(heavy).toEqual([]);
  });

  it('keeps comments to ASCII', () => {
    // Only whole-line comments: a trailing comment on a line of markup would
    // pick up the display text beside it, which is allowed its typography.
    const nonAscii = [];
    for (const file of files) {
      file.lines.forEach((line, i) => {
        if (!line.trimStart().startsWith('//')) return;
        if ([...line].some((c) => c.charCodeAt(0) > 126)) {
          nonAscii.push(`${file.name}:${i + 1} ${line.trim().slice(0, 60)}`);
        }
      });
    }
    expect(nonAscii).toEqual([]);
  });

  it('writes block comments as // lines', () => {
    // One /** */ existed and it was not JSDoc - no @param, no @returns - so
    // it was a second comment syntax for nothing.
    const jsdoc = files.filter((file) => file.lines.some((line) => line.includes('/**')));
    expect(jsdoc.map((f) => f.name)).toEqual([]);
  });
});
