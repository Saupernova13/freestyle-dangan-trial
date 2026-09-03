// @vitest-environment jsdom
//
// The three minigame editors held character-for-character identical copies of
// the same five drag handlers, under three prefixes they were forced to invent
// because main.js bridges every export onto one `window`. Nothing covered
// them, and the wiring is inline handler strings resolved at runtime, so a
// wrong name fails silently at drag time rather than at build time.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const readSource = (file) => readFileSync(resolve(here, '..', file), 'utf8');

vi.mock('../js/core/storage.js', () => ({
  autoSaveTrial: vi.fn(),
}));
vi.mock('../js/core/trialAssets.js', () => ({
  loadRemainingSprites: vi.fn(),
}));
vi.mock('../js/views/minigameView.js', () => ({
  findMinigame: (gameId) => globalThis.__mg && globalThis.__mg.gameId === gameId ? globalThis.__mg : null,
  renderMinigameDetails: vi.fn(),
}));

const {
  handleListDragStart,
  handleListDragEnd,
  handleListDropInGap,
  handleListGapDragOver,
  handleListGapDragLeave,
  resetDragState,
} = await import('../js/views/minigames/listDragReorder.js');

function dragEvent(target) {
  return {
    target,
    currentTarget: target,
    dataTransfer: {},
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}

function minigame(listKey, ids) {
  return {
    gameId: 'g1',
    typeSpecific: { [listKey]: ids.map((id, order) => ({ lineId: id, order })) },
  };
}

function ids(mg, listKey) {
  return mg.typeSpecific[listKey].map((item) => item.lineId);
}

beforeEach(() => {
  document.body.innerHTML = '';
  resetDragState();
  globalThis.__mg = null;
});

describe('drag-to-reorder inside a minigame editor', () => {
  it('moves the dragged item to the gap it was dropped in', () => {
    const mg = minigame('dialogueLines', ['a', 'b', 'c']);
    globalThis.__mg = mg;
    const card = document.createElement('div');

    handleListDragStart(dragEvent(card), 'dialogueLines', 'lineId', 'a');
    handleListDropInGap(dragEvent(card), 'g1', 'dialogueLines', 3);

    expect(ids(mg, 'dialogueLines')).toEqual(['b', 'c', 'a']);
  });

  it('ignores a drop into a list the drag did not start in', () => {
    // The three separate handler names used to give this by accident. One
    // shared handler has to state it, or a drop would move an item between
    // two lists that hold different shapes.
    const mg = minigame('dialogueLines', ['a', 'b']);
    mg.typeSpecific.questions = [{ lineId: 'q1', order: 0 }];
    globalThis.__mg = mg;
    const card = document.createElement('div');

    handleListDragStart(dragEvent(card), 'dialogueLines', 'lineId', 'a');
    handleListDropInGap(dragEvent(card), 'g1', 'questions', 0);

    expect(ids(mg, 'dialogueLines')).toEqual(['a', 'b']);
    expect(ids(mg, 'questions')).toEqual(['q1']);
  });

  it('ignores a drop with no drag in flight', () => {
    const mg = minigame('dialogueLines', ['a', 'b']);
    globalThis.__mg = mg;
    handleListDropInGap(dragEvent(document.createElement('div')), 'g1', 'dialogueLines', 0);
    expect(ids(mg, 'dialogueLines')).toEqual(['a', 'b']);
  });

  it('survives a minigame that no longer holds the list', () => {
    // The editor re-renders between drag and drop, and a delete in another
    // tab can land in between.
    globalThis.__mg = { gameId: 'g1', typeSpecific: {} };
    const card = document.createElement('div');
    handleListDragStart(dragEvent(card), 'dialogueLines', 'lineId', 'a');
    expect(() =>
      handleListDropInGap(dragEvent(card), 'g1', 'dialogueLines', 0)
    ).not.toThrow();
  });

  it('clears the drag state after a drop, so the next gap hover cannot move it again', () => {
    const mg = minigame('dialogueLines', ['a', 'b', 'c']);
    globalThis.__mg = mg;
    const card = document.createElement('div');

    handleListDragStart(dragEvent(card), 'dialogueLines', 'lineId', 'a');
    handleListDropInGap(dragEvent(card), 'g1', 'dialogueLines', 3);
    handleListDropInGap(dragEvent(card), 'g1', 'dialogueLines', 0);

    expect(ids(mg, 'dialogueLines')).toEqual(['b', 'c', 'a']);
  });

  it('marks and unmarks the gap under the pointer', () => {
    const gap = document.createElement('div');
    const over = dragEvent(gap);
    handleListGapDragOver(over);
    expect(over.preventDefault).toHaveBeenCalled(); // or the drop never fires
    expect(gap.classList.contains('drag-over-gap')).toBe(true);
    handleListGapDragLeave(dragEvent(gap));
    expect(gap.classList.contains('drag-over-gap')).toBe(false);
  });

  it('clears every highlighted gap when the drag ends anywhere', () => {
    document.body.innerHTML =
      '<div class="drag-over-gap"></div><div class="drag-over-gap"></div>';
    const card = document.createElement('div');
    card.classList.add('dragging');
    handleListDragEnd(dragEvent(card));
    expect(document.querySelectorAll('.drag-over-gap')).toHaveLength(0);
    expect(card.classList.contains('dragging')).toBe(false);
  });
});

describe('the inline wiring', () => {
  const EDITORS = [
    'js/views/minigames/nonstopDebateEditor.js',
    'js/views/minigames/debateScrumEditor.js',
    'js/views/minigames/logicDiveEditor.js',
  ];

  it('names a handler that exists for every drag attribute in all three editors', () => {
    // The names live in strings, so nothing else in the toolchain checks them.
    const exported = new Set([
      'listDragStart',
      'listDragEnd',
      'listDropInGap',
      'listGapDragOver',
      'listGapDragLeave',
    ]);
    for (const file of EDITORS) {
      const source = readSource(file);
      const used = [...source.matchAll(/data-on-drag\w*="(\w+)"|data-on-drop="(\w+)"/g)].map(
        (m) => m[1] || m[2]
      );
      expect(used.length).toBeGreaterThan(0);
      for (const name of used) expect(exported.has(name)).toBe(true);
    }
  });

  it('names the list each drop belongs to', () => {
    // A drop that named the wrong list would silently do nothing, which reads
    // as "drag is broken" rather than as a typo.
    const lists = {
      'js/views/minigames/nonstopDebateEditor.js': 'dialogueLines',
      'js/views/minigames/debateScrumEditor.js': 'arguments',
      'js/views/minigames/logicDiveEditor.js': 'questions',
    };
    for (const [file, listKey] of Object.entries(lists)) {
      const source = readSource(file);
      const keys = [...source.matchAll(/data-list-key="(\w+)"/g)].map((m) => m[1]);
      expect(keys.length).toBeGreaterThan(0);
      for (const named of keys) expect(named).toBe(listKey);
    }
  });

  it('carries no inline drag attribute at all', () => {
    for (const file of EDITORS) {
      expect(readSource(file)).not.toMatch(/ ondrag\w*=|( ondrop=)/);
    }
  });
});

describe('the card styling', () => {
  const CSS = 'css/views/minigames/editor-cards.css';

  it('defines every reorder class the three editors emit', () => {
    const css = readSource(CSS);
    const used = new Set();
    for (const file of [
      'js/views/minigames/nonstopDebateEditor.js',
      'js/views/minigames/debateScrumEditor.js',
      'js/views/minigames/logicDiveEditor.js',
    ]) {
      for (const [, cls] of readSource(file).matchAll(/class="(reorder-[\w-]+)"/g)) {
        used.add(cls);
      }
    }
    expect(used.size).toBeGreaterThan(0);
    for (const cls of used) expect(css).toContain(`.${cls} `);
  });

  it('fades the dragged item in all three lists', () => {
    // Scrum and dive had the rule; nonstop debate's wrapper had no CSS at all,
    // so dragging a dialogue line gave no feedback that anything was moving.
    const css = readSource(CSS);
    expect(css).toContain('.reorder-wrapper.dragging');
    expect(css).toContain('.dialogue-line-wrapper.dragging');
  });

  it('leaves no per-editor copy of the card body behind', () => {
    for (const file of [
      'css/views/minigames/debate-scrum.css',
      'css/views/minigames/logic-dive.css',
      'css/views/minigames/mass-panic.css',
    ]) {
      const css = readSource(file);
      for (const gone of [
        '.debate-argument-card',
        '.argument-header',
        '.argument-drag-handle',
        '.argument-number',
        '.logic-dive-question-card',
        '.question-header',
        '.question-drag-handle',
        '.question-number',
        '.mass-panic-group-card {',
      ]) {
        expect(css).not.toContain(gone);
      }
    }
  });
});
