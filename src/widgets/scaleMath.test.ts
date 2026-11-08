import { describe, expect, it } from 'vitest';
import {
  computeScaleTicks,
  isRoundMode,
  layoutScaleTick,
  scaleAngle,
  scaleRadius,
  type ScaleGeometry,
} from './scaleMath.js';

const BASE: ScaleGeometry = {
  mode: 'horizontalBottom',
  width: 100,
  height: 50,
  angleRange: 270,
  rotation: 135,
  fontSize: 10,
  labelGap: 4,
  majorTickLength: 12,
};

describe('computeScaleTicks', () => {
  it('spaces ticks evenly with a major tick every n-th, labelled by value', () => {
    const ticks = computeScaleTicks(0, 100, 11, 5);
    expect(ticks).toHaveLength(11);
    expect(ticks.filter((tick) => tick.major).map((tick) => tick.index)).toEqual([0, 5, 10]);
    expect(ticks.filter((tick) => tick.major).map((tick) => tick.label)).toEqual([
      '0',
      '50',
      '100',
    ]);
    expect(ticks[3]?.value).toBe(30);
    expect(ticks[3]?.ratio).toBeCloseTo(0.3);
  });

  it('labels major ticks from a custom list and gives minor ticks no label', () => {
    const ticks = computeScaleTicks(0, 100, 6, 5, ['low', 'high']);
    expect(ticks[0]?.label).toBe('low');
    expect(ticks[5]?.label).toBe('high');
    expect(ticks[2]?.label).toBeUndefined();
  });

  it('rounds value labels to integers', () => {
    const ticks = computeScaleTicks(0, 10, 4, 1);
    expect(ticks.map((tick) => tick.label)).toEqual(['0', '3', '7', '10']);
  });

  it('handles a single tick, no ticks, and no major ticks', () => {
    expect(computeScaleTicks(0, 100, 1, 1)).toHaveLength(1);
    expect(computeScaleTicks(0, 100, 1, 1)[0]?.ratio).toBe(0);
    expect(computeScaleTicks(0, 100, 0, 1)).toEqual([]);
    expect(computeScaleTicks(0, 100, 5, 0).some((tick) => tick.major)).toBe(false);
  });
});

describe('layoutScaleTick', () => {
  it('draws a horizontal-bottom scale along the top edge, ticks and labels below', () => {
    const layout = layoutScaleTick(BASE, 0.5, 12);
    expect([layout.x1, layout.y1, layout.x2, layout.y2]).toEqual([50, 1, 50, 13]);
    expect([layout.labelX, layout.labelY]).toEqual([50, 17]);
    expect([layout.labelAlign, layout.labelBaseline]).toEqual(['center', 'top']);
  });

  it('draws a horizontal-top scale along the bottom edge, ticks and labels above', () => {
    const layout = layoutScaleTick({ ...BASE, mode: 'horizontalTop' }, 1, 12);
    expect([layout.x1, layout.y1, layout.x2, layout.y2]).toEqual([100, 49, 100, 37]);
    expect([layout.labelY, layout.labelBaseline]).toEqual([33, 'bottom']);
  });

  it('runs vertical scales from min at the bottom to max at the top', () => {
    const left = layoutScaleTick({ ...BASE, mode: 'verticalLeft' }, 0, 12);
    expect([left.x1, left.y1, left.x2]).toEqual([99, 50, 87]);
    expect([left.labelX, left.labelAlign]).toEqual([83, 'right']);

    const right = layoutScaleTick({ ...BASE, mode: 'verticalRight' }, 1, 12);
    expect([right.x1, right.y1, right.x2]).toEqual([1, 0, 13]);
    expect([right.labelX, right.labelAlign]).toEqual([17, 'left']);
  });

  it('places round ticks on the arc at the right angle, inward for roundInner', () => {
    const geometry: ScaleGeometry = {
      ...BASE,
      mode: 'roundInner',
      width: 100,
      height: 100,
      rotation: 0,
    };
    const start = layoutScaleTick(geometry, 0, 10);
    // Angle 0 is straight right: on the arc at x = 50 + 49, ticks pointing back toward the center.
    expect(start.x1).toBeCloseTo(99);
    expect(start.y1).toBeCloseTo(50);
    expect(start.x2).toBeCloseTo(89);
    expect(start.labelX).toBeLessThan(start.x2);
  });

  it('points roundOuter ticks away from the center and pulls the arc in', () => {
    const geometry: ScaleGeometry = {
      ...BASE,
      mode: 'roundOuter',
      width: 100,
      height: 100,
      rotation: 0,
    };
    const tick = layoutScaleTick(geometry, 0, 10);
    expect(tick.x2).toBeGreaterThan(tick.x1);
    expect(tick.labelX).toBeGreaterThan(tick.x2);
    expect(scaleRadius(geometry)).toBeLessThan(scaleRadius({ ...geometry, mode: 'roundInner' }));
  });

  it('reports the angle for a ratio and which modes are round', () => {
    expect(scaleAngle(BASE, 0)).toBe(135);
    expect(scaleAngle(BASE, 1)).toBe(405);
    expect(isRoundMode('roundInner')).toBe(true);
    expect(isRoundMode('verticalLeft')).toBe(false);
  });
});
