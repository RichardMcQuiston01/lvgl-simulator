import type { LvObject } from '../core/LvObject.js';
import { inverseTransformPoint, resolveTransform } from '../rendering/transform.js';

/**
 * Finds the deepest (most specific) object in `root`'s subtree whose
 * bounds contain `(x, y)`, mirroring how a real UI dispatches a pointer
 * event to the innermost/topmost element under the cursor. Children are
 * checked in reverse order, since later children paint over earlier ones
 * (see `LvObject.render`) and so are visually on top. `root` itself is
 * only returned as a last resort, if no descendant matches. Hidden
 * objects (and their subtrees) are skipped, as are non-`clickable` objects
 * themselves (their children are still tested), matching LVGL's input search.
 */
export function hitTest(root: LvObject, x: number, y: number): LvObject | null {
  // Top-layer objects paint above everything, so they are tested first, last-painted first.
  const topLayer = collectTopLayer(root, []);
  for (let i = topLayer.length - 1; i >= 0; i -= 1) {
    const candidate = topLayer[i];
    const hit = candidate ? hitTestNode(candidate, x, y) : null;
    if (hit) {
      return hit;
    }
  }
  return hitTestNode(root, x, y);
}

/** Every visible top-layer object under `root`, in paint order. */
function collectTopLayer(root: LvObject, found: LvObject[]): LvObject[] {
  if (root.hidden) {
    return found;
  }
  for (const child of root.children) {
    if (child.topLayer && !child.hidden) {
      found.push(child);
    }
    collectTopLayer(child, found);
  }
  return found;
}

/** Hit-tests `root`'s subtree, skipping top-layer children (see {@link hitTest}). */
function hitTestNode(root: LvObject, x: number, y: number): LvObject | null {
  if (root.hidden) {
    return null;
  }
  // A transformed object (and its subtree) is hit-tested in its own
  // untransformed space: map the pointer back through the inverse transform.
  const transform = resolveTransform(root.resolvedStyle);
  if (transform) {
    const origin = root.getAbsolutePosition();
    ({ x, y } = inverseTransformPoint(transform, origin.x, origin.y, x, y));
  }
  // A scrolling container clips its children, so content scrolled out of
  // its bounds can't be hit.
  if (root.isScrollable && !containsPoint(root, x, y)) {
    return null;
  }
  for (let i = root.children.length - 1; i >= 0; i -= 1) {
    const child = root.children[i];
    if (!child) {
      continue;
    }
    if (child.topLayer) {
      continue;
    }
    const hit = hitTestNode(child, x, y);
    if (hit) {
      return hit;
    }
  }

  return root.clickable && containsPoint(root, x, y) ? root : null;
}

/** Whether `(x, y)` falls inside `object`'s untransformed bounds. */
function containsPoint(object: LvObject, x: number, y: number): boolean {
  const { x: objectX, y: objectY } = object.getAbsolutePosition();
  return x >= objectX && x < objectX + object.width && y >= objectY && y < objectY + object.height;
}
