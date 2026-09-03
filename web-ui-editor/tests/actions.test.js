// @vitest-environment jsdom
//
// The editor wired 190 controls with inline `onclick="deleteThing('${id}')"`
// attributes. Two costs: a trial-derived id sat inside an executable string,
// so the render sites were safe only while the id validation gate held (the
// browser decodes entities before evaluating, so escaping does not help), and
// every handler had to live on `window` for an inline attribute to reach it.
//
// The replacement is one delegated listener per event type. The failure mode
// it introduces is a control that names an action nobody registered - which
// looks like a button that does nothing, with no error anywhere. The last
// test here is the tripwire for exactly that, across every file at once.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerActions, registeredActions } from '../js/ui/actions.js';

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

describe('delegated actions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('calls the handler the element names, with the element', () => {
    const seen = [];
    registerActions('click', { testPlain: (el) => seen.push(el.dataset.thingId) });
    document.body.innerHTML = '<button data-on-click="testPlain" data-thing-id="t1"></button>';
    document.querySelector('button').click();
    expect(seen).toEqual(['t1']);
  });

  it('finds the action on an ancestor of what was clicked', () => {
    // Buttons contain icon spans, and the click lands on the span.
    const seen = [];
    registerActions('click', { testAncestor: (el) => seen.push(el.dataset.thingId) });
    document.body.innerHTML =
      '<button data-on-click="testAncestor" data-thing-id="t2"><span id="icon"></span></button>';
    document.getElementById('icon').click();
    expect(seen).toEqual(['t2']);
  });

  it('lets the innermost element claim the event', () => {
    // A row that selects itself, holding a delete button. Without this the
    // delete would also select the row - which is what the inline
    // `event.stopPropagation()` calls used to prevent by hand.
    const seen = [];
    registerActions('click', {
      testOuter: () => seen.push('outer'),
      testInner: () => seen.push('inner'),
    });
    document.body.innerHTML =
      '<div data-on-click="testOuter"><button data-on-click="testInner"></button></div>';
    document.querySelector('button').click();
    expect(seen).toEqual(['inner']);
  });

  it('lets an element claim an event and do nothing with it', () => {
    // A textarea inside a clickable row: typing in it must not select the row.
    const seen = [];
    registerActions('click', { testStopOuter: () => seen.push('outer') });
    document.body.innerHTML =
      '<div data-on-click="testStopOuter"><textarea data-stop-click></textarea></div>';
    document.querySelector('textarea').click();
    expect(seen).toEqual([]);
  });

  it('passes the event through for a handler that needs it', () => {
    let received = null;
    registerActions('click', { testEvent: (el, event) => (received = event) });
    document.body.innerHTML = '<button data-on-click="testEvent"></button>';
    document.querySelector('button').click();
    expect(received.type).toBe('click');
  });

  it('reads a form control by value, not by an interpolated argument', () => {
    const seen = [];
    registerActions('change', { testValue: (el) => seen.push([el.dataset.fieldId, el.value]) });
    document.body.innerHTML =
      '<select data-on-change="testValue" data-field-id="f1"><option value="a"></option><option value="b"></option></select>';
    const select = document.querySelector('select');
    select.value = 'b';
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(seen).toEqual([['f1', 'b']]);
  });

  it('ignores an element with no action', () => {
    document.body.innerHTML = '<button id="plain"></button>';
    expect(() => document.getElementById('plain').click()).not.toThrow();
  });

  it('says so loudly when an element names an action nobody registered', () => {
    // Otherwise this is a button that silently does nothing.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.body.innerHTML = '<button data-on-click="noSuchActionExists"></button>';
    document.querySelector('button').click();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('noSuchActionExists'));
    error.mockRestore();
  });

  it('keeps values out of executable strings entirely', () => {
    // The point of the exercise: an id that would break out of an inline
    // handler is inert in a data attribute.
    const seen = [];
    registerActions('click', { testHostile: (el) => seen.push(el.dataset.thingId) });
    const hostile = `'); alert('x`;
    const div = document.createElement('div');
    div.innerHTML = `<button data-on-click="testHostile" data-thing-id="${hostile
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')}"></button>`;
    document.body.appendChild(div);
    div.querySelector('button').click();
    expect(seen).toEqual([hostile]);
  });
});

describe('the wiring across the editor', () => {
  it('registers every action the markup names', async () => {
    // Import everything, the way main.js does, so every registerActions call
    // has run. Then read the names out of the generated markup and check each
    // one exists. A typo here is otherwise a dead control.
    const files = jsFiles();
    for (const file of files) {
      if (file.endsWith(join('js', 'main.js'))) continue;
      await import(/* @vite-ignore */ `../${relative(root, file).replace(/\\/g, '/')}`);
    }

    const registered = registeredActions();
    const missing = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const [, eventType, action] of source.matchAll(/data-on-(\w+)="(\w[\w-]*)"/g)) {
        if (!registered.has(`${eventType}:${action}`)) {
          missing.push(`${relative(root, file).replace(/\\/g, '/')}: ${eventType}:${action}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
