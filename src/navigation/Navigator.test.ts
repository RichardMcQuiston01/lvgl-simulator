import { describe, expect, it, vi } from 'vitest';
import { LvObject } from '../core/LvObject.js';
import { createNavigator } from './Navigator.js';

function view(): LvObject {
  return new LvObject({ width: 100, height: 100 });
}

describe('createNavigator', () => {
  it('mounts the initial view as the screen’s only child', () => {
    const screen = new LvObject({ width: 100, height: 100 });
    const home = view();

    const navigator = createNavigator(screen, home, vi.fn());

    expect(screen.children).toEqual([home]);
    expect(navigator.current).toBe(home);
    expect(navigator.depth).toBe(0);
    expect(navigator.canPop).toBe(false);
  });

  it('clears any children already on the screen before mounting the initial view', () => {
    const screen = new LvObject({ width: 100, height: 100 });
    screen.addChild(view());
    const home = view();

    createNavigator(screen, home, vi.fn());

    expect(screen.children).toEqual([home]);
  });

  it('push() swaps the mounted view, grows the stack, and calls render', () => {
    const screen = new LvObject({ width: 100, height: 100 });
    const home = view();
    const settings = view();
    const render = vi.fn();
    const navigator = createNavigator(screen, home, render);

    navigator.push(settings);

    expect(screen.children).toEqual([settings]);
    expect(navigator.current).toBe(settings);
    expect(navigator.depth).toBe(1);
    expect(navigator.canPop).toBe(true);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('pop() restores the previous view, shrinks the stack, and calls render', () => {
    const screen = new LvObject({ width: 100, height: 100 });
    const home = view();
    const settings = view();
    const render = vi.fn();
    const navigator = createNavigator(screen, home, render);
    navigator.push(settings);
    render.mockClear();

    navigator.pop();

    expect(screen.children).toEqual([home]);
    expect(navigator.current).toBe(home);
    expect(navigator.depth).toBe(0);
    expect(navigator.canPop).toBe(false);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('pop() at the initial view is a no-op and does not call render', () => {
    const screen = new LvObject({ width: 100, height: 100 });
    const home = view();
    const render = vi.fn();
    const navigator = createNavigator(screen, home, render);

    navigator.pop();

    expect(screen.children).toEqual([home]);
    expect(navigator.depth).toBe(0);
    expect(render).not.toHaveBeenCalled();
  });

  it('supports multiple pushes and pops in sequence (depth tracking)', () => {
    const screen = new LvObject({ width: 100, height: 100 });
    const home = view();
    const settings = view();
    const advanced = view();
    const navigator = createNavigator(screen, home, vi.fn(), { maxDepth: 2 });

    navigator.push(settings);
    navigator.push(advanced);

    expect(navigator.current).toBe(advanced);
    expect(navigator.depth).toBe(2);

    navigator.pop();
    expect(navigator.current).toBe(settings);
    expect(navigator.depth).toBe(1);

    navigator.pop();
    expect(navigator.current).toBe(home);
    expect(navigator.depth).toBe(0);
  });

  it('push() throws once maxDepth is reached, leaving the mounted view unchanged', () => {
    const screen = new LvObject({ width: 100, height: 100 });
    const home = view();
    const settings = view();
    const advanced = view();
    const tooDeep = view();
    const render = vi.fn();
    const navigator = createNavigator(screen, home, render, { maxDepth: 2 });
    navigator.push(settings);
    navigator.push(advanced);
    render.mockClear();

    expect(() => navigator.push(tooDeep)).toThrow(/maxDepth/);
    expect(screen.children).toEqual([advanced]);
    expect(navigator.current).toBe(advanced);
    expect(navigator.depth).toBe(2);
    expect(render).not.toHaveBeenCalled();
  });
});
