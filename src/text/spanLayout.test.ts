import { describe, expect, it } from 'vitest';
import {
  layoutSpans,
  truncateLineWithEllipsis,
  type SpanInput,
  type SpanLine,
} from './spanLayout.js';

/** A character is as wide as one tenth of its span's font size times ten: i.e. fontSize px. */
function measureFor(spans: readonly SpanInput[]) {
  return (text: string, spanIndex: number): number =>
    text.length * (spans[spanIndex]?.fontSize ?? 10);
}

function lay(
  spans: readonly SpanInput[],
  maxWidth: number,
  extra: { indent?: number; lineSpacing?: number } = {},
): readonly SpanLine[] {
  return layoutSpans(spans, measureFor(spans), {
    maxWidth,
    indent: extra.indent ?? 0,
    lineSpacing: extra.lineSpacing ?? 0,
  });
}

const texts = (lines: readonly SpanLine[]): string[] =>
  lines.map((line) => line.fragments.map((fragment) => fragment.text).join('|'));

describe('layoutSpans', () => {
  it('puts a single span on one line when it fits, with line metrics from its font size', () => {
    const [line] = lay([{ text: 'hello', fontSize: 10 }], 100);
    expect(line?.width).toBe(50);
    expect(line?.height).toBe(13);
    expect(line?.baseline).toBeCloseTo(9.5);
    expect(line?.fragments).toEqual([{ spanIndex: 0, text: 'hello', x: 0, width: 50 }]);
  });

  it('wraps after whole words and drops the space left at the end of a wrapped line', () => {
    const lines = lay([{ text: 'aaa bbb ccc', fontSize: 10 }], 70);
    expect(texts(lines)).toEqual(['aaa bbb', 'ccc']);
    expect(lines[0]?.width).toBe(70);
  });

  it('lays several spans side by side, each fragment after the previous', () => {
    const spans = [
      { text: 'ab', fontSize: 10 },
      { text: 'cd', fontSize: 20 },
    ];
    const [line] = lay(spans, 200);
    expect(line?.fragments).toEqual([
      { spanIndex: 0, text: 'ab', x: 0, width: 20 },
      { spanIndex: 1, text: 'cd', x: 20, width: 40 },
    ]);
  });

  it('makes a line as tall as its largest run and puts every run on one baseline', () => {
    const [line] = lay(
      [
        { text: 'a', fontSize: 10 },
        { text: 'b', fontSize: 20 },
      ],
      200,
    );
    expect(line?.height).toBe(26);
    expect(line?.baseline).toBeCloseTo(19);
  });

  it('keeps spans on one line when there is room, as separate fragments', () => {
    const spans = [
      { text: 'aaaa ', fontSize: 10 },
      { text: 'bbbb', fontSize: 10 },
    ];
    expect(texts(lay(spans, 100))).toEqual(['aaaa |bbbb']);
  });

  it('can break between two spans even without whitespace, since words are per span', () => {
    const spans = [
      { text: 'aaaa', fontSize: 10 },
      { text: 'bbbb', fontSize: 10 },
    ];
    expect(texts(lay(spans, 60))).toEqual(['aaaa', 'bbbb']);
  });

  it('merges neighbouring pieces of the same span on a line into one fragment', () => {
    const [line] = lay([{ text: 'aa bb cc', fontSize: 10 }], 200);
    expect(line?.fragments).toHaveLength(1);
    expect(line?.fragments[0]?.text).toBe('aa bb cc');
  });

  it('breaks on newlines, keeping blank lines at the last font size', () => {
    const lines = lay([{ text: 'a\n\nb', fontSize: 10 }], 200);
    expect(texts(lines)).toEqual(['a', '', 'b']);
    expect(lines[1]?.height).toBe(13);
    expect(lines[1]?.width).toBe(0);
  });

  it('splits a word wider than the line by character', () => {
    expect(texts(lay([{ text: 'abcdefgh', fontSize: 10 }], 30))).toEqual(['abc', 'def', 'gh']);
  });

  it('applies the indent to the first line only, and line spacing to every line', () => {
    const lines = lay([{ text: 'aaa bbb', fontSize: 10 }], 60, { indent: 20, lineSpacing: 4 });
    expect(lines[0]?.fragments[0]?.x).toBe(20);
    expect(lines[1]?.fragments[0]?.x).toBe(0);
    expect(lines.map((line) => line.height)).toEqual([17, 17]);
  });

  it('does not wrap when maxWidth is not positive', () => {
    expect(texts(lay([{ text: 'aaa bbb ccc', fontSize: 10 }], 0))).toEqual(['aaa bbb ccc']);
  });

  it('handles no spans and empty spans', () => {
    expect(lay([], 100)).toHaveLength(1);
    expect(texts(lay([{ text: '', fontSize: 10 }], 100))).toEqual(['']);
  });
});

describe('truncateLineWithEllipsis', () => {
  const spans = [
    { text: 'hello world', fontSize: 10 },
    { text: ' again', fontSize: 10 },
  ];
  const measure = measureFor(spans);

  it('leaves a line alone without a positive width', () => {
    const [line] = lay(spans, 0);
    expect(line && truncateLineWithEllipsis(line, measure, 0)).toBe(line);
  });

  it('cuts the last fragment back until the ellipsis fits', () => {
    const [line] = lay(spans, 0);
    if (!line) {
      throw new Error('Expected a line.');
    }
    // Each character is 10px; 80px fits 7 characters plus the ellipsis in the first fragment.
    const cut = truncateLineWithEllipsis(line, measure, 80);
    expect(cut.fragments.map((fragment) => fragment.text)).toEqual(['hello w\u2026']);
    expect(cut.width).toBe(80);
  });

  it('drops whole fragments when the last one cannot hold the ellipsis', () => {
    const [line] = lay(spans, 0);
    if (!line) {
      throw new Error('Expected a line.');
    }
    // 110px: "hello world" is 110px and leaves no room, so the second fragment goes entirely.
    const cut = truncateLineWithEllipsis(line, measure, 110);
    expect(cut.fragments.map((fragment) => fragment.text)).toEqual(['hello worl\u2026']);
  });

  it('keeps the ellipsis in the later fragment when it fits there', () => {
    const [line] = lay(spans, 0);
    if (!line) {
      throw new Error('Expected a line.');
    }
    const cut = truncateLineWithEllipsis(line, measure, 150);
    expect(cut.fragments.map((fragment) => fragment.text)).toEqual(['hello world', ' ag\u2026']);
  });

  it('shows nothing when not even the ellipsis fits', () => {
    const [line] = lay(spans, 0);
    if (!line) {
      throw new Error('Expected a line.');
    }
    expect(truncateLineWithEllipsis(line, measure, 5).fragments).toEqual([]);
  });
});
