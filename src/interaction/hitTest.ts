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
    const hit = hitTest(child, x, y);
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
