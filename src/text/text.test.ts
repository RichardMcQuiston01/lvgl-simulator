import { describe, expect, it, vi } from 'vitest';
import { createTextMeasurer, fontString } from './measureText.js';
import { TextEditState } from './TextEditState.js';

function fakeContext(): {
  context: CanvasRenderingContext2D;
  measureText: ReturnType<typeof vi.fn>;
} {
  const measureText = vi.fn((text: string) => ({ width: text.length * 7 }));
  return {
    context: { font: '', measureText } as unknown as CanvasRenderingContext2D,
    measureText,
  };
}

describe('createTextMeasurer', () => {
  it('measures once per (font, text) pair', () => {
    const { context, measureText } = fakeContext();
    const measurer = createTextMeasurer();
    expect(measurer.measure(context, 'hello', '14px sans-serif')).toBe(35);
    expect(measurer.measure(context, 'hello', '14px sans-serif')).toBe(35);
    expect(measureText).toHaveBeenCalledTimes(1);
    measurer.measure(context, 'hello', '20px sans-serif');
    expect(measureText).toHaveBeenCalledTimes(2);
  });

  it('evicts the least recently used entry past the cap', () => {
    const { context, measureText } = fakeContext();
    const measurer = createTextMeasurer(2);
    measurer.measure(context, 'a', 'f');
    measurer.measure(context, 'b', 'f');
    measurer.measure(context, 'a', 'f'); // refresh a; b is now oldest
    measurer.measure(context, 'c', 'f'); // evicts b
    expect(measurer.size).toBe(2);
    measureText.mockClear();
    measurer.measure(context, 'a', 'f');
    expect(measureText).not.toHaveBeenCalled();
    measurer.measure(context, 'b', 'f');
    expect(measureText).toHaveBeenCalledTimes(1);
  });

  it('builds font strings', () => {
    expect(fontString(14, 'Arial')).toBe('14px Arial');
  });
});

describe('TextEditState', () => {
  it('inserts at the caret and replaces a selection', () => {
    const state = new TextEditState({ text: 'hello' });
    state.setCaret(5);
    state.insert(' world');
    expect(state.text).toBe('hello world');
    state.setCaret(0);
    state.setCaret(5, true);
    expect(state.selectedText).toBe('hello');
    state.insert('howdy');
    expect(state.text).toBe('howdy world');
    expect(state.caret).toBe(5);
  });

  it('honors maxLength and acceptedChars', () => {
    const state = new TextEditState({ maxLength: 4, acceptedChars: '0123456789' });
    state.insert('12ab34567');
    expect(state.text).toBe('1234');
    expect(state.insert('9')).toBe(false);
  });

  it('strips newlines in one-line mode but keeps them when multiline', () => {
    const oneLine = new TextEditState();
    oneLine.insert('a\nb');
    expect(oneLine.text).toBe('ab');
    const multi = new TextEditState({ multiline: true });
    multi.handleKey('a');
    multi.handleKey('Enter');
    multi.handleKey('b');
    expect(multi.text).toBe('a\nb');
    expect(oneLine.handleKey('Enter')).toBe(false);
  });

  it('deletes backward, forward, and the selection', () => {
    const state = new TextEditState({ text: 'abcd' });
    state.setCaret(2);
    state.deleteBackward();
    expect(state.text).toBe('acd');
    state.deleteForward();
    expect(state.text).toBe('ad');
    state.selectAll();
    state.deleteBackward();
    expect(state.text).toBe('');
    expect(state.deleteBackward()).toBe(false);
  });

  it('moves the caret, extends with shift, and collapses a selection to its edge', () => {
    const state = new TextEditState({ text: 'abcdef' });
    state.handleKey('Home');
    expect(state.caret).toBe(0);
    state.handleKey('ArrowRight', { shiftKey: true });
    state.handleKey('ArrowRight', { shiftKey: true });
    expect(state.selection).toEqual({ start: 0, end: 2 });
    state.handleKey('ArrowLeft');
    expect(state.caret).toBe(0);
    expect(state.selection).toBeNull();
    state.handleKey('End');
    expect(state.caret).toBe(6);
  });

  it('selects all with ctrl+a and ignores unmapped keys', () => {
    const state = new TextEditState({ text: 'xyz' });
    expect(state.handleKey('a', { ctrlKey: true })).toBe(true);
    expect(state.selectedText).toBe('xyz');
    expect(state.handleKey('F5')).toBe(false);
    expect(state.handleKey('Shift')).toBe(false);
  });

  it('does not type the letter of Ctrl/Cmd shortcuts, but does for AltGr', () => {
    const state = new TextEditState({ text: 'abc' });
    expect(state.handleKey('c', { ctrlKey: true })).toBe(false);
    expect(state.handleKey('v', { metaKey: true })).toBe(false);
    expect(state.text).toBe('abc');
    state.handleKey('@', { ctrlKey: true, altKey: true });
    expect(state.text).toBe('abc@');
  });

  it('selects all for uppercase A and Cmd+A', () => {
    const state = new TextEditState({ text: 'xyz' });
    expect(state.handleKey('A', { ctrlKey: true, shiftKey: true })).toBe(true);
    expect(state.selectedText).toBe('xyz');
    state.setCaret(0);
    expect(state.handleKey('a', { metaKey: true })).toBe(true);
    expect(state.selectedText).toBe('xyz');
  });

  it('clamps the caret when text is replaced', () => {
    const state = new TextEditState({ text: 'long text' });
    state.setText('hi');
    expect(state.caret).toBe(2);
  });
});
