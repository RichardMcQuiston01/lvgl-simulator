/**
 * Pure math for placing glyphs along a circle, used by the `ArcLabel` widget.
 * Angles are degrees measured like LVGL's: 0° at 3 o'clock, increasing
 * clockwise.
 */

/** Which way text runs around the circle. */
export type ArcLabelDirection = 'clockwise' | 'counterClockwise';

/** How text sits within the arc's sweep. */
export type ArcLabelAlign = 'left' | 'center' | 'right';

/** Where one glyph goes. */
export interface GlyphPlacement {
  readonly index: number;
  /** Angle of the glyph's centre on the circle, in degrees. */
  readonly angle: number;
  /** Rotation to draw the glyph with so it stands on the circle, in degrees. */
  readonly rotation: number;
}

/**
 * Places glyphs of the given pixel `widths` on a circle of `radius`, starting
 * at `startAngle` and running `direction` for at most `sweep` degrees. Text
 * shorter than the sweep is positioned by `align`; text longer than it is
 * cut: only the glyphs that fit are returned. Glyphs are rotated to stand
 * upright on the circle, outward for clockwise text and inward for
 * counterclockwise text, so each reads correctly along its side.
 */
export function layoutArcLabel(
  widths: readonly number[],
  radius: number,
  startAngle: number,
  sweep: number,
  direction: ArcLabelDirection,
  align: ArcLabelAlign,
): readonly GlyphPlacement[] {
  if (radius <= 0 || sweep <= 0) {
    return [];
  }
  const degreesPerPixel = 180 / Math.PI / radius;
  const total = widths.reduce((sum, width) => sum + width, 0) * degreesPerPixel;

  let offset = 0;
  if (align === 'center') {
    offset = (sweep - total) / 2;
  } else if (align === 'right') {
    offset = sweep - total;
  }
  // Text too long for the sweep is anchored at the start and cut off at the end.
  offset = Math.max(0, offset);

  const sign = direction === 'clockwise' ? 1 : -1;
  const placements: GlyphPlacement[] = [];
  let travelled = offset;
  widths.forEach((width, index) => {
    const span = width * degreesPerPixel;
    if (travelled + span > sweep + 1e-9) {
      return;
    }
    const angle = startAngle + sign * (travelled + span / 2);
    placements.push({ index, angle, rotation: angle + sign * 90 });
    travelled += span;
  });
  return placements;
}
