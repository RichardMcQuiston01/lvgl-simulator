import type { LvObject } from '../core/LvObject.js';

/** Which axes an object scrolls on, mirroring `lv_obj_set_scroll_dir` (`LV_DIR_*`). */
export type ScrollDirection = 'all' | 'horizontal' | 'vertical' | 'none';

/** Scrollbar visibility, mirroring `lv_scrollbar_mode_t` (`LV_SCROLLBAR_MODE_*`). */
export type ScrollbarMode = 'off' | 'on' | 'active' | 'auto';

/** Where a child edge lines up when a scroll settles, mirroring `lv_scroll_snap_t`. */
export type ScrollSnap = 'none' | 'start' | 'center' | 'end';

export interface ScrollRange {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

const NO_SCROLL: ScrollRange = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

/**
 * The scroll offsets `object` can reach: wide enough to bring every
 * visible, non-floating child (plus the object's own padding) into view.
 * Zero on an axis when the content fits, when `scrollable` is off, or when
 * `scrollDirection` excludes the axis. Reads child positions as last laid
 * out, so call it after a render.
 */
export function computeScrollRange(object: LvObject): ScrollRange {
  if (!object.scrollable || object.scrollDirection === 'none') {
    return NO_SCROLL;
  }

  const insets = object.scrollContentInsets;
  const padLeft = insets.left;
  const padRight = insets.right;
  const padTop = insets.top;
  const padBottom = insets.bottom;

  let minChildX = Infinity;
  let minChildY = Infinity;
  let maxChildRight = -Infinity;
  let maxChildBottom = -Infinity;
  for (const child of object.children) {
    if (child.hidden || child.floating) {
      continue;
    }
    minChildX = Math.min(minChildX, child.x);
    minChildY = Math.min(minChildY, child.y);
    maxChildRight = Math.max(maxChildRight, child.x + child.width);
    maxChildBottom = Math.max(maxChildBottom, child.y + child.height);
  }
  if (minChildX === Infinity) {
    return NO_SCROLL;
  }

  const horizontal = object.scrollDirection === 'all' || object.scrollDirection === 'horizontal';
  const vertical = object.scrollDirection === 'all' || object.scrollDirection === 'vertical';
  return {
    minX: horizontal ? Math.min(0, minChildX - padLeft) : 0,
    maxX: horizontal ? Math.max(0, maxChildRight + padRight - object.width) : 0,
    minY: vertical ? Math.min(0, minChildY - padTop) : 0,
    maxY: vertical ? Math.max(0, maxChildBottom + padBottom - object.height) : 0,
  };
}

/** Whether `object` has room to scroll further in the direction of the offset change `(dx, dy)`. */
export function canScrollToward(object: LvObject, dx: number, dy: number): boolean {
  const range = computeScrollRange(object);
  if (dy > 0 && object.scrollY < range.maxY) {
    return true;
  }
  if (dy < 0 && object.scrollY > range.minY) {
    return true;
  }
  if (dx > 0 && object.scrollX < range.maxX) {
    return true;
  }
  return dx < 0 && object.scrollX > range.minX;
}

/** The nearest ancestor-or-self of `start` that can scroll toward `(dx, dy)`, chaining past objects already at their edge. */
export function findScrollTarget(start: LvObject, dx: number, dy: number): LvObject | null {
  for (let current: LvObject | null = start; current; current = current.parent) {
    if (canScrollToward(current, dx, dy)) {
      return current;
    }
  }
  return null;
}

/** Snaps one axis of a landing offset to the nearest child edge for `mode`, clamped to `[min, max]`. */
function snapAxis(
  object: LvObject,
  axis: 'x' | 'y',
  mode: ScrollSnap,
  landing: number,
  min: number,
  max: number,
): number {
  if (mode === 'none') {
    return landing;
  }
  const insets = object.scrollContentInsets;
  const viewport = axis === 'x' ? object.width : object.height;
  const padStart = axis === 'x' ? insets.left : insets.top;
  const padEnd = axis === 'x' ? insets.right : insets.bottom;

  let best = landing;
  let bestDistance = Infinity;
  for (const child of object.children) {
    if (child.hidden || child.floating) {
      continue;
    }
    const start = axis === 'x' ? child.x : child.y;
    const size = axis === 'x' ? child.width : child.height;
    let target: number;
    if (mode === 'start') {
      target = start - padStart;
    } else if (mode === 'center') {
      target = start + size / 2 - viewport / 2;
    } else {
      target = start + size + padEnd - viewport;
    }
    target = Math.max(min, Math.min(max, target));
    const distance = Math.abs(target - landing);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = target;
    }
  }
  return best;
}

/** Adjusts a landing offset to the nearest child edge per the object's `scrollSnapX`/`scrollSnapY`, clamped to its range. */
export function applyScrollSnap(
  object: LvObject,
  landingX: number,
  landingY: number,
): { readonly x: number; readonly y: number } {
  const range = computeScrollRange(object);
  const clampedX = Math.max(range.minX, Math.min(range.maxX, landingX));
  const clampedY = Math.max(range.minY, Math.min(range.maxY, landingY));
  return {
    x: snapAxis(object, 'x', object.scrollSnapX, clampedX, range.minX, range.maxX),
    y: snapAxis(object, 'y', object.scrollSnapY, clampedY, range.minY, range.maxY),
  };
}
