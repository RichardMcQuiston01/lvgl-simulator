import { describe, expect, it } from 'vitest';
import { LvObject } from '../core/LvObject';
import { applyGridLayout } from './grid';

function cell(
  options: {
    readonly gridColumn?: number;
    readonly gridRow?: number;
    readonly gridColumnSpan?: number;
    readonly gridRowSpan?: number;
  } = {},
): LvObject {
  return new LvObject({ width: 0, height: 0, ...options });
}

describe('applyGridLayout', () => {
  it('auto-places children in row-major order across the given tracks', () => {
    const a = cell();
    const b = cell();
    const c = cell();

    applyGridLayout([a, b, c], 0, 0, { type: 'grid', columns: [50, 50], rows: [30, 30] });

    expect([a.x, a.y]).toEqual([0, 0]);
    expect([b.x, b.y]).toEqual([50, 0]);
    expect([c.x, c.y]).toEqual([0, 30]);
  });

  it('sizes each child to its track', () => {
    const a = cell();

    applyGridLayout([a], 0, 0, { type: 'grid', columns: [40, 60], rows: [20] });

    expect(a.width).toBe(40);
    expect(a.height).toBe(20);
  });

  it('honors explicit column/row placement', () => {
    const a = cell({ gridColumn: 1, gridRow: 0 });

    applyGridLayout([a], 0, 0, { type: 'grid', columns: [40, 60], rows: [20] });

    expect(a.x).toBe(40);
    expect(a.y).toBe(0);
    expect(a.width).toBe(60);
  });

  it('spans multiple tracks, including the gap between them', () => {
    const a = cell({ gridColumnSpan: 2 });

    applyGridLayout([a], 0, 0, { type: 'grid', columns: [40, 60], rows: [20], columnGap: 10 });

    expect(a.width).toBe(40 + 10 + 60);
  });

  it('offsets later tracks by the gap', () => {
    const a = cell();
    const b = cell({ gridColumn: 1 });

    applyGridLayout([a, b], 0, 0, { type: 'grid', columns: [40, 60], rows: [20], columnGap: 10 });

    expect(b.x).toBe(50);
  });

  it('does not advance the auto-placement cursor for explicitly placed children', () => {
    const explicit = cell({ gridColumn: 1, gridRow: 1 });
    const autoA = cell();
    const autoB = cell();

    applyGridLayout([explicit, autoA, autoB], 0, 0, {
      type: 'grid',
      columns: [10, 10],
      rows: [10, 10],
    });

    expect([autoA.x, autoA.y]).toEqual([0, 0]);
    expect([autoB.x, autoB.y]).toEqual([10, 0]);
  });
});
