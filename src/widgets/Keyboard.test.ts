import { describe, expect, it, vi } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import { Keyboard } from './Keyboard.js';
import { Textarea } from './Textarea.js';

function setup(options: { oneLine?: boolean; text?: string } = {}): {
  keyboard: Keyboard;
  target: Textarea;
} {
  const target = new Textarea({
    width: 200,
    height: 60,
    oneLine: options.oneLine,
    text: options.text,
    now: () => 0,
  });
  const keyboard = new Keyboard({ width: 320, height: 160, target });
  return { keyboard, target };
}

/** The centre of the key labelled `label`, in keyboard-local coordinates. */
function centreOf(keyboard: Keyboard, label: string): { x: number; y: number } {
  const rect = keyboard.keyRects.find((candidate) => candidate.definition.label === label);
  if (!rect) {
    throw new Error(`No key labelled ${JSON.stringify(label)}.`);
  }
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Presses, releases, and clicks the key at `(x, y)`, the way the interaction controller does. */
function tap(keyboard: Keyboard, x: number, y: number): void {
  keyboard.dispatchEvent('pressed');
  keyboard.handlePointerPosition(x, y);
  keyboard.dispatchEvent('released');
  keyboard.dispatchEvent('clicked');
}

describe('Keyboard keys', () => {
  it('types characters into the target and fires valueChanged with the key label', () => {
    const { keyboard, target } = setup();
    const listener = vi.fn();
    keyboard.addEventListener('valueChanged', listener);
    keyboard.pressKey('q');
    keyboard.pressKey('w');
    expect(target.text).toBe('qw');
    expect(keyboard.lastKey).toBe('w');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('handles backspace, the arrow keys and space', () => {
    const { keyboard, target } = setup({ text: 'abc' });
    keyboard.pressKey('⌫');
    expect(target.text).toBe('ab');
    keyboard.pressKey('◀');
    keyboard.pressKey(' ');
    expect(target.text).toBe('a b');
    keyboard.pressKey('▶');
    keyboard.pressKey('z');
    expect(target.text).toBe('a bz');
  });

  it('switches between lower case, upper case and symbols', () => {
    const { keyboard } = setup();
    keyboard.pressKey('ABC');
    expect(keyboard.mode).toBe('textUpper');
    keyboard.pressKey('abc');
    expect(keyboard.mode).toBe('textLower');
    keyboard.pressKey('1#');
    expect(keyboard.mode).toBe('special');
    keyboard.pressKey('abc');
    expect(keyboard.mode).toBe('textLower');
  });

  it('types capitals while in upper case', () => {
    const { keyboard, target } = setup();
    keyboard.pressKey('ABC');
    keyboard.pressKey('Q');
    expect(target.text).toBe('Q');
  });

  it('adds a newline for Enter on a multi-line target but makes a one-line target ready', () => {
    const multi = setup({ text: 'a' });
    multi.keyboard.pressKey('↵');
    expect(multi.target.text).toBe('a\n');

    const single = setup({ text: 'a', oneLine: true });
    const ready = vi.fn();
    single.target.addEventListener('ready', ready);
    single.keyboard.pressKey('↵');
    expect(ready).toHaveBeenCalledTimes(1);
    expect(single.target.text).toBe('a');
  });

  it('fires ready for the check key and cancel for the hide key', () => {
    const { keyboard } = setup();
    const ready = vi.fn();
    const cancel = vi.fn();
    keyboard.addEventListener('ready', ready);
    keyboard.addEventListener('cancel', cancel);
    keyboard.pressKey('✓');
    keyboard.pressKey('⌨');
    expect(ready).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('toggles a leading minus with the number pad sign key', () => {
    const { keyboard, target } = setup({ text: '5' });
    keyboard.setMode('number');
    keyboard.pressKey('+/-');
    expect(target.text).toBe('-5');
    keyboard.pressKey('+/-');
    expect(target.text).toBe('5');
  });

  it('still fires events without a target, and reports unknown keys', () => {
    const keyboard = new Keyboard({ width: 320, height: 160 });
    const listener = vi.fn();
    keyboard.addEventListener('valueChanged', listener);
    keyboard.pressKey('q');
    keyboard.pressKey('⌫');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(keyboard.pressKey('not a key')).toBe(false);
  });
});

describe('Keyboard pointer input', () => {
  it('activates the key under the pointer on a click', () => {
    const { keyboard, target } = setup();
    const { x, y } = centreOf(keyboard, 'q');
    tap(keyboard, x, y);
    expect(target.text).toBe('q');
  });

  it('follows the pointer onto another key before release', () => {
    const { keyboard, target } = setup();
    const first = centreOf(keyboard, 'q');
    const second = centreOf(keyboard, 'w');
    keyboard.dispatchEvent('pressed');
    keyboard.handlePointerPosition(first.x, first.y);
    keyboard.handlePointerPosition(second.x, second.y);
    keyboard.dispatchEvent('released');
    keyboard.dispatchEvent('clicked');
    expect(target.text).toBe('w');
  });

  it('types nothing when released over a gap, and forgets a cancelled press', () => {
    const { keyboard, target } = setup();
    const { x, y } = centreOf(keyboard, 'q');
    tap(keyboard, 1, 1);
    expect(target.text).toBe('');

    // A press cancelled by the browser fires released but never clicked.
    keyboard.dispatchEvent('pressed');
    keyboard.handlePointerPosition(x, y);
    keyboard.dispatchEvent('released');
    // The next, unrelated click must not replay the abandoned key.
    keyboard.dispatchEvent('pressed');
    keyboard.dispatchEvent('clicked');
    expect(target.text).toBe('');
  });
});

describe('Keyboard painting', () => {
  it('draws a label for every key except the blank space bar', () => {
    const { keyboard } = setup();
    const context = createFakeCanvasContext();
    keyboard.render(context);
    expect(context.fillText).toHaveBeenCalledTimes(39);
  });

  it('highlights only the pressed key', () => {
    const { keyboard } = setup();
    const fills: unknown[] = [];
    const context = createFakeCanvasContext();
    Object.defineProperty(context, 'fillStyle', {
      set: (value: unknown) => fills.push(value),
      get: () => '',
    });

    keyboard.render(context);
    expect(fills).not.toContain(defaultTheme.primaryColor);

    fills.length = 0;
    keyboard.dispatchEvent('pressed');
    const { x, y } = centreOf(keyboard, 'q');
    keyboard.handlePointerPosition(x, y);
    keyboard.render(context);
    expect(fills.filter((fill) => fill === defaultTheme.primaryColor)).toHaveLength(1);
  });
});
