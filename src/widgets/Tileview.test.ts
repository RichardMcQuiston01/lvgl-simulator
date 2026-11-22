import { describe, expect, it, vi } from 'vitest';
import { createAnimationEngine } from '../animation/Animation.js';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { Label } from './Label.js';
import { Tileview } from './Tileview.js';

/** A plus shape of five tiles around (1, 1), in a 100 x 50 view. */
function plus(options: { animations?: ReturnType<typeof createAnimationEngine> } = {}): Tileview {
  const view = new Tileview({ width: 100, height: 50, ...options });
  view.addTile(1, 0);
  view.addTile(0, 1);
  view.addTile(1, 1);
  view.addTile(2, 1);
  view.addTile(1, 2);
  return view;
}

describe('Tileview tiles', () => {
  it('places each tile at its grid position, one view size apart', () => {
    const view = plus();
    expect(view.tileContainer(2, 1)).toMatchObject({ x: 200, y: 50, width: 100, height: 50 });
    expect(view.tileContainer(1, 2)).toMatchObject({ x: 100, y: 100 });
    expect(view.tileContainer(5, 5)).toBeUndefined();
    expect(view.tiles).toHaveLength(5);
  });

  it('makes the first tile added the active one, without reporting it', () => {
    const view = new Tileview({ width: 100, height: 50 });
    expect(view.activeTile).toBeUndefined();
    const listener = vi.fn();
    view.addEventListener('valueChanged', listener);
    view.addTile(1, 0);
    view.addTile(0, 0);
    expect(view.activeTile).toEqual({ col: 1, row: 0 });
    expect(view.scrollX).toBe(100);
    expect(listener).not.toHaveBeenCalled();
  });

  it('rejects a second tile at the same position', () => {
    const view = plus();
    expect(() => view.addTile(1, 1)).toThrow(/already has a tile at column 1, row 1/);
  });

  it('follows the view when it is resized', () => {
    const view = plus();
    view.setActiveTile(1, 1);
    view.width = 80;
    view.height = 40;
    view.render(createFakeCanvasContext());
    expect(view.tileContainer(2, 1)).toMatchObject({ x: 160, y: 40, width: 80, height: 40 });
    expect([view.scrollX, view.scrollY]).toEqual([80, 40]);
  });
});

