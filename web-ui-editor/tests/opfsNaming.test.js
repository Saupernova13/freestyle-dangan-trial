// Directories keyed on a display name need collision handling: two entities
// can share a name, and the second one taking the first one's folder silently
// overwrites its contents. That is exactly what happened to a second cast
// member called "John Smith" - character.json and every sprite gone, both ids
// still in trial.json, and the first slot empty on reopen.
import { describe, expect, it } from 'vitest';
import { uniqueDirectoryName } from '../js/core/opfs.js';

function parentWith(names) {
  return {
    entries: () => names.map((n) => [n, { kind: 'directory' }])[Symbol.iterator](),
  };
}

describe('uniqueDirectoryName', () => {
  it('keeps the preferred name when nothing holds it', async () => {
    expect(await uniqueDirectoryName(parentWith(['Alice_Smith']), 'John_Smith')).toBe('John_Smith');
  });

  it('suffixes on a collision', async () => {
    expect(await uniqueDirectoryName(parentWith(['John_Smith']), 'John_Smith')).toBe(
      'John_Smith_2'
    );
  });

  it('keeps counting past an existing suffix', async () => {
    const taken = ['John_Smith', 'John_Smith_2', 'John_Smith_3'];
    expect(await uniqueDirectoryName(parentWith(taken), 'John_Smith')).toBe('John_Smith_4');
  });

  it('ignores files that happen to share the name', async () => {
    const parent = {
      entries: () =>
        [
          ['John_Smith', { kind: 'file' }],
          ['Alice_Smith', { kind: 'directory' }],
        ][Symbol.iterator](),
    };
    expect(await uniqueDirectoryName(parent, 'John_Smith')).toBe('John_Smith');
  });

  it('works on an empty parent', async () => {
    expect(await uniqueDirectoryName(parentWith([]), 'John_Smith')).toBe('John_Smith');
  });
});
