import { describe, expect, it, vi } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { Textarea, type TextareaOptions } from './Textarea.js';

/** The fake context measures every character as 7px; default font 14px gives 18px lines and 8px padding. */
function area(options: Partial<TextareaOptions> = {}): Textarea {
  return new Textarea({ width: 200, height: 100, now: () => 0, ...options });
}

function type(textarea: Textarea, ...keys: string[]): void {
  for (const key of keys) {
    textarea.dispatchEvent('key', { key });
  }
}

function paint(textarea: Textarea): CanvasRenderingContext2D {
  const context = createFakeCanvasContext();
  textarea.render(context);
  return context;
}

type Calls = { mock: { calls: unknown[][] } };
const callsOf = (fn: unknown): unknown[][] => (fn as Calls).mock.calls;

describe('Textarea text and keys', () => {
  it('starts empty and editable, or with the caret at the end of initial text', () => {
    const empty = area();
    expect([empty.text, empty.caret, empty.editable, empty.oneLine]).toEqual(['', 0, true, false]);
    expect(area({ text: 'hello' }).caret).toBe(5);
  });

  it('types characters and edits with the usual keys', () => {
    const textarea = area();
    type(textarea, 'h', 'e', 'l', 'l', 'o');
    expect(textarea.text).toBe('hello');
    type(textarea, 'Backspace');
    expect(textarea.text).toBe('hell');
    type(textarea, 'Home', 'Delete');
    expect(textarea.text).toBe('ell');
    type(textarea, 'End', 'ArrowLeft', 'x');
    expect(textarea.text).toBe('elxl');
  });

  it('fires valueChanged only when the text changes', () => {
    const textarea = area({ text: 'ab' });
    const listener = vi.fn();
    textarea.addEventListener('valueChanged', listener);
    type(textarea, 'ArrowLeft', 'Home', 'x');
    expect(textarea.text).toBe('xab');
    expect(listener).toHaveBeenCalledTimes(1);
    textarea.setText('xab');
    expect(listener).toHaveBeenCalledTimes(1);
    textarea.setText('y');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('selects with Shift+arrows and Ctrl+A, and typing replaces the selection', () => {
    const textarea = area({ text: 'hello' });
    textarea.dispatchEvent('key', { key: 'ArrowLeft', shiftKey: true });
    textarea.dispatchEvent('key', { key: 'ArrowLeft', shiftKey: true });
    expect(textarea.selectedText).toBe('lo');
    type(textarea, 'p');
    expect(textarea.text).toBe('help');

    textarea.dispatchEvent('key', { key: 'a', ctrlKey: true });
    expect(textarea.selectedText).toBe('help');
  });

  it('adds a newline on Enter in multi-line mode but fires ready in one-line mode', () => {
    const multi = area({ text: 'a' });
    type(multi, 'Enter', 'b');
    expect(multi.text).toBe('a\nb');

    const single = area({ text: 'a', oneLine: true });
    const ready = vi.fn();
    single.addEventListener('ready', ready);
    type(single, 'Enter');
    expect(ready).toHaveBeenCalledTimes(1);
    expect(single.text).toBe('a');
  });

  it('fires cancel on Escape', () => {
    const textarea = area();
    const cancel = vi.fn();
    textarea.addEventListener('cancel', cancel);
    type(textarea, 'Escape');
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('honors maxLength and acceptedChars', () => {
    const textarea = area({ maxLength: 3, acceptedChars: '0123456789' });
    type(textarea, '1', 'a', '2', '3', '4');
    expect(textarea.text).toBe('123');
  });

  it('exposes insert and delete for other widgets, such as a keyboard', () => {
    const textarea = area();
    const listener = vi.fn();
    textarea.addEventListener('valueChanged', listener);
    textarea.insertText('abc');
    textarea.deleteBackward();
    textarea.moveCaret(-1);
    textarea.deleteForward();
    expect(textarea.text).toBe('a');
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('moves up and down lines in multi-line mode, keeping its column', () => {
    const textarea = area({ text: 'ab\ncd' });
    expect(textarea.caret).toBe(5);
    type(textarea, 'ArrowUp');
    expect(textarea.caret).toBe(2);
    type(textarea, 'ArrowDown');
    expect(textarea.caret).toBe(5);
    textarea.dispatchEvent('key', { key: 'ArrowUp', shiftKey: true });
    expect(textarea.selectedText).toBe('\ncd');
  });
});

describe('Textarea painting', () => {
  it('draws the text, or the placeholder while empty', () => {
    const filled = paint(area({ text: 'hi', placeholder: 'Name' }));
    expect(callsOf(filled.fillText).map((call) => call[0])).toEqual(['hi']);

    const empty = paint(area({ placeholder: 'Name' }));
    expect(callsOf(empty.fillText).map((call) => call[0])).toEqual(['Name']);
  });

  it('masks the text in password mode but keeps the real value', () => {
    const textarea = area({ text: 'abc', passwordMode: true });
    expect(callsOf(paint(textarea).fillText).map((call) => call[0])).toEqual(['•••']);
    expect(textarea.text).toBe('abc');
    const custom = paint(area({ text: 'abc', passwordMode: true, passwordChar: '*' }));
    expect(callsOf(custom.fillText).map((call) => call[0])).toEqual(['***']);
  });

  it('draws the caret only while focused, at the caret column', () => {
    const idle = paint(area({ text: 'ab' }));
    expect(idle.fillRect).not.toHaveBeenCalled();

    const context = paint(area({ text: 'ab', focused: true }));
    // 8px padding + two 7px characters; 18px line; 2px caret.
    expect(context.fillRect).toHaveBeenCalledWith(22, 8, 2, 18);
  });

  it('blinks the caret and restarts the blink on activity', () => {
    const clock = { now: 0 };
    const textarea = area({ text: 'ab', focused: true, now: () => clock.now });
    expect(textarea.caretVisible).toBe(true);
    clock.now = 400;
    expect(textarea.caretVisible).toBe(false);
    clock.now = 800;
    expect(textarea.caretVisible).toBe(true);
    clock.now = 1200;
    type(textarea, 'x');
    expect(textarea.caretVisible).toBe(true);
  });

  it('highlights the selection behind the text', () => {
    const textarea = area({ text: 'hello' });
    textarea.setCaret(1);
    textarea.setCaret(3, true);
    const context = paint(textarea);
    // From 7px to 21px within the 8px padding: x 15, width 14.
    expect(context.fillRect).toHaveBeenCalledWith(15, 8, 14, 18);
  });

  it('scrolls a one-line box sideways to keep the caret in view', () => {
    const textarea = area({ text: 'abcdefghij', oneLine: true, width: 60 });
    const context = paint(textarea);
    // Content is 44px wide; the caret sits at 70px, so the view scrolls by 70 - (44 - 2) = 28.
    expect(callsOf(context.fillText)[0]?.[1]).toBe(8 - 28);
  });

  it('scrolls a multi-line box vertically to keep the caret line in view', () => {
    const textarea = area({ text: 'a\nb\nc\nd', height: 52 });
    const context = paint(textarea);
    // Content is 36px tall (two lines); the caret is on line 3, so scroll by 54 + 18 - 36 = 36.
    expect(callsOf(context.fillText)[0]?.[2]).toBe(8 - 36);
  });

  it('wraps long text onto several lines in multi-line mode', () => {
    const context = paint(area({ text: 'aaaa bbbb cccc', width: 60 }));
    // 44px content fits six 7px characters per line.
    expect(callsOf(context.fillText).map((call) => call[0])).toEqual(['aaaa ', 'bbbb ', 'cccc']);
  });
});

describe('Textarea pointer input', () => {
  it('places the caret on press, then extends the selection while dragging', () => {
    const textarea = area({ text: 'hello' });
    paint(textarea); // lets it measure with the canvas

    textarea.dispatchEvent('pressed');
    textarea.handlePointerPosition(8 + 14 + 1, 10);
    expect(textarea.caret).toBe(2);
    expect(textarea.selection).toBeNull();

    textarea.handlePointerPosition(8 + 28, 10);
    expect(textarea.selection).toEqual({ start: 2, end: 4 });

    textarea.dispatchEvent('pressed');
    textarea.handlePointerPosition(8, 10);
    expect(textarea.caret).toBe(0);
    expect(textarea.selection).toBeNull();
  });
});
