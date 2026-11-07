import { describe, expect, it, vi } from 'vitest';
import { LvObject } from '../core/LvObject.js';
import { Container } from '../widgets/Container.js';
import { createAnimationEngine } from '../animation/Animation.js';
import { hitTest } from '../interaction/hitTest.js';
import { attachInteraction } from '../interaction/InteractionController.js';
import { createFakeCanvas } from '../testing/fakeCanvas.js';
import { applyScrollSnap, computeScrollRange, findScrollTarget } from './scrollMath.js';

function createList(itemCount: number, itemHeight = 40): { list: LvObject; items: LvObject[] } {
  const list = new LvObject({ width: 100, height: 100 });
  const items: LvObject[] = [];
  for (let i = 0; i < itemCount; i += 1) {
    const item = new LvObject({ y: i * itemHeight, width: 100, height: itemHeight });
    list.addChild(item);
    items.push(item);
  }
  return { list, items };
}

function fakeContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillRect: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    arcTo: vi.fn(),
    closePath: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('computeScrollRange', () => {
  it('is empty when the content fits', () => {
    const { list } = createList(2);
    expect(computeScrollRange(list)).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
    expect(list.isScrollable).toBe(false);
  });

  it('spans the overflow plus the padding a layout applies', () => {
    const list = new Container({
      width: 100,
      height: 100,
      padding: 10,
      layout: { type: 'flex', direction: 'column' },
    });
    for (let i = 0; i < 5; i += 1) {
      list.addChild(new LvObject({ width: 80, height: 40 }));
    }
    list.render(fakeContext());
    // 10 top pad + 5 * 40 + 10 bottom pad - 100 viewport
    expect(computeScrollRange(list).maxY).toBe(120);
  });

  it('ignores padding for manually positioned children', () => {
    const { list } = createList(5);
    list.style = { base: { padBottom: 10 } };
    expect(computeScrollRange(list).maxY).toBe(100);
  });

  it('respects scrollable=false and scrollDirection', () => {
    const { list } = createList(5);
    list.scrollDirection = 'horizontal';
    expect(computeScrollRange(list).maxY).toBe(0);
    list.scrollDirection = 'all';
    list.scrollable = false;
    expect(computeScrollRange(list).maxY).toBe(0);
  });

  it('ignores hidden and floating children', () => {
    const { list, items } = createList(5);
    items[4]!.hidden = true;
    items[3]!.floating = true;
    expect(computeScrollRange(list).maxY).toBe(120 - 100);
  });
});

describe('scrollTo / scrollBy / scrollToView', () => {
  it('clamps, dispatches scroll, and shifts child positions', () => {
    const { list, items } = createList(5);
    const scroll = vi.fn();
    list.addEventListener('scroll', scroll);

    expect(list.scrollBy(0, 30)).toBe(true);
    expect(list.scrollY).toBe(30);
    expect(items[0]!.getAbsolutePosition().y).toBe(-30);
    expect(list.scrollTo(0, 9999)).toBe(true);
    expect(list.scrollY).toBe(100);
    expect(list.scrollTo(0, 9999)).toBe(false);
    expect(scroll).toHaveBeenCalledTimes(2);
  });

  it('scrollToView reveals a child with the minimum movement', () => {
    const { list, items } = createList(5);
    list.scrollToView(items[4]!);
    expect(list.scrollY).toBe(100);
    list.scrollToView(items[0]!);
    expect(list.scrollY).toBe(0);
  });
});

describe('rendering and hit testing', () => {
  it('clips children and draws a scrollbar only when content overflows', () => {
    const { list } = createList(5);
    const overflowing = fakeContext();
    list.render(overflowing);
    expect(overflowing.clip).toHaveBeenCalledTimes(1);
    expect(overflowing.fill).toHaveBeenCalled();

    const { list: fits } = createList(2);
    const quiet = fakeContext();
    fits.render(quiet);
    expect(quiet.clip).not.toHaveBeenCalled();
  });

  it('hides the scrollbar when mode is off, and in active mode until scrolling', () => {
    const { list } = createList(5);
    list.scrollbarMode = 'off';
    const off = fakeContext();
    list.render(off);
    expect(off.fill).not.toHaveBeenCalled();

    list.scrollbarMode = 'active';
    const idle = fakeContext();
    list.render(idle);
    expect(idle.fill).not.toHaveBeenCalled();
    list.scrolling = true;
    const active = fakeContext();
    list.render(active);
    expect(active.fill).toHaveBeenCalled();
  });

  it('does not hit content scrolled outside the container', () => {
    const screen = new LvObject({ width: 200, height: 200 });
    const { list, items } = createList(5);
    screen.addChild(list);
    list.scrollTo(0, 100);
    expect(hitTest(screen, 10, 10)).toBe(items[2]);
    expect(hitTest(screen, 10, 150)).toBe(screen);
  });
});

