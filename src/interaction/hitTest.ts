import type { LvObject } from '../core/LvObject';

/**
 * Finds the deepest (most specific) object in `root`'s subtree whose
 * bounds contain `(x, y)`, mirroring how a real UI dispatches a pointer
 * event to the innermost/topmost element under the cursor. Children are
 * checked in reverse order, since later children paint over earlier ones
 * (see `LvObject.render`) and so are visually on top. `root` itself is
 * only returned as a last resort, if no descendant matches.
 */
export function hitTest(root: LvObject, x: number, y: number): LvObject | null {
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

  return containsPoint(root, x, y) ? root : null;
}

function containsPoint(object: LvObject, x: number, y: number): boolean {
  const { x: objectX, y: objectY } = object.getAbsolutePosition();
  return x >= objectX && x < objectX + object.width && y >= objectY && y < objectY + object.height;
}
