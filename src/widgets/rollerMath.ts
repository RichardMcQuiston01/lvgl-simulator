/**
 * Position, snapping and row layout for the `Roller` widget, kept free of
 * drawing so they are exactly testable. A roller's position is a fractional
 * row index: 2.0 has option 2 centred, 2.5 sits halfway to option 3.
 */

/** Wraps `index` into `0..count-1`, so -1 is the last option. Returns 0 when there are no options. */
export function wrapIndex(index: number, count: number): number {
  if (count <= 0) {
    return 0;
  }
  return ((index % count) + count) % count;
}

/** Keeps `position` on the rows: clamped to the first and last option, or left free when `infinite`. */
export function constrainPosition(position: number, count: number, infinite: boolean): number {
  if (infinite) {
    return position;
  }
  return Math.min(Math.max(0, count - 1), Math.max(0, position));
}

/** The option nearest the centre at `position`. */
export function selectedAt(position: number, count: number, infinite: boolean): number {
  const nearest = Math.round(position);
  return infinite
    ? wrapIndex(nearest, count)
    : Math.min(Math.max(0, count - 1), Math.max(0, nearest));
}

/** The position after dragging `dragPixels` (positive is downward, which reveals earlier options) from `startPosition`. */
export function positionAfterDrag(
  startPosition: number,
  dragPixels: number,
  rowHeight: number,
  count: number,
  infinite: boolean,
): number {
  if (rowHeight <= 0) {
    return startPosition;
  }
  return constrainPosition(startPosition - dragPixels / rowHeight, count, infinite);
}

/**
 * The row a released drag settles on: the nearest row to where a throw with
 * `velocity` (rows per ms) would coast to after `throwMs`, kept on the rows.
 * With no velocity this is plain snapping to the nearest row.
 */
export function settleTarget(
  position: number,
  velocity: number,
  throwMs: number,
  count: number,
  infinite: boolean,
): number {
  const coasted = position + velocity * throwMs;
  return constrainPosition(Math.round(coasted), count, infinite);
}

/** One option to draw: its index in the option list and its offset from the centre, in rows. */
export interface RollerSlot {
  readonly optionIndex: number;
  /** Rows above (negative) or below (positive) the centre; fractional while moving. */
  readonly offset: number;
}

/**
 * The options to draw around `position` for a roller showing `visibleRows`
 * rows, including one partly-visible row beyond each edge. When not
 * `infinite`, positions before the first or after the last option are empty.
 */
export function visibleSlots(
  position: number,
  visibleRows: number,
  count: number,
  infinite: boolean,
): readonly RollerSlot[] {
  if (count <= 0) {
    return [];
  }
  const reach = Math.ceil(visibleRows / 2);
  const centreRow = Math.round(position);
  const slots: RollerSlot[] = [];
  for (let row = centreRow - reach; row <= centreRow + reach; row += 1) {
    if (!infinite && (row < 0 || row >= count)) {
      continue;
    }
    slots.push({ optionIndex: wrapIndex(row, count), offset: row - position });
  }
  return slots;
}
