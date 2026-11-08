/**
 * Pure tick and geometry math for the `Scale` widget, kept separate from
 * painting so it is exactly testable. Angles are degrees clockwise from
 * 3 o'clock, like LVGL's.
 */

/** Where a scale's line sits and which way its ticks point, mirroring `lv_scale_mode_t`. */
export type ScaleMode =
  | 'horizontalTop'
  | 'horizontalBottom'
  | 'verticalLeft'
  | 'verticalRight'
  | 'roundInner'
  | 'roundOuter';

/** One tick of a scale. */
export interface ScaleTick {
  readonly index: number;
  readonly value: number;
  /** Position along the scale in [0, 1]. */
  readonly ratio: number;
  readonly major: boolean;
  /** Label text for a major tick, or `undefined` when it has none. */
  readonly label: string | undefined;
}

/**
 * Lays out `totalTickCount` evenly spaced ticks over [min, max]; every
 * `majorTickEvery`-th tick (starting with the first) is major. A major
 * tick's label is the next entry of `labels` when given, else its value
 * rounded to an integer. Mirrors `lv_scale`'s tick placement.
 */
export function computeScaleTicks(
  min: number,
  max: number,
  totalTickCount: number,
  majorTickEvery: number,
  labels?: readonly string[],
): readonly ScaleTick[] {
  const count = Math.max(0, Math.floor(totalTickCount));
  const ticks: ScaleTick[] = [];
  for (let index = 0; index < count; index += 1) {
    const ratio = count === 1 ? 0 : index / (count - 1);
    // Multiply before dividing and pin the ends: `(max - min) * (index / (count - 1))`
    // can land just below a whole number (100 * 0.57 is 56.99999999999999), which
    // would make a tick on a section boundary miss that section.
    let value: number;
    if (count === 1 || index === 0) {
      value = min;
    } else if (index === count - 1) {
      value = max;
    } else {
      value = min + ((max - min) * index) / (count - 1);
    }
    const major = majorTickEvery > 0 && index % majorTickEvery === 0;
    let label: string | undefined;
    if (major) {
      label = labels ? labels[index / majorTickEvery] : String(Math.round(value));
    }
    ticks.push({ index, value, ratio, major, label });
  }
  return ticks;
}

/** The size, mode and spacing a scale lays its ticks out with. */
export interface ScaleGeometry {
  readonly mode: ScaleMode;
  readonly width: number;
  readonly height: number;
  /** Total sweep of a round scale in degrees. */
  readonly angleRange: number;
  /** Angle at which a round scale's first tick sits. */
  readonly rotation: number;
  readonly fontSize: number;
  /** Space between a tick's end and its label. */
  readonly labelGap: number;
  readonly majorTickLength: number;
}

/** A tick's line segment and where its label goes. */
export interface TickLayout {
  /** Tick start, on the scale's line. */
  readonly x1: number;
  readonly y1: number;
  /** Tick end, away from the line. */
  readonly x2: number;
  readonly y2: number;
  readonly labelX: number;
  readonly labelY: number;
  readonly labelAlign: 'left' | 'center' | 'right';
  readonly labelBaseline: 'top' | 'middle' | 'bottom';
}

/** Distance kept between a linear scale's line and the object's edge. */
const AXIS_INSET = 1;

/** Whether `mode` draws an arc rather than a straight line. */
export function isRoundMode(mode: ScaleMode): boolean {
  return mode === 'roundInner' || mode === 'roundOuter';
}

/**
 * Radius of a round scale's arc. An outer scale pulls the arc in to leave
 * room for its ticks and labels outside it; an inner scale puts the arc at
 * the edge and draws inward.
 */
export function scaleRadius(geometry: ScaleGeometry): number {
  const half = Math.min(geometry.width, geometry.height) / 2;
  if (geometry.mode === 'roundOuter') {
    return Math.max(
      0,
      half - geometry.majorTickLength - geometry.labelGap - geometry.fontSize - AXIS_INSET,
    );
  }
  return Math.max(0, half - AXIS_INSET);
}

/** The angle in degrees of the tick at `ratio` on a round scale. */
export function scaleAngle(geometry: ScaleGeometry, ratio: number): number {
  return geometry.rotation + geometry.angleRange * ratio;
}

/**
 * Where the tick at `ratio` (with the given line `length`) and its label
 * go. Linear scales put their line along an edge with ticks and labels
 * pointing into the object; vertical scales run bottom (min) to top (max).
 */
export function layoutScaleTick(
  geometry: ScaleGeometry,
  ratio: number,
  length: number,
): TickLayout {
  const { mode, width, height, labelGap, fontSize } = geometry;

  if (isRoundMode(mode)) {
    const radius = scaleRadius(geometry);
    const angle = (scaleAngle(geometry, ratio) * Math.PI) / 180;
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const centerX = width / 2;
    const centerY = height / 2;
    const outward = mode === 'roundOuter';
    const endRadius = outward ? radius + length : radius - length;
    const labelRadius = outward
      ? radius + length + labelGap + fontSize / 2
      : radius - length - labelGap - fontSize / 2;
    return {
      x1: centerX + radius * directionX,
      y1: centerY + radius * directionY,
      x2: centerX + endRadius * directionX,
      y2: centerY + endRadius * directionY,
      labelX: centerX + labelRadius * directionX,
      labelY: centerY + labelRadius * directionY,
      labelAlign: 'center',
      labelBaseline: 'middle',
    };
  }

  if (mode === 'horizontalTop' || mode === 'horizontalBottom') {
    const x = width * ratio;
    if (mode === 'horizontalTop') {
      // Line along the bottom edge, ticks and labels rising above it.
      const lineY = height - AXIS_INSET;
      return {
        x1: x,
        y1: lineY,
        x2: x,
        y2: lineY - length,
        labelX: x,
        labelY: lineY - length - labelGap,
        labelAlign: 'center',
        labelBaseline: 'bottom',
      };
    }
    const lineY = AXIS_INSET;
    return {
      x1: x,
      y1: lineY,
      x2: x,
      y2: lineY + length,
      labelX: x,
      labelY: lineY + length + labelGap,
      labelAlign: 'center',
      labelBaseline: 'top',
    };
  }

  const y = height * (1 - ratio);
  if (mode === 'verticalLeft') {
    const lineX = width - AXIS_INSET;
    return {
      x1: lineX,
      y1: y,
      x2: lineX - length,
      y2: y,
      labelX: lineX - length - labelGap,
      labelY: y,
      labelAlign: 'right',
      labelBaseline: 'middle',
    };
  }
  const lineX = AXIS_INSET;
  return {
    x1: lineX,
    y1: y,
    x2: lineX + length,
    y2: y,
    labelX: lineX + length + labelGap,
    labelY: y,
    labelAlign: 'left',
    labelBaseline: 'middle',
  };
}
