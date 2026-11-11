import { describe, expect, it } from 'vitest';
import {
  caretPosition,
  lineIndexAt,
  moveOffsetVertically,
  offsetAtPoint,
  offsetAtX,
  wrapLines,
  type MeasureText,
} from './layout.js';

/** Every character is 10px wide. */
const measure: MeasureText = (text) => text.length * 10;

function slices(text: string, width: number, wrap = true): string[] {
  return wrapLines(text, width, measure, wrap).map((line) => text.slice(line.start, line.end));
}

describe('wrapLines', () => {
  it('returns one empty line for empty text', () => {
    expect(wrapLines('', 100, measure)).toEqual([{ start: 0, end: 0, width: 0 }]);
  });

  it('breaks only on newlines when wrapping is off', () => {
    expect(slices('one two\nthree', 20, false)).toEqual(['one two', 'three']);
  });

  it('wraps after whole words, keeping the space at the end of the earlier line', () => {
    expect(slices('aaa bbb ccc', 70)).toEqual(['aaa bbb ', 'ccc']);
    expect(slices('aaa bbb ccc', 40)).toEqual(['aaa ', 'bbb ', 'ccc']);
  });

  it('reports line widths without trailing whitespace', () => {
    const lines = wrapLines('aaa bbb ccc', 70, measure);
    expect(lines.map((line) => line.width)).toEqual([70, 30]);
  });

  it('breaks a word that is wider than the line by character', () => {
    expect(slices('abcdefgh', 30)).toEqual(['abc', 'def', 'gh']);
    expect(slices('xx abcdefgh', 30)).toEqual(['xx ', 'abc', 'def', 'gh']);
  });

  it('starts each wrapped line exactly where the previous one ended', () => {
    const lines = wrapLines('aaa bbb ccc ddd', 50, measure);
    for (let index = 1; index < lines.length; index += 1) {
      expect(lines[index]?.start).toBe(lines[index - 1]?.end);
    }
  });

  it('keeps blank lines from consecutive newlines', () => {
    expect(slices('a\n\nb', 100)).toEqual(['a', '', 'b']);
  });

  it('does not wrap when maxWidth is not positive', () => {
    expect(slices('aaa bbb', 0)).toEqual(['aaa bbb']);
  });
});

describe('caret and point mapping', () => {
  const text = 'aaa bbb ccc';
  const lines = wrapLines(text, 40, measure);

  it('finds the line that holds an offset, giving a wrap boundary to the later line', () => {
    expect(lineIndexAt(lines, 0)).toBe(0);
    expect(lineIndexAt(lines, 3)).toBe(0);
    expect(lineIndexAt(lines, 4)).toBe(1);
    expect(lineIndexAt(lines, 11)).toBe(2);
  });

  it('measures the caret x within its line', () => {
    expect(caretPosition(text, lines, 6, measure)).toEqual({ line: 1, x: 20 });
    expect(caretPosition(text, lines, 4, measure)).toEqual({ line: 1, x: 0 });
    expect(caretPosition(text, lines, 11, measure)).toEqual({ line: 2, x: 30 });
  });

  it('finds the nearest boundary to a pixel x', () => {
    const line = lines[0];
    if (!line) {
      throw new Error('Expected a first line.');
    }
    expect(offsetAtX(text, line, -5, measure)).toBe(0);
    expect(offsetAtX(text, line, 4, measure)).toBe(0);
    expect(offsetAtX(text, line, 6, measure)).toBe(1);
    expect(offsetAtX(text, line, 24, measure)).toBe(2);
    expect(offsetAtX(text, line, 500, measure)).toBe(line.end);
  });

  it('maps a point to an offset using the line height', () => {
    // Line 1 ("bbb ") covers y 20-40 and starts at offset 4; x 26 is nearest the third boundary.
    expect(offsetAtPoint(text, lines, 26, 25, 20, measure)).toBe(4 + 3);
    expect(offsetAtPoint(text, lines, 0, 0, 20, measure)).toBe(0);
    expect(offsetAtPoint(text, lines, 0, 999, 20, measure)).toBe(8);
    expect(offsetAtPoint('', [], 5, 5, 20, measure)).toBe(0);
  });

  it('moves vertically keeping the preferred x, and stays put at the ends', () => {
    expect(moveOffsetVertically(text, lines, 6, 1, 20, measure)).toBe(10);
    expect(moveOffsetVertically(text, lines, 10, -1, 20, measure)).toBe(6);
    expect(moveOffsetVertically(text, lines, 2, -1, 20, measure)).toBe(2);
    expect(moveOffsetVertically(text, lines, 10, 1, 20, measure)).toBe(10);
  });
});
