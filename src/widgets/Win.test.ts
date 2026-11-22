import { describe, expect, it, vi } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { Label } from './Label.js';
import { Win } from './Win.js';

describe('Win', () => {
  it('puts the header across the top and the content below it', () => {
    const win = new Win({ width: 300, height: 200, headerHeight: 40 });
    win.render(createFakeCanvasContext());
    expect(win.header).toMatchObject({ x: 0, y: 0, width: 300, height: 40 });
    expect(win.content).toMatchObject({ x: 0, y: 40, width: 300, height: 160 });
  });

  it('follows the window when it is resized', () => {
    const win = new Win({ width: 300, height: 200 });
    win.width = 250;
    win.height = 120;
    win.render(createFakeCanvasContext());
    expect(win.header.width).toBe(250);
    expect(win.content).toMatchObject({ width: 250, height: 80 });
  });

  it('has a 40px header by default and never a negative content height', () => {
    const win = new Win({ width: 100, height: 20 });
    win.render(createFakeCanvasContext());
    expect(win.headerHeight).toBe(40);
    expect(win.content.height).toBe(0);
  });

  it('adds the title option to the header, filling the width the buttons leave', () => {
    const win = new Win({ width: 300, height: 200, title: 'Settings' });
    const close = win.addButton('X');
    win.render(createFakeCanvasContext());
    const title = win.header.children[0] as Label;
    expect(title.text).toBe('Settings');
    // 300 wide, 8px padding each side, a 4px gap, and a square 32px button.
    expect(title.width).toBe(300 - 16 - 4 - 32);
    expect(close.x).toBe(300 - 8 - 32);
  });

  it('lines header buttons up in order with the default square size', () => {
    const win = new Win({ width: 300, height: 200 });
    const first = win.addButton('A');
    const second = win.addButton('B', 50);
    win.render(createFakeCanvasContext());
    expect(first.width).toBe(32);
    expect(second.width).toBe(50);
    expect(second.x).toBeGreaterThan(first.x);
    expect(first.y).toBe(4);
  });

  it('adds more than one title', () => {
    const win = new Win({ width: 300, height: 200 });
    win.addTitle('One');
    win.addTitle('Two');
    expect(win.header.children).toHaveLength(2);
  });

  it('reports a click on a header button', () => {
    const win = new Win({ width: 300, height: 200 });
    const button = win.addButton('X');
    const listener = vi.fn();
    button.addEventListener('clicked', listener);
    button.dispatchEvent('clicked');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('holds the window own widgets in the content area', () => {
    const win = new Win({ width: 300, height: 200 });
    const label = new Label({ x: 10, y: 10, width: 80, height: 20, text: 'Hello' });
    win.content.addChild(label);
    const context = createFakeCanvasContext();
    win.render(context);
    expect(vi.mocked(context.fillText).mock.calls.map((call) => call[0])).toContain('Hello');
    expect(label.getAbsolutePosition()).toEqual({ x: 10, y: 50 });
  });

  it('does not scroll', () => {
    const win = new Win({ width: 300, height: 200 });
    win.render(createFakeCanvasContext());
    expect(win.isScrollable).toBe(false);
  });
});

describe('Win header after it has been laid out', () => {
  it('shrinks the title when a button is added later, keeping the button inside the header', () => {
    const win = new Win({ width: 300, height: 200, title: 'Settings' });
    win.render(createFakeCanvasContext());
    const title = win.header.children[0];
    expect(title?.width).toBe(300 - 16);
    const button = win.addButton('X');
    win.render(createFakeCanvasContext());
    expect(title?.width).toBe(300 - 16 - 4 - 32);
    expect(button.x + button.width).toBe(300 - 8);
  });

  it('shrinks the title when the window narrows', () => {
    const win = new Win({ width: 300, height: 200, title: 'Settings' });
    win.addButton('X');
    win.render(createFakeCanvasContext());
    win.width = 200;
    win.render(createFakeCanvasContext());
    expect(win.header.children[0]?.width).toBe(200 - 16 - 4 - 32);
  });
});
