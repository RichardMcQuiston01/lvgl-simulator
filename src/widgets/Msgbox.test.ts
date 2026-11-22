import { describe, expect, it, vi } from 'vitest';
import { hitTest } from '../interaction/hitTest.js';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { Button } from './Button.js';
import { Container } from './Container.js';
import { Msgbox, type MsgboxOptions } from './Msgbox.js';

function msgbox(options: Partial<MsgboxOptions> = {}): Msgbox {
  return new Msgbox({ width: 280, ...options });
}

/** A 400 x 300 screen holding a button and a message box, which are returned. */
function screenWith(box: Msgbox): { screen: Container; behind: Button } {
  const screen = new Container({ width: 400, height: 300 });
  const behind = new Button({ x: 150, y: 120, width: 100, height: 40, text: 'Behind' });
  screen.addChild(behind);
  screen.addChild(box);
  return { screen, behind };
}

describe('Msgbox layout', () => {
  it('sizes a plain box to its title, text and buttons', () => {
    const box = msgbox({ title: 'Title', text: 'Short', buttons: ['OK'] });
    // 16 padding, 32 header, 12 gap, one 18.2px text line, 12 gap, 36 button, 16 padding.
    expect(box.height).toBeCloseTo(16 + 32 + 12 + 14 * 1.3 + 12 + 36 + 16, 5);
    expect(box.box.height).toBe(box.height);
    expect(box.box.width).toBe(280);
  });

  it('is only as tall as what it holds', () => {
    expect(msgbox({ text: 'Hi' }).height).toBeCloseTo(16 + 14 * 1.3 + 16, 5);
    expect(msgbox({ buttons: ['OK'] }).height).toBe(16 + 36 + 16);
    expect(msgbox().height).toBe(32);
  });

  it('wraps long text and grows with it', () => {
    const short = msgbox({ text: 'Short' });
    const long = msgbox({ text: 'word '.repeat(60) });
    expect(long.height).toBeGreaterThan(short.height + 14 * 1.3);
  });

  it('grows when the text is changed', () => {
    const box = msgbox({ text: 'Short' });
    const before = box.height;
    box.text = 'word '.repeat(60);
    expect(box.text).toContain('word');
    expect(box.height).toBeGreaterThan(before);
  });

  it('shares the footer row equally between the buttons', () => {
    const box = msgbox({ buttons: ['No', 'Yes', 'Maybe'] });
    // 248px inside the padding, two 12px gaps.
    const width = (248 - 24) / 3;
    expect(box.buttons.map((button) => button.width)).toEqual([width, width, width]);
    expect(box.buttons.map((button) => button.x)).toEqual([
      16,
      16 + width + 12,
      16 + 2 * (width + 12),
    ]);
  });

  it('puts the title beside the close button', () => {
    const box = msgbox({ title: 'Title', closeButton: true });
    const close = box.closeButton;
    expect(close?.x).toBe(280 - 16 - 32);
    expect(close?.y).toBe(16);
  });

  it('adds a button after construction', () => {
    const box = msgbox({ buttons: ['OK'] });
    box.addButton('Cancel');
    expect(box.buttons).toHaveLength(2);
    expect(box.buttons[0]?.width).toBe((248 - 12) / 2);
  });

  it('exposes and changes the title', () => {
    const box = msgbox({ title: 'One' });
    expect(box.title).toBe('One');
    box.title = 'Two';
    expect(box.title).toBe('Two');
    expect(msgbox().title).toBeUndefined();
  });
});

