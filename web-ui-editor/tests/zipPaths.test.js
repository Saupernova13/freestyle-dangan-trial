// A .drtrial is a shared file, so every entry name in it is attacker-controlled
// and every path is untrusted input.
import { describe, expect, it } from 'vitest';
import { safeZipPathParts, zipRootPrefix } from '../js/core/zipPaths.js';

describe('zipRootPrefix', () => {
  it('is empty when trial.json is already at the root', () => {
    expect(zipRootPrefix(['trial.json', 'Characters/A/character.json'])).toBe('');
  });

  it('finds the wrapper folder a third-party zip adds', () => {
    // Written verbatim there is no root trial.json, so the trial opens empty
    // and the next edit saves over it - after a success toast.
    const paths = ['MyTrial/trial.json', 'MyTrial/Characters/A/character.json'];
    expect(zipRootPrefix(paths)).toBe('MyTrial/');
  });

  it('handles a nested wrapper', () => {
    expect(zipRootPrefix(['a/b/trial.json', 'a/b/Audio/x.mp3'])).toBe('a/b/');
  });

  it('prefers the shallowest trial.json over a nested copy', () => {
    expect(zipRootPrefix(['trial.json', 'Backup/old/trial.json'])).toBe('');
    expect(zipRootPrefix(['Backup/old/trial.json', 'Wrap/trial.json'])).toBe('Wrap/');
  });

  it('is empty when there is no trial.json at all', () => {
    expect(zipRootPrefix(['notes.txt'])).toBe('');
    expect(zipRootPrefix([])).toBe('');
    expect(zipRootPrefix(undefined)).toBe('');
  });

  it('does not match a file merely ending in trial.json', () => {
    expect(zipRootPrefix(['old_trial.json'])).toBe('');
  });
});

describe('safeZipPathParts', () => {
  it('splits an ordinary path', () => {
    expect(safeZipPathParts('Characters/A/character.json')).toEqual([
      'Characters',
      'A',
      'character.json',
    ]);
  });

  it('drops empty and "." segments', () => {
    expect(safeZipPathParts('Audio//./line.mp3')).toEqual(['Audio', 'line.mp3']);
  });

  it('refuses a traversal segment', () => {
    // OPFS resolves ".." like any other path, so this escapes the trial folder.
    expect(safeZipPathParts('../escaped.txt')).toBeNull();
    expect(safeZipPathParts('Characters/../../escaped.txt')).toBeNull();
  });

  it('refuses an absolute path, a drive letter and a backslash', () => {
    expect(safeZipPathParts('/etc/passwd')).toBeNull();
    expect(safeZipPathParts('C:/Windows/system32')).toBeNull();
    expect(safeZipPathParts('..' + '\\' + 'escaped.txt')).toBeNull();
  });

  it('refuses an empty or non-string path', () => {
    expect(safeZipPathParts('')).toBeNull();
    expect(safeZipPathParts(null)).toBeNull();
    expect(safeZipPathParts(42)).toBeNull();
  });

  it('refuses a path that is nothing but separators', () => {
    // Caught by the leading-slash rule before the split.
    expect(safeZipPathParts('///')).toBeNull();
  });

  it('yields no components for a bare directory entry', () => {
    // Directory entries are filtered out before this, but an empty result must
    // not become a file write.
    expect(safeZipPathParts('Audio/')).toEqual(['Audio']);
  });
});