describe('scroll snap and chaining', () => {
  it('snaps a landing offset to the nearest child start', () => {
    const { list } = createList(5);
    list.scrollSnapY = 'start';
    expect(applyScrollSnap(list, 0, 57).y).toBe(40);
    expect(applyScrollSnap(list, 0, 75).y).toBe(80);
    expect(applyScrollSnap(list, 0, 500).y).toBe(100);
  });

  it('findScrollTarget chains to a parent when the child is at its edge', () => {
    const outer = new LvObject({ width: 100, height: 100 });
    const inner = new LvObject({ width: 100, height: 100 });
    outer.addChild(inner);
    inner.addChild(new LvObject({ y: 0, width: 100, height: 150 }));
    outer.addChild(new LvObject({ y: 100, width: 100, height: 100 }));
    expect(findScrollTarget(inner, 0, 10)).toBe(inner);
    inner.scrollTo(0, 50);
    expect(findScrollTarget(inner, 0, 10)).toBe(outer);
    expect(findScrollTarget(inner, 0, -10)).toBe(inner);
  });
});

describe('pointer and wheel scrolling', () => {
  function setup(withAnimations = false): {
    canvas: ReturnType<typeof createFakeCanvas>;
    list: LvObject;
    items: LvObject[];
    time: { now: number };
    engine: ReturnType<typeof createAnimationEngine>;
  } {
    const canvas = createFakeCanvas();
    const screen = new LvObject({ width: 200, height: 200 });
    const { list, items } = createList(5);
    screen.addChild(list);
    const time = { now: 0 };
    const engine = createAnimationEngine({ now: () => time.now, scheduler: null });
    attachInteraction(canvas, screen, vi.fn(), withAnimations ? { animations: engine } : {});
    return { canvas, list, items, time, engine };
  }

  it('drags the content, abandoning the press and the click', () => {
    const { canvas, list, items } = setup();
    const pressLost = vi.fn();
    const clicked = vi.fn();
    const scrollBegin = vi.fn();
    const scrollEnd = vi.fn();
    items[2]!.addEventListener('pressLost', pressLost);
    items[2]!.addEventListener('clicked', clicked);
    list.addEventListener('scrollBegin', scrollBegin);
    list.addEventListener('scrollEnd', scrollEnd);

    canvas.dispatch('pointerdown', { pointerId: 1, offsetX: 50, offsetY: 80, timeStamp: 0 });
    canvas.dispatch('pointermove', { pointerId: 1, offsetX: 50, offsetY: 50, timeStamp: 100 });
    expect(list.scrollY).toBe(30);
    expect(list.scrolling).toBe(true);
    canvas.dispatch('pointerup', { pointerId: 1, offsetX: 50, offsetY: 50, timeStamp: 3000 });

    expect(scrollBegin).toHaveBeenCalledTimes(1);
    expect(scrollEnd).toHaveBeenCalledTimes(1);
    expect(pressLost).toHaveBeenCalledTimes(1);
    expect(clicked).not.toHaveBeenCalled();
    expect(list.scrolling).toBe(false);
  });

  it('coasts after a fast release when an animation engine is provided', () => {
    const { canvas, list, time, engine } = setup(true);
    canvas.dispatch('pointerdown', { pointerId: 1, offsetX: 50, offsetY: 90, timeStamp: 0 });
    canvas.dispatch('pointermove', { pointerId: 1, offsetX: 50, offsetY: 70, timeStamp: 10 });
    canvas.dispatch('pointermove', { pointerId: 1, offsetX: 50, offsetY: 50, timeStamp: 20 });
    canvas.dispatch('pointerup', { pointerId: 1, offsetX: 50, offsetY: 50, timeStamp: 20 });
    const releasedAt = list.scrollY;
    expect(list.scrolling).toBe(true);

    time.now = 2000;
    engine.tick(time.now);
    expect(list.scrollY).toBeGreaterThan(releasedAt);
    expect(list.scrollY).toBeLessThanOrEqual(100);
    expect(list.scrolling).toBe(false);
  });

  it('scrolls on wheel events and prevents the default only when it consumes them', () => {
    const { canvas, list } = setup();
    const preventDefault = vi.fn();
    canvas.dispatch('wheel', {
      offsetX: 50,
      offsetY: 50,
      deltaX: 0,
      deltaY: 30,
      deltaMode: 0,
      preventDefault,
    } as unknown as Partial<PointerEvent>);
    expect(list.scrollY).toBe(30);
    expect(preventDefault).toHaveBeenCalledTimes(1);

    canvas.dispatch('wheel', {
      offsetX: 50,
      offsetY: 150,
      deltaY: 30,
      deltaMode: 0,
      preventDefault,
    } as unknown as Partial<PointerEvent>);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});
