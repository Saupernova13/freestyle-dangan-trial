import { describe, it, expect } from 'vitest';
import { reindexOrder, moveItem, dropAtGap } from '../js/core/listOps.js';

const make = (...ids) => ids.map((id, i) => ({ id, order: i }));
const idsOf = (list) => list.map((item) => item.id);
const ordersOf = (list) => list.map((item) => item.order);

describe('reindexOrder', () => {
  it('rewrites order fields to match positions', () => {
    const list = [
      { id: 'a', order: 7 },
      { id: 'b', order: 0 },
    ];
    reindexOrder(list);
    expect(ordersOf(list)).toEqual([0, 1]);
  });
});

describe('moveItem', () => {
  it('moves an item up', () => {
    const list = make('a', 'b', 'c');
    expect(moveItem(list, 'id', 'b', -1)).toBe(true);
    expect(idsOf(list)).toEqual(['b', 'a', 'c']);
    expect(ordersOf(list)).toEqual([0, 1, 2]);
  });

  it('moves an item down', () => {
    const list = make('a', 'b', 'c');
    expect(moveItem(list, 'id', 'b', 1)).toBe(true);
    expect(idsOf(list)).toEqual(['a', 'c', 'b']);
  });

  it('refuses to move past either end', () => {
    const list = make('a', 'b');
    expect(moveItem(list, 'id', 'a', -1)).toBe(false);
    expect(moveItem(list, 'id', 'b', 1)).toBe(false);
    expect(idsOf(list)).toEqual(['a', 'b']);
  });

  it('returns false for unknown ids', () => {
    const list = make('a', 'b');
    expect(moveItem(list, 'id', 'zzz', 1)).toBe(false);
  });
});

describe('dropAtGap', () => {
  it('moves a single item forward', () => {
    const list = make('a', 'b', 'c', 'd');
    expect(dropAtGap(list, 'id', ['a'], 3)).toBe(true);
    expect(idsOf(list)).toEqual(['b', 'c', 'a', 'd']);
    expect(ordersOf(list)).toEqual([0, 1, 2, 3]);
  });

  it('moves a single item backward', () => {
    const list = make('a', 'b', 'c', 'd');
    expect(dropAtGap(list, 'id', ['d'], 1)).toBe(true);
    expect(idsOf(list)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('dropping into an adjacent gap is a no-op', () => {
    const list = make('a', 'b', 'c');
    expect(dropAtGap(list, 'id', ['b'], 1)).toBe(false);
    expect(dropAtGap(list, 'id', ['b'], 2)).toBe(false);
    expect(idsOf(list)).toEqual(['a', 'b', 'c']);
  });

  it('moves a contiguous multi-selection', () => {
    const list = make('a', 'b', 'c', 'd', 'e');
    expect(dropAtGap(list, 'id', ['b', 'c'], 5)).toBe(true);
    expect(idsOf(list)).toEqual(['a', 'd', 'e', 'b', 'c']);
  });

  it('moves a non-contiguous multi-selection, preserving drag order', () => {
    const list = make('a', 'b', 'c', 'd', 'e');
    expect(dropAtGap(list, 'id', ['b', 'd'], 0)).toBe(true);
    expect(idsOf(list)).toEqual(['b', 'd', 'a', 'c', 'e']);
  });

  it('ignores unknown ids and returns false when nothing matches', () => {
    const list = make('a', 'b');
    expect(dropAtGap(list, 'id', ['zzz'], 0)).toBe(false);
    expect(idsOf(list)).toEqual(['a', 'b']);
  });

  it('works with custom id keys', () => {
    const list = [
      { lineId: 'x', order: 0 },
      { lineId: 'y', order: 1 },
    ];
    expect(dropAtGap(list, 'lineId', ['y'], 0)).toBe(true);
    expect(list.map((l) => l.lineId)).toEqual(['y', 'x']);
  });
});