describe('Tileview moving', () => {
  it('moves to a tile with setActiveTile, firing valueChanged once', () => {
    const view = plus();
    const listener = vi.fn();
    view.addEventListener('valueChanged', listener);
    expect(view.setActiveTile(1, 1)).toBe(true);
    expect(view.setActiveTile(1, 1)).toBe(true);
    expect(view.activeTile).toEqual({ col: 1, row: 1 });
    expect([view.scrollX, view.scrollY]).toEqual([100, 50]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('refuses a tile that does not exist', () => {
    const view = plus();
    expect(view.setActiveTile(0, 0)).toBe(false);
    expect(view.activeTile).toEqual({ col: 1, row: 0 });
  });

  it('can reach a tile that is not a neighbour of the active one from code', () => {
    const view = plus();
    view.setActiveTile(1, 2);
    expect(view.activeTile).toEqual({ col: 1, row: 2 });
    expect([view.scrollX, view.scrollY]).toEqual([100, 100]);
  });

  it('moves with the arrow keys, toward neighbours that exist', () => {
    const view = plus();
    view.setActiveTile(1, 1);
    view.dispatchEvent('key', { key: 'ArrowRight' });
    expect(view.activeTile).toEqual({ col: 2, row: 1 });
    view.dispatchEvent('key', { key: 'ArrowRight' });
    expect(view.activeTile).toEqual({ col: 2, row: 1 });
    view.dispatchEvent('key', { key: 'ArrowLeft' });
    view.dispatchEvent('key', { key: 'ArrowUp' });
    expect(view.activeTile).toEqual({ col: 1, row: 0 });
    view.dispatchEvent('key', { key: 'x' });
    expect(view.activeTile).toEqual({ col: 1, row: 0 });
  });

  it('does not move in a direction the tile forbids', () => {
    const view = new Tileview({ width: 100, height: 50 });
    view.addTile(0, 0, { right: false });
    view.addTile(1, 0);
    view.dispatchEvent('key', { key: 'ArrowRight' });
    expect(view.activeTile).toEqual({ col: 0, row: 0 });
    expect(view.getScrollRange()).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
  });

  it('does nothing on a key before any tile exists', () => {
    const view = new Tileview({ width: 100, height: 50 });
    view.dispatchEvent('key', { key: 'ArrowRight' });
    expect(view.activeTile).toBeUndefined();
  });

  it('eases to the tile with an animation engine, reporting once it arrives', () => {
    let now = 0;
    const animations = createAnimationEngine({ now: () => now, scheduler: null });
    const view = plus({ animations });
    view.setActiveTile(1, 1);
    const listener = vi.fn();
    view.addEventListener('valueChanged', listener);
    view.setActiveTile(2, 1, true);
    now = 100;
    animations.tick(now);
    expect(view.scrollX).toBeGreaterThan(100);
    expect(view.scrollX).toBeLessThan(200);
    expect(listener).not.toHaveBeenCalled();
    now = 1000;
    animations.tick(now);
    expect(view.scrollX).toBe(200);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('reports a change only once when an animation is replaced mid-way', () => {
    let now = 0;
    const animations = createAnimationEngine({ now: () => now, scheduler: null });
    const view = plus({ animations });
    view.setActiveTile(1, 1);
    const listener = vi.fn();
    view.addEventListener('valueChanged', listener);
    view.setActiveTile(2, 1, true);
    now = 50;
    animations.tick(now);
    view.setActiveTile(0, 1, true);
    now = 1000;
    animations.tick(now);
    expect(view.activeTile).toEqual({ col: 0, row: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('Tileview scrolling', () => {
  it('can reach only one tile toward each neighbour the active tile allows', () => {
    const view = plus();
    view.setActiveTile(1, 1);
    expect(view.getScrollRange()).toEqual({ minX: 0, maxX: 200, minY: 0, maxY: 100 });
    // Scrolling far to the right stops at the tile beside the active one.
    view.scrollTo(1000, 50);
    expect(view.scrollX).toBe(200);
    expect(view.activeTile).toEqual({ col: 2, row: 1 });
    // From there, only the tile to the left is a neighbour.
    expect(view.getScrollRange()).toEqual({ minX: 100, maxX: 200, minY: 50, maxY: 50 });
  });

  it('cannot scroll toward a missing tile', () => {
    const view = plus();
    // The top tile has nothing beside it.
    view.scrollTo(0, 0);
    expect(view.scrollX).toBe(100);
  });

  it('commits the tile a swipe settles on when the scroll ends, snapping onto it', () => {
    const view = plus();
    view.setActiveTile(1, 1);
    const listener = vi.fn();
    view.addEventListener('valueChanged', listener);
    view.scrolling = true;
    view.scrollTo(170, 50);
    expect(view.activeTile).toEqual({ col: 1, row: 1 });
    view.scrolling = false;
    view.dispatchEvent('scrollEnd');
    expect(view.activeTile).toEqual({ col: 2, row: 1 });
    expect(view.scrollX).toBe(200);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('snaps a wheel scroll onto a tile', () => {
    const view = plus();
    view.setActiveTile(1, 1);
    view.scrollBy(30, 0);
    expect(view.activeTile).toEqual({ col: 1, row: 1 });
    expect(view.scrollX).toBe(100);
    view.scrollBy(60, 0);
    expect(view.scrollX).toBe(200);
    expect(view.activeTile).toEqual({ col: 2, row: 1 });
  });

  it('clips to the view once there is somewhere to scroll', () => {
    const view = plus();
    view.render(createFakeCanvasContext());
    expect(view.isScrollable).toBe(true);
  });

  it('paints the active tile contents', () => {
    const view = plus();
    view.tileContainer(1, 0)?.addChild(new Label({ width: 50, height: 20, text: 'Top tile' }));
    const context = createFakeCanvasContext();
    view.render(context);
    expect(vi.mocked(context.fillText).mock.calls.map((call) => call[0])).toContain('Top tile');
  });
});
