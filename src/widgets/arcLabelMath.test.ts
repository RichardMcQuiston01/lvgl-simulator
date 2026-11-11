import { describe, expect, it } from 'vitest';
import { layoutArcLabel } from './arcLabelMath.js';

/** On a radius-100 circle a 10px glyph spans 10/100 rad, about 5.7296 degrees. */
const STEP = (10 / 100) * (180 / Math.PI);

describe('layoutArcLabel', () => {
  it('places glyph centres one glyph-width apart, starting at the start angle', () => {
    const glyphs = layoutArcLabel([10, 10, 10], 100, 0, 180, 'clockwise', 'left');
    expect(glyphs.map((glyph) => glyph.angle)).toEqual([
      expect.closeTo(STEP * 0.5, 6),
      expect.closeTo(STEP * 1.5, 6),
      expect.closeTo(STEP * 2.5, 6),
    ]);
  });

  it('spaces glyphs by their own widths', () => {
    const glyphs = layoutArcLabel([10, 30], 100, 0, 180, 'clockwise', 'left');
    expect(glyphs[0]?.angle).toBeCloseTo(STEP * 0.5, 6);
    expect(glyphs[1]?.angle).toBeCloseTo(STEP * (1 + 1.5), 6);
  });

  it('centres the text in the sweep, or pushes it to the end', () => {
    const centred = layoutArcLabel([10, 10], 100, 0, 90, 'clockwise', 'center');
    expect(centred[0]?.angle).toBeCloseTo((90 - 2 * STEP) / 2 + STEP * 0.5, 6);

    const right = layoutArcLabel([10, 10], 100, 0, 90, 'clockwise', 'right');
    expect(right[1]?.angle).toBeCloseTo(90 - STEP * 0.5, 6);
  });

  it('runs backwards for counterclockwise text, with the glyph rotation flipped', () => {
    const [first, second] = layoutArcLabel([10, 10], 100, 180, 180, 'counterClockwise', 'left');
    expect(first?.angle).toBeCloseTo(180 - STEP * 0.5, 6);
    expect(second?.angle).toBeCloseTo(180 - STEP * 1.5, 6);
    expect(first?.rotation).toBeCloseTo((first?.angle ?? 0) - 90, 6);
  });

  it('stands clockwise glyphs on the circle with their tops outward', () => {
    // The top of the circle is 270 degrees; an upright glyph there needs rotation 360 (= 0).
    const [glyph] = layoutArcLabel([10], 100, 270 - STEP * 0.5, 90, 'clockwise', 'left');
    expect(glyph?.angle).toBeCloseTo(270, 6);
    expect(glyph?.rotation).toBeCloseTo(360, 6);
  });

  it('keeps counterclockwise glyphs upright along the bottom', () => {
    // The bottom is 90 degrees; counterclockwise text there is upright at rotation 0.
    const [glyph] = layoutArcLabel([10], 100, 90 + STEP * 0.5, 90, 'counterClockwise', 'left');
    expect(glyph?.angle).toBeCloseTo(90, 6);
    expect(glyph?.rotation).toBeCloseTo(0, 6);
  });

  it('cuts text that is longer than the sweep, keeping the start', () => {
    const glyphs = layoutArcLabel([10, 10, 10, 10], 100, 0, STEP * 2.5, 'clockwise', 'center');
    expect(glyphs.map((glyph) => glyph.index)).toEqual([0, 1]);
  });

  it('returns nothing for a degenerate circle or sweep', () => {
    expect(layoutArcLabel([10], 0, 0, 90, 'clockwise', 'left')).toEqual([]);
    expect(layoutArcLabel([10], 100, 0, 0, 'clockwise', 'left')).toEqual([]);
    expect(layoutArcLabel([], 100, 0, 90, 'clockwise', 'left')).toEqual([]);
  });
});
