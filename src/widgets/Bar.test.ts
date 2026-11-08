import { describe, expect, it, vi } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { Bar, computeBarFill } from './Bar.js';

describe('computeBarFill', () => {
  it('fills from the minimum to the value in normal mode', () => {
    expect(computeBarFill(0, 100, 25, 0, 'normal')).toEqual({ start: 0, end: 0.25 });
  });

  it('fills from zero in symmetrical mode, in either direction', () => {
    expect(computeBarFill(-100, 100, 50, -100, 'symmetrical')).toEqual({ start: 0.5, end: 0.75 });
    expect(computeBarFill(-100, 100, -50, -100, 'symmetrical')).toEqual({ start: 0.25, end: 0.5 });
  });

  it('clamps the symmetrical origin into a range that excludes zero', () => {
    expect(computeBarFill(10, 110, 60, 10, 'symmetrical')).toEqual({ start: 0, end: 0.5 });
  });

  it('fills between startValue and value in range mode, whichever is larger', () => {
    expect(computeBarFill(0, 100, 80, 20, 'range')).toEqual({ start: 0.2, end: 0.8 });
    expect(computeBarFill(0, 100, 20, 80, 'range')).toEqual({ start: 0.2, end: 0.8 });
  });

  it('clamps out-of-range values and tolerates an empty range', () => {
    expect(computeBarFill(0, 100, 500, 0, 'normal')).toEqual({ start: 0, end: 1 });
    expect(computeBarFill(5, 5, 5, 5, 'normal')).toEqual({ start: 0, end: 0 });
  });
});

describe('Bar', () => {
  it('defaults to 0-100 at the minimum, normal mode, auto orientation', () => {
    const bar = new Bar({ width: 100, height: 10 });
    expect([bar.min, bar.max, bar.value, bar.startValue]).toEqual([0, 100, 0, 0]);
    expect(bar.mode).toBe('normal');
    expect(bar.isVertical).toBe(false);
  });

  it('is vertical when taller than wide unless an orientation is forced', () => {
    expect(new Bar({ width: 10, height: 100 }).isVertical).toBe(true);
    expect(new Bar({ width: 10, height: 100, orientation: 'horizontal' }).isVertical).toBe(false);
    expect(new Bar({ width: 100, height: 10, orientation: 'vertical' }).isVertical).toBe(true);
  });

  it('dispatches valueChanged only when the value actually changes', () => {
    const bar = new Bar({ width: 100, height: 10 });
    const listener = vi.fn();
    bar.addEventListener('valueChanged', listener);
    bar.setValue(40);
    bar.setValue(40);
    bar.setValue(40, 10);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(bar.startValue).toBe(10);
  });

  it('paints the indicator over the filled share of a horizontal track', () => {
    const context = createFakeCanvasContext();
    const bar = new Bar({
      x: 10,
      y: 20,
      width: 200,
      height: 10,
      value: 50,
      indicatorStyle: { base: { bgColor: '#00ff00' } },
    });
    bar.render(context);
    // Track background is a rounded fill, then the indicator: 2 fills.
    expect(context.fill).toHaveBeenCalledTimes(2);
    expect(context.fillStyle).toBe('#00ff00');
  });

  it('paints only the track when the fill is empty', () => {
    const context = createFakeCanvasContext();
    new Bar({ width: 200, height: 10, value: 0 }).render(context);
    expect(context.fill).toHaveBeenCalledTimes(1);
  });
});
