// @vitest-environment jsdom
//
// loadSettings is the second call in DOMContentLoaded and there is no
// window.onerror anywhere, so a throw here used to abort every initialiser
// after it and leave a permanently blank editor - with nothing to suggest that
// clearing one localStorage key fixes it.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_BOUNDS,
  SETTINGS_KEY,
  appSettings,
  loadSettings,
} from '../js/settings.js';

beforeEach(() => {
  localStorage.clear();
  Object.assign(appSettings, DEFAULT_SETTINGS);
});

describe('loadSettings', () => {
  it('reports success and applies a stored value', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ maxSprites: 40 }));
    expect(loadSettings()).toBe(true);
    expect(appSettings.maxSprites).toBe(40);
  });

  it('succeeds with nothing stored', () => {
    expect(loadSettings()).toBe(true);
    expect(appSettings.maxSprites).toBe(DEFAULT_SETTINGS.maxSprites);
  });

  it('survives unparseable JSON instead of throwing', () => {
    localStorage.setItem(SETTINGS_KEY, '{"maxSprites": 25');
    expect(() => loadSettings()).not.toThrow();
    expect(loadSettings()).toBe(false);
    expect(appSettings.maxSprites).toBe(DEFAULT_SETTINGS.maxSprites);
  });

  it('survives JSON that is not an object', () => {
    for (const value of ['null', '42', '"text"', '[1,2,3]']) {
      localStorage.setItem(SETTINGS_KEY, value);
      expect(loadSettings(), value).toBe(false);
      expect(appSettings.maxSprites).toBe(DEFAULT_SETTINGS.maxSprites);
    }
  });

  it('rejects values outside the bounds the dialog enforces', () => {
    // maxSprites is a loop bound with a file read per iteration: 1e9 hangs the
    // browser, and "abc" makes the loop never run so every sprite vanishes.
    for (const bad of [1e9, 0, -5, 'abc', null, NaN, Infinity, { n: 1 }]) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ maxSprites: bad }));
      expect(loadSettings(), String(bad)).toBe(false);
      expect(appSettings.maxSprites).toBe(DEFAULT_SETTINGS.maxSprites);
    }
  });

  it('accepts the exact bounds', () => {
    for (const value of [SETTINGS_BOUNDS.maxSprites.min, SETTINGS_BOUNDS.maxSprites.max]) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ maxSprites: value }));
      expect(loadSettings()).toBe(true);
      expect(appSettings.maxSprites).toBe(value);
    }
  });

  it('ignores keys it does not know rather than adopting them', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ maxSprites: 30, injected: 'x' }));
    expect(loadSettings()).toBe(true);
    expect(appSettings.maxSprites).toBe(30);
    expect(appSettings.injected).toBeUndefined();
  });

  it('starts from the defaults each time, so a bad load cannot inherit the last one', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ maxSprites: 40 }));
    loadSettings();
    localStorage.setItem(SETTINGS_KEY, 'not json');
    expect(loadSettings()).toBe(false);
    expect(appSettings.maxSprites).toBe(DEFAULT_SETTINGS.maxSprites);
  });
});
