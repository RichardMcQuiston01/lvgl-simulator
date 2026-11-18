import { describe, expect, it, vi } from 'vitest';
import { createAnimationEngine } from '../animation/Animation.js';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import { Roller, type RollerOptions } from './Roller.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

/** The clock rollers measure drag speed with; tests move it to make a drag slow or fast. */
const clock = { time: 0 };

function roller(options: Partial<RollerOptions> = {}): Roller {
  return new Roller({
    width: 100,
    height: 90,
    options: MONTHS,
    now: () => clock.time,
    ...options,
  });
}

/** A slow drag from `fromY` to `toY` followed by a release, so it settles without throwing. */
function drag(target: Roller, fromY: number, toY: number): void {
  target.dispatchEvent('pressed');
  target.handlePointerPosition(50, fromY);
  clock.time += 1000;
  target.handlePointerPosition(50, toY);
  target.dispatchEvent('released');
}

describe('Roller selection', () => {
  it('starts on the first option, or the one asked for', () => {
    expect(roller().selectedIndex).toBe(0);
    expect(roller().selectedText).toBe('Jan');
    expect(roller({ selected: 3 }).selectedText).toBe('Apr');
  });

  it('keeps the initial selection within the options', () => {
    expect(roller({ selected: 99 }).selectedIndex).toBe(7);
    expect(roller({ selected: -4 }).selectedIndex).toBe(0);
  });

  it('has no selected text without options', () => {
    expect(roller({ options: [] }).selectedText).toBeUndefined();
  });

  it('sizes rows from the visible row count', () => {
    expect(roller().rowHeight).toBe(30);
    expect(roller({ visibleRows: 5 }).rowHeight).toBe(18);
  });

  it('replaces the options with setOptions', () => {
    const target = roller({ selected: 5 });
    target.setOptions(['a', 'b'], 1);
    expect(target.options).toEqual(['a', 'b']);
    expect(target.selectedText).toBe('b');
  });

  it('selects directly with setSelected and fires valueChanged once', () => {
    const target = roller();
    const listener = vi.fn();
    target.addEventListener('valueChanged', listener);
    target.setSelected(4);
    target.setSelected(4);
    expect(target.selectedText).toBe('May');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps setSelected within the options unless infinite', () => {
    const target = roller();
    target.setSelected(50);
    expect(target.selectedIndex).toBe(7);
    target.setSelected(-3);
    expect(target.selectedIndex).toBe(0);
  });
});