describe('Msgbox modal', () => {
  it('needs a height, since it fills the screen behind it', () => {
    expect(() => msgbox({ modal: true })).toThrow(/needs a height/);
  });

  it('centres the box in the backdrop', () => {
    const box = msgbox({ modal: true, width: 400, height: 300, boxWidth: 200, text: 'Hi' });
    expect(box.width).toBe(400);
    expect(box.height).toBe(300);
    expect(box.box.width).toBe(200);
    expect(box.box.x).toBe(100);
    expect(box.box.y).toBeCloseTo((300 - box.box.height) / 2, 5);
  });

  it('is on the top layer so it covers everything, and blocks clicks to what is under it', () => {
    const box = msgbox({ modal: true, width: 400, height: 300, text: 'Hi' });
    const { screen, behind } = screenWith(box);
    expect(box.topLayer).toBe(true);
    screen.render(createFakeCanvasContext());
    expect(hitTest(screen, 200, 140)).not.toBe(behind);
    expect(hitTest(screen, 5, 5)).toBe(box);
  });

  it('dims the screen behind it', () => {
    const box = msgbox({ modal: true, width: 400, height: 300 });
    expect(box.resolvedStyle).toMatchObject({ bgColor: '#000000', bgOpa: 128 });
  });

  it('is not on the top layer or dimmed when not modal', () => {
    const box = msgbox({ text: 'Hi' });
    expect(box.topLayer).toBe(false);
    expect(box.resolvedStyle.bgOpa).toBe(0);
  });

  it('closes on a backdrop click only when allowed, firing cancel', () => {
    const stay = msgbox({ modal: true, width: 400, height: 300 });
    screenWith(stay);
    stay.dispatchEvent('clicked');
    expect(stay.parent).not.toBeNull();

    const leave = msgbox({ modal: true, width: 400, height: 300, dismissOnBackdrop: true });
    const cancelled = vi.fn();
    leave.addEventListener('cancel', cancelled);
    screenWith(leave);
    leave.dispatchEvent('clicked');
    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(leave.parent).toBeNull();
  });

  it('does not treat a click on a non-modal box as a backdrop click', () => {
    const box = msgbox({ text: 'Hi', dismissOnBackdrop: true });
    screenWith(box);
    box.dispatchEvent('clicked');
    expect(box.parent).not.toBeNull();
  });
});

describe('Msgbox buttons', () => {
  it('reports a footer button click with its index and label, without closing', () => {
    const box = msgbox({ buttons: ['No', 'Yes'] });
    screenWith(box);
    const listener = vi.fn();
    box.addEventListener('valueChanged', listener);
    expect(box.lastButtonIndex).toBeUndefined();
    expect(box.lastButtonText).toBeUndefined();
    box.buttons[1]?.dispatchEvent('clicked');
    expect(box.lastButtonIndex).toBe(1);
    expect(box.lastButtonText).toBe('Yes');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(box.parent).not.toBeNull();
  });

  it('closes with the close button, firing cancel first', () => {
    const box = msgbox({ title: 'T', closeButton: true });
    const { screen } = screenWith(box);
    const seen: (typeof box.parent)[] = [];
    box.addEventListener('cancel', () => seen.push(box.parent));
    box.closeButton?.dispatchEvent('clicked');
    expect(seen).toEqual([screen]);
    expect(box.parent).toBeNull();
    expect(screen.children).not.toContain(box);
  });

  it('closes with Escape', () => {
    const box = msgbox({ text: 'Hi' });
    screenWith(box);
    box.dispatchEvent('key', { key: 'Escape' });
    expect(box.parent).toBeNull();
  });

  it('ignores other keys', () => {
    const box = msgbox({ text: 'Hi' });
    screenWith(box);
    box.dispatchEvent('key', { key: 'a' });
    expect(box.parent).not.toBeNull();
  });

  it('close() on a box with no parent does nothing', () => {
    expect(() => msgbox({ text: 'Hi' }).close()).not.toThrow();
  });
});

describe('Msgbox painting', () => {
  it('paints the title, wrapped text lines and button labels', () => {
    const box = msgbox({ title: 'Title', text: 'word '.repeat(40), buttons: ['OK'] });
    const context = createFakeCanvasContext();
    box.render(context);
    const painted = vi.mocked(context.fillText).mock.calls.map((call) => call[0]);
    expect(painted).toContain('Title');
    expect(painted).toContain('OK');
    expect(painted.filter((text) => text.startsWith('word')).length).toBeGreaterThan(1);
  });

  it('measures with the canvas once it has painted, rewrapping to the real widths', () => {
    const box = msgbox({ text: 'word '.repeat(40) });
    const before = box.height;
    const context = createFakeCanvasContext();
    // Real glyphs 7px wide per character in the fake, against the 8.4px estimate.
    box.render(context);
    box.render(context);
    expect(box.height).toBeLessThanOrEqual(before);
  });

  it('draws nothing for a box with no content beyond its frame', () => {
    const context = createFakeCanvasContext();
    msgbox().render(context);
    expect(vi.mocked(context.fillText)).not.toHaveBeenCalled();
  });
});
