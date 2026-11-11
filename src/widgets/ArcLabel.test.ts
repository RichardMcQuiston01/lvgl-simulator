import { describe, expect, it } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { ArcLabel, type ArcLabelOptions } from './ArcLabel.js';

/** The fake context measures every character as 7px, and the default font is 14px. */
function label(options: Partial<ArcLabelOptions> = {}): ArcLabel {
  return new ArcLabel({ width: 200, height: 200, ...options });
}

function paint(widget: ArcLabel): CanvasRenderingContext2D {
  const context = createFakeCanvasContext();
  widget.render(context);
  return context;
}

type Calls = { mock: { calls: unknown[][] } };
const callsOf = (fn: unknown): unknown[][] => (fn as Calls).mock.calls;

describe('ArcLabel', () => {
  it('draws each character once, in order', () => {
    const context = paint(label({ text: 'Hello' }));
    expect(callsOf(context.fillText).map((call) => call[0])).toEqual(['H', 'e', 'l', 'l', 'o']);
  });

  it('draws nothing for empty text', () => {
    expect(paint(label()).fillText).not.toHaveBeenCalled();
  });

  it('puts each glyph on its own translated, rotated, saved-and-restored transform', () => {
    const context = paint(label({ text: 'ab' }));
    expect(context.save).toHaveBeenCalledTimes(2);
    expect(context.restore).toHaveBeenCalledTimes(2);
    expect(context.translate).toHaveBeenCalledTimes(2);
    expect(context.rotate).toHaveBeenCalledTimes(2);
    // Glyphs are drawn at the transformed origin.
    expect(callsOf(context.fillText).every((call) => call[1] === 0 && call[2] === 0)).toBe(true);
  });

  it('centres a single glyph at the top of the circle with its baseline on the radius', () => {
    // Sweep from 180 to 360 clockwise, centred: the middle is 270 degrees, the top.
    const widget = label({ text: 'A', radius: 80 });
    const context = paint(widget);
    const [x, y] = callsOf(context.translate)[0] ?? [];
    expect(x).toBeCloseTo(100, 6);
    expect(y).toBeCloseTo(100 - 80, 6);
    // An upright glyph at the top: rotation is a full turn.
    expect(callsOf(context.rotate)[0]?.[0]).toBeCloseTo(2 * Math.PI, 6);
  });

  it('moves the circle with the centre offset', () => {
    const context = paint(label({ text: 'A', radius: 80, centerOffsetX: 10, centerOffsetY: -5 }));
    const [x, y] = callsOf(context.translate)[0] ?? [];
    expect(x).toBeCloseTo(110, 6);
    expect(y).toBeCloseTo(100 - 5 - 80, 6);
  });

  it('shifts the baseline by a glyph height for inside text', () => {
    const outside = callsOf(paint(label({ text: 'A', radius: 80 })).translate)[0] ?? [];
    const inside =
      callsOf(paint(label({ text: 'A', radius: 80, verticalAlign: 'inside' })).translate)[0] ?? [];
    // Clockwise inside text pulls the baseline in by 0.8 of the 14px font.
    expect((outside[1] as number) - (inside[1] as number)).toBeCloseTo(-14 * 0.8, 6);
  });

  it('runs counterclockwise text along the bottom upright', () => {
    // Centred over 0-180 degrees (the bottom half), counterclockwise from 180: the middle is 90.
    const widget = label({
      text: 'A',
      radius: 80,
      startAngle: 180,
      sweepAngle: 180,
      direction: 'counterClockwise',
      verticalAlign: 'inside',
    });
    const context = paint(widget);
    const [x, y] = callsOf(context.translate)[0] ?? [];
    expect(x).toBeCloseTo(100, 6);
    expect(y).toBeCloseTo(100 + 80, 6);
    expect(callsOf(context.rotate)[0]?.[0]).toBeCloseTo(0, 6);
  });

  it('cuts text that does not fit the sweep', () => {
    // On a radius-80 circle a 7px glyph spans about 5.01 degrees.
    const names = (sweepAngle: number): unknown[] =>
      callsOf(paint(label({ text: 'abcd', radius: 80, sweepAngle, align: 'left' })).fillText).map(
        (call) => call[0],
      );
    expect(names(11)).toEqual(['a', 'b']);
    expect(names(10)).toEqual(['a']);
    expect(names(5)).toEqual([]);
  });

  it('defaults the radius to leave room for the text inside the box', () => {
    const [x, y] = callsOf(paint(label({ text: 'A' })).translate)[0] ?? [];
    expect(x).toBeCloseTo(100, 6);
    // min(200, 200) / 2 - 14 = 86 above the centre.
    expect(y).toBeCloseTo(100 - 86, 6);
  });
});