describe('Roller keys', () => {
  it('moves one option per arrow key and reports each change', () => {
    const target = roller();
    const listener = vi.fn();
    target.addEventListener('valueChanged', listener);
    target.dispatchEvent('key', { key: 'ArrowDown' });
    target.dispatchEvent('key', { key: 'ArrowDown' });
    target.dispatchEvent('key', { key: 'ArrowUp' });
    expect(target.selectedText).toBe('Feb');
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('stops at the ends without an event', () => {
    const target = roller();
    const listener = vi.fn();
    target.addEventListener('valueChanged', listener);
    target.dispatchEvent('key', { key: 'ArrowUp' });
    expect(target.selectedIndex).toBe(0);
    expect(listener).not.toHaveBeenCalled();
  });

  it('wraps when infinite', () => {
    const target = roller({ infinite: true });
    target.dispatchEvent('key', { key: 'ArrowUp' });
    expect(target.selectedText).toBe('Aug');
    target.dispatchEvent('key', { key: 'ArrowDown' });
    expect(target.selectedText).toBe('Jan');
  });
});

describe('Roller dragging', () => {
  it('follows the pointer, so dragging up moves to later options', () => {
    const target = roller();
    target.dispatchEvent('pressed');
    target.handlePointerPosition(50, 80);
    target.handlePointerPosition(50, 20);
    expect(target.position).toBeCloseTo(2);
  });

  it('settles on the nearest row when released, and reports the change', () => {
    const target = roller();
    const listener = vi.fn();
    target.addEventListener('valueChanged', listener);
    drag(target, 80, 35);
    expect(target.position).toBe(2);
    expect(target.selectedText).toBe('Mar');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not run past the ends', () => {
    const target = roller();
    drag(target, 10, 80);
    expect(target.selectedIndex).toBe(0);
    drag(target, 80, -400);
    expect(target.selectedIndex).toBe(7);
  });

  it('keeps rolling after a quick flick', () => {
    clock.time = 0;
    const target = roller();
    target.dispatchEvent('pressed');
    target.handlePointerPosition(50, 80);
    clock.time += 10;
    target.handlePointerPosition(50, 50);
    clock.time += 10;
    target.handlePointerPosition(50, 20);
    target.dispatchEvent('released');
    expect(target.selectedIndex).toBeGreaterThan(2);
  });

  it('does not throw when the pointer rested before release', () => {
    clock.time = 0;
    const target = roller();
    target.dispatchEvent('pressed');
    target.handlePointerPosition(50, 80);
    clock.time += 10;
    target.handlePointerPosition(50, 50);
    clock.time += 10;
    target.handlePointerPosition(50, 35);
    clock.time += 500;
    target.dispatchEvent('released');
    // 45px up is 1.5 rows; with no flick it rounds to 2 rather than coasting on.
    expect(target.selectedIndex).toBe(2);
  });

  it('selects the tapped row when the pointer barely moves', () => {
    const target = roller();
    target.dispatchEvent('pressed');
    target.handlePointerPosition(50, 75);
    target.dispatchEvent('released');
    // Row height 30, centre at y 45: y 75 is one row below the centre.
    expect(target.selectedIndex).toBe(1);
  });

  it('ignores a release that never saw a pointer position', () => {
    const target = roller({ selected: 2 });
    target.dispatchEvent('released');
    expect(target.selectedIndex).toBe(2);
  });

  it('keeps an infinite roller turning past the ends and wraps its position', () => {
    const target = roller({ infinite: true });
    drag(target, 10, 70);
    expect(target.selectedIndex).toBe(6);
    expect(target.position).toBe(6);
  });
});

describe('Roller animation', () => {
  it('eases to its resting row and reports the change only once it arrives', () => {
    let now = 0;
    const animations = createAnimationEngine({ now: () => now, scheduler: null });
    const target = roller({ animations });
    const listener = vi.fn();
    target.addEventListener('valueChanged', listener);
    drag(target, 80, 35);
    expect(listener).not.toHaveBeenCalled();
    now = 60;
    animations.tick(now);
    expect(target.position).toBeGreaterThan(1.5);
    expect(target.position).toBeLessThan(2);
    now = 1000;
    animations.tick(now);
    expect(target.position).toBe(2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stops an animation in progress when pressed again', () => {
    let now = 0;
    const animations = createAnimationEngine({ now: () => now, scheduler: null });
    const target = roller({ animations });
    target.setSelected(5, true);
    now = 50;
    animations.tick(now);
    const midway = target.position;
    target.dispatchEvent('pressed');
    now = 1000;
    animations.tick(now);
    expect(target.position).toBe(midway);
  });

  it('takes the short way round an infinite roller', () => {
    const target = roller({ infinite: true });
    target.setSelected(7);
    expect(target.selectedIndex).toBe(7);
    expect(target.position).toBe(7);
  });
});

describe('Roller painting', () => {
  it('paints the visible options, then the centre option again in the selected band', () => {
    const target = roller({ selected: 3 });
    const context = createFakeCanvasContext();
    target.render(context);
    const labels = vi.mocked(context.fillText).mock.calls.map((call) => call[0]);
    // The three visible rows plus a partly visible one each side, drawn twice (drum, then band).
    expect(labels.slice(0, 5)).toEqual(['Feb', 'Mar', 'Apr', 'May', 'Jun']);
    expect(labels.slice(5)).toEqual(['Feb', 'Mar', 'Apr', 'May', 'Jun']);
  });

  it('draws the selected band in the primary color with on-primary text', () => {
    const target = roller();
    const context = createFakeCanvasContext();
    const textColors: string[] = [];
    vi.mocked(context.fillText).mockImplementation(() => {
      textColors.push(String(context.fillStyle));
    });
    target.render(context);
    expect(textColors[0]).toBe(defaultTheme.textColor);
    expect(textColors.at(-1)).toBe(defaultTheme.textColorOnPrimary);
  });

  it('shows one row fewer at the first option, as nothing precedes it', () => {
    const target = roller();
    const context = createFakeCanvasContext();
    target.render(context);
    const labels = vi.mocked(context.fillText).mock.calls.map((call) => call[0]);
    expect(labels.slice(0, 2)).toEqual(['Jan', 'Feb']);
  });

  it('wraps rows around the ends when infinite', () => {
    const target = roller({ infinite: true });
    const context = createFakeCanvasContext();
    target.render(context);
    const labels = vi.mocked(context.fillText).mock.calls.map((call) => call[0]);
    expect(labels.slice(0, 5)).toEqual(['Jul', 'Aug', 'Jan', 'Feb', 'Mar']);
  });
});
