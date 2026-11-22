import { describe, expect, it } from 'vitest';
import {
  activeIndexAt,
  tabIndicatorRect,
  tabButtonRects,
  tabviewLayout,
  type TabPosition,
} from './tabviewMath.js';

describe('tabviewLayout', () => {
  it('puts a top bar above the pages', () => {
    expect(tabviewLayout(300, 200, 'top', 40)).toEqual({
      bar: { x: 0, y: 0, width: 300, height: 40 },
      content: { x: 0, y: 40, width: 300, height: 160 },
    });
  });

  it('puts a bottom bar below the pages', () => {
    expect(tabviewLayout(300, 200, 'bottom', 40)).toEqual({
      bar: { x: 0, y: 160, width: 300, height: 40 },
      content: { x: 0, y: 0, width: 300, height: 160 },
    });
  });

  it('puts a left bar beside the pages', () => {
    expect(tabviewLayout(300, 200, 'left', 80)).toEqual({
      bar: { x: 0, y: 0, width: 80, height: 200 },
      content: { x: 80, y: 0, width: 220, height: 200 },
    });
  });

  it('puts a right bar beside the pages', () => {
    expect(tabviewLayout(300, 200, 'right', 80)).toEqual({
      bar: { x: 220, y: 0, width: 80, height: 200 },
      content: { x: 0, y: 0, width: 220, height: 200 },
    });
  });

  it('keeps the bar within the tab view', () => {
    expect(tabviewLayout(300, 30, 'top', 40).content.height).toBe(0);
    expect(tabviewLayout(300, 200, 'top', -5).bar.height).toBe(0);
  });
});

describe('tabButtonRects', () => {
  it('shares a horizontal bar equally', () => {
    const bar = { x: 0, y: 0, width: 300, height: 40 };
    expect(tabButtonRects(bar, 'top', 3)).toEqual([
      { x: 0, y: 0, width: 100, height: 40 },
      { x: 100, y: 0, width: 100, height: 40 },
      { x: 200, y: 0, width: 100, height: 40 },
    ]);
  });

  it('stacks buttons down a vertical bar', () => {
    const bar = { x: 220, y: 0, width: 80, height: 200 };
    expect(tabButtonRects(bar, 'right', 2)).toEqual([
      { x: 220, y: 0, width: 80, height: 100 },
      { x: 220, y: 100, width: 80, height: 100 },
    ]);
  });

  it('has no buttons without tabs', () => {
    expect(tabButtonRects({ x: 0, y: 0, width: 10, height: 10 }, 'top', 0)).toEqual([]);
  });
});

describe('tabIndicatorRect', () => {
  const button = { x: 100, y: 0, width: 100, height: 40 };
  it.each([
    ['top', { x: 100, y: 37, width: 100, height: 3 }],
    ['bottom', { x: 100, y: 0, width: 100, height: 3 }],
    ['left', { x: 197, y: 0, width: 3, height: 40 }],
    ['right', { x: 100, y: 0, width: 3, height: 40 }],
  ] as [TabPosition, object][])(
    'sits on the edge facing the pages for a %s bar',
    (position, expected) => {
      expect(tabIndicatorRect(button, position, 3)).toEqual(expected);
    },
  );
});

describe('activeIndexAt', () => {
  it('picks the nearest page', () => {
    expect(activeIndexAt(0, 300, 3)).toBe(0);
    expect(activeIndexAt(140, 300, 3)).toBe(0);
    expect(activeIndexAt(160, 300, 3)).toBe(1);
    expect(activeIndexAt(600, 300, 3)).toBe(2);
  });

  it('stays within the pages', () => {
    expect(activeIndexAt(-50, 300, 3)).toBe(0);
    expect(activeIndexAt(5000, 300, 3)).toBe(2);
  });

  it('is 0 with no pages or no width', () => {
    expect(activeIndexAt(100, 300, 0)).toBe(0);
    expect(activeIndexAt(100, 0, 3)).toBe(0);
  });
});
