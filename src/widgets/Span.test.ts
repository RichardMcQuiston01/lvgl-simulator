import { describe, expect, it } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { Span, type SpanOptions } from './Span.js';

/** The fake context measures every character as 7px; the default font is 14px, giving 18px lines and a 13.3px baseline. */
function span(options: Partial<SpanOptions> = {}): Span {
  return new Span({ width: 70, height: 20, ...options });
}

function paint(group: Span): CanvasRenderingContext2D {
  const context = createFakeCanvasContext();
  group.render(context);
  return context;
}

type Calls = { mock: { calls: unknown[][] } };
const callsOf = (fn: unknown): unknown[][] => (fn as Calls).mock.calls;
const drawn = (context: CanvasRenderingContext2D): string[] =>
  callsOf(context.fillText).map((call) => String(call[0]));

describe('Span layout and sizing', () => {
  it('wraps at its width and grows its height to the wrapped lines in break mode', () => {
    const group = span({ spans: [{ text: 'aaaa bbbb cccc' }] });
    const context = paint(group);
    expect(drawn(context)).toEqual(['aaaa bbbb', 'cccc']);
    expect(group.height).toBe(36);
    expect(group.width).toBe(70);
    const [first, second] = callsOf(context.fillText);
    expect(first?.[1]).toBe(0);
    expect(first?.[2]).toBeCloseTo(13.3);
    expect(second?.[2]).toBeCloseTo(18 + 13.3);
  });

  it('adds line spacing to every line', () => {
    const group = span({ spans: [{ text: 'aaaa bbbb cccc' }], lineSpacing: 2 });
    paint(group);
    expect(group.height).toBe(40);
  });

  it('indents only the first line', () => {
    const context = paint(span({ spans: [{ text: 'aaaa bbbb cccc' }], indent: 7 }));
    const [first, second] = callsOf(context.fillText);
    expect(first?.[1]).toBe(7);
    expect(second?.[1]).toBe(0);
  });

  it('stays one line and grows its width in expand mode', () => {
    const group = span({ spans: [{ text: 'hello world' }], mode: 'expand' });
    paint(group);
    expect(group.width).toBe(77);
    expect(group.height).toBe(18);
  });

  it('keeps its size and clips to the lines that fit in fixed mode', () => {
    const group = span({ spans: [{ text: 'aaaa bbbb cccc' }], mode: 'fixed', height: 20 });
    const context = paint(group);
    expect(drawn(context)).toEqual(['aaaa bbbb']);
    expect([group.width, group.height]).toEqual([70, 20]);
    expect(context.clip).toHaveBeenCalled();
  });

  it('limits the lines to maxLines, ending the last in an ellipsis when asked', () => {
    const clipped = paint(span({ spans: [{ text: 'aaaa bbbb cccc' }], maxLines: 1 }));
    expect(drawn(clipped)).toEqual(['aaaa bbbb']);

    const group = span({ spans: [{ text: 'aaaa bbbb cccc' }], maxLines: 1, overflow: 'ellipsis' });
    expect(drawn(paint(group))).toEqual(['aaaa bbbb…']);
    expect(group.height).toBe(18);
  });

  it('does not add an ellipsis when everything fits', () => {
    const context = paint(span({ spans: [{ text: 'short' }], overflow: 'ellipsis', maxLines: 1 }));
    expect(drawn(context)).toEqual(['short']);
  });

  it('breaks on newlines', () => {
    const group = span({ spans: [{ text: 'a\nb' }] });
    expect(drawn(paint(group))).toEqual(['a', 'b']);
    expect(group.height).toBe(36);
  });

  it('aligns each line within the width', () => {
    const centred = span({
      spans: [{ text: 'abc' }],
      width: 100,
      style: { base: { textAlign: 'center' } },
    });
    expect(callsOf(paint(centred).fillText)[0]?.[1]).toBe(39.5);
    const right = span({
      spans: [{ text: 'abc' }],
      width: 100,
      style: { base: { textAlign: 'right' } },
    });
    expect(callsOf(paint(right).fillText)[0]?.[1]).toBe(79);
  });
});

describe('Span runs', () => {
  it('draws each run in its own color', () => {
    const fills: unknown[] = [];
    const context = createFakeCanvasContext();
    Object.defineProperty(context, 'fillStyle', {
      set: (value: unknown) => fills.push(value),
      get: () => '',
    });
    span({
      width: 200,
      spans: [
        { text: 'red ', style: { textColor: '#ff0000' } },
        { text: 'blue', style: { textColor: '#0000ff' } },
      ],
    }).render(context);
    expect(fills).toEqual(expect.arrayContaining(['#ff0000', '#0000ff']));
    expect(fills.indexOf('#ff0000')).toBeLessThan(fills.indexOf('#0000ff'));
  });

  it('puts runs of different sizes on one baseline and makes the line as tall as the largest', () => {
    const group = span({
      width: 200,
      spans: [{ text: 'a' }, { text: 'b', style: { textFontSize: 28 } }],
    });
    const context = paint(group);
    const [small, large] = callsOf(context.fillText);
    expect(small?.[2]).toBe(large?.[2]);
    expect(large?.[2]).toBeCloseTo(28 * 0.95);
    expect(group.height).toBe(36);
  });

  it('uses each run font for the text it draws', () => {
    const fonts: string[] = [];
    const context = createFakeCanvasContext();
    Object.defineProperty(context, 'font', {
      set: (value: string) => fonts.push(value),
      get: () => '',
    });
    span({
      width: 200,
      spans: [{ text: 'a' }, { text: 'b', style: { textFontSize: 20, textFontFamily: 'serif' } }],
    }).render(context);
    expect(fonts).toContain('20px serif');
  });

  it('underlines and strikes through the runs that ask for it', () => {
    const underlined = paint(
      span({ width: 200, spans: [{ text: 'abc', style: { textDecor: 'underline' } }] }),
    );
    // 21px wide at the left edge, 1px thick, just below the baseline.
    const underline = callsOf(underlined.fillRect)[0];
    expect(underline?.slice(0, 1)).toEqual([0]);
    expect(underline?.[1]).toBeCloseTo(13.3 + 1);
    expect(underline?.slice(2)).toEqual([21, 1]);

    const struck = paint(
      span({ width: 200, spans: [{ text: 'abc', style: { textDecor: 'strikethrough' } }] }),
    );
    expect(callsOf(struck.fillRect)[0]?.[1]).toBeCloseTo(13.3 - 14 * 0.3);

    const plain = paint(span({ width: 200, spans: [{ text: 'abc' }] }));
    expect(plain.fillRect).not.toHaveBeenCalled();
  });

  it('can have runs replaced and added, and joins them for text', () => {
    const group = span({ spans: [{ text: 'a' }] });
    group.addSpan({ text: 'b' });
    expect(group.text).toBe('ab');
    group.setSpans([{ text: 'xyz' }]);
    expect(group.text).toBe('xyz');
  });
});
