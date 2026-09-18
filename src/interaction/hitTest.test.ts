import { describe, expect, it } from 'vitest';
import { LvObject } from '../core/LvObject';
import { hitTest } from './hitTest';

describe('hitTest', () => {
  it('returns the root when the point is within its bounds and it has no children', () => {
    const root = new LvObject({ width: 100, height: 100 });

    expect(hitTest(root, 50, 50)).toBe(root);
  });

  it('returns null when the point is outside the root', () => {
    const root = new LvObject({ width: 100, height: 100 });

    expect(hitTest(root, 150, 150)).toBeNull();
  });

  it('prefers the deepest matching descendant over its ancestors', () => {
    const root = new LvObject({ width: 100, height: 100 });
    const child = new LvObject({ x: 10, y: 10, width: 50, height: 50 });
    const grandchild = new LvObject({ x: 5, y: 5, width: 10, height: 10 });
    root.addChild(child);
    child.addChild(grandchild);

    // Absolute position of grandchild is (15, 15) to (25, 25).
    expect(hitTest(root, 20, 20)).toBe(grandchild);
  });

  it('falls back to the parent when the point misses all children', () => {
    const root = new LvObject({ width: 100, height: 100 });
    const child = new LvObject({ x: 10, y: 10, width: 10, height: 10 });
    root.addChild(child);

    expect(hitTest(root, 50, 50)).toBe(root);
  });

  it('prefers a later (visually topmost) sibling when overlapping', () => {
    const root = new LvObject({ width: 100, height: 100 });
    const first = new LvObject({ x: 0, y: 0, width: 50, height: 50 });
    const second = new LvObject({ x: 0, y: 0, width: 50, height: 50 });
    root.addChild(first);
    root.addChild(second);

    expect(hitTest(root, 10, 10)).toBe(second);
  });

  it('treats the right/bottom edges as exclusive', () => {
    const root = new LvObject({ x: 0, y: 0, width: 10, height: 10 });

    expect(hitTest(root, 10, 5)).toBeNull();
    expect(hitTest(root, 5, 10)).toBeNull();
    expect(hitTest(root, 9, 9)).toBe(root);
  });
});
