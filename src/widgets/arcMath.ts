/**
 * Pure angle math shared by the arc-based widgets (`Arc`, `Spinner`).
 * Angles are degrees measured like LVGL's: 0° at 3 o'clock, increasing
 * clockwise (which is also Canvas's convention, since y points down).
 */

/** How an `Arc` fills, mirroring `lv_arc_mode_t`. */
export type ArcMode = 'normal' | 'symmetrical' | 'reverse';

/** Wraps `angle` into [0, 360). */
export function normalizeDegrees(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * The clockwise sweep from `startAngle` to `endAngle`, in (0, 360]. Equal
 * angles mean a full circle, so a 0°→360° arc sweeps 360° rather than 0°.
 */
export function arcSweep(startAngle: number, endAngle: number): number {
  const sweep = (endAngle - startAngle) % 360;
  return sweep <= 0 ? sweep + 360 : sweep;
}

/** `value`'s position in [min, max] as a ratio in [0, 1] (0 for an empty range). */
export function arcRatio(min: number, max: number, value: number): number {
  const span = max - min;
  if (span === 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, (value - min) / span));
}

/**
 * The indicator's clockwise start and end angles (before any rotation),
 * given the background arc's `startAngle` and `sweep`. `'normal'` fills
 * from the start, `'reverse'` from the end, and `'symmetrical'` from the
 * middle of the arc out to `value`.
 */
export function computeArcIndicator(
  min: number,
  max: number,
  value: number,
  mode: ArcMode,
  startAngle: number,
  sweep: number,
): { readonly start: number; readonly end: number } {
  const ratio = arcRatio(min, max, value);
  if (mode === 'reverse') {
    const end = startAngle + sweep;
    return { start: end - sweep * ratio, end };
  }
  if (mode === 'symmetrical') {
    const middle = startAngle + sweep / 2;
    const target = startAngle + sweep * ratio;
    return { start: Math.min(middle, target), end: Math.max(middle, target) };
  }
  return { start: startAngle, end: startAngle + sweep * ratio };
}

/** The angle of the vector `(dx, dy)` from the arc's center, in [0, 360). */
export function pointerAngle(dx: number, dy: number): number {
  return normalizeDegrees((Math.atan2(dy, dx) * 180) / Math.PI);
}

/**
 * The value a pointer at `angle` selects on an arc spanning `sweep` degrees
 * from `startAngle`. A pointer in the gap outside the arc snaps to the
 * nearer end, so dragging past either limit pins the value there.
 */
export function valueFromAngle(
  angle: number,
  startAngle: number,
  sweep: number,
  min: number,
  max: number,
): number {
  const relative = normalizeDegrees(angle - startAngle);
  let ratio: number;
  if (relative <= sweep) {
    ratio = sweep === 0 ? 0 : relative / sweep;
  } else {
    // In the gap: compare the way back to the end against the way on to the start.
    ratio = relative - sweep < 360 - relative ? 1 : 0;
  }
  return min + ratio * (max - min);
}
