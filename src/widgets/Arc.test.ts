import { describe, expect, it, vi } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { Arc } from './Arc.js';
import {
  arcRatio,
  arcSweep,
  computeArcIndicator,
  normalizeDegrees,
  pointerAngle,
  valueFromAngle,
} from './arcMath.js';

describe('arcMath', () => {
  it('normalizes angles into [0, 360)', () => {
    expect(normalizeDegrees(-90)).toBe(270);
    expect(normalizeDegrees(450)).toBe(90);
    expect(normalizeDegrees(360)).toBe(0);
  });

  it('computes the clockwise sweep, treating equal angles as a full circle', () => {
    expect(arcSweep(135, 45)).toBe(270);
    expect(arcSweep(10, 20)).toBe(10);
    expect(arcSweep(350, 10)).toBe(20);
    expect(arcSweep(0, 360)).toBe(360);
    expect(arcSweep(45, 45)).toBe(360);
  });

  it('clamps the value ratio and tolerates an empty range', () => {
    expect(arcRatio(0, 100, 25)).toBe(0.25);
    expect(arcRatio(0, 100, 500)).toBe(1);
    expect(arcRatio(3, 3, 3)).toBe(0);
  });

  it('computes the indicator span per mode', () => {
    expect(computeArcIndicator(0, 100, 50, 'normal', 135, 270)).toEqual({ start: 135, end: 270 });
    expect(computeArcIndicator(0, 100, 50, 'reverse', 135, 270)).toEqual({ start: 270, end: 405 });
    expect(computeArcIndicator(0, 100, 75, 'symmetrical', 135, 270)).toEqual({
      start: 270,
      end: 337.5,
    });
    expect(computeArcIndicator(0, 100, 25, 'symmetrical', 135, 270)).toEqual({
      start: 202.5,
      end: 270,
    });
  });

  it('measures the pointer angle clockwise from 3 o-clock', () => {
    expect(pointerAngle(1, 0)).toBe(0);
    expect(pointerAngle(0, 1)).toBe(90);
    expect(pointerAngle(-1, 0)).toBe(180);
    expect(pointerAngle(0, -1)).toBe(270);
  });

  it('maps an angle to a value, pinning the gap to the nearer end', () => {
    expect(valueFromAngle(135, 135, 270, 0, 100)).toBe(0);
    expect(valueFromAngle(270, 135, 270, 0, 100)).toBe(50);
    expect(valueFromAngle(60, 135, 270, 0, 100)).toBe(100);
    expect(valueFromAngle(120, 135, 270, 0, 100)).toBe(0);
  });
});

describe('Arc', () => {
  it('defaults to a 270 degree dial with range 0-100 at the minimum', () => {
    const arc = new Arc({ width: 100, height: 100 });
    expect([arc.min, arc.max, arc.value]).toEqual([0, 100, 0]);
    expect([arc.bgStartAngle, arc.bgEndAngle, arc.sweep]).toEqual([135, 45, 270]);
  });

  it('sets the value from a pointer position and dispatches valueChanged once', () => {
    const arc = new Arc({ width: 100, height: 100 });
    const listener = vi.fn();
    arc.addEventListener('valueChanged', listener);

    arc.handlePointerPosition(50, 0); // straight up, the middle of the arc
    expect(arc.value).toBe(50);
    arc.handlePointerPosition(50, 0);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('accounts for rotation when reading the pointer', () => {
    const arc = new Arc({ width: 100, height: 100, rotation: 90 });
    arc.handlePointerPosition(50, 0);
    // Straight up is now 180 degrees into the unrotated arc: 45 / 270 of the way.
    expect(arc.value).toBeCloseTo((45 / 270) * 100);
  });

  it('paints the background arc, the indicator, and the knob', () => {
    const context = createFakeCanvasContext();
    new Arc({ width: 100, height: 100, value: 50 }).render(context);
    // background + indicator strokes, plus the knob circle's own arc path.
    expect(context.arc).toHaveBeenCalledTimes(3);
    expect(context.stroke).toHaveBeenCalledTimes(2);
  });

  it('skips the indicator when the value is at the minimum', () => {
    const context = createFakeCanvasContext();
    new Arc({ width: 100, height: 100, value: 0 }).render(context);
    expect(context.stroke).toHaveBeenCalledTimes(1);
  });

  it('uses round caps unless arcRounded is false', () => {
    const rounded = createFakeCanvasContext();
    new Arc({ width: 100, height: 100, value: 50 }).render(rounded);
    expect(rounded.lineCap).toBe('round');

    const flat = createFakeCanvasContext();
    new Arc({
      width: 100,
      height: 100,
      value: 50,
      style: { base: { arcRounded: false } },
      indicatorStyle: { base: { arcRounded: false } },
    }).render(flat);
    expect(flat.lineCap).toBe('butt');
  });
});
