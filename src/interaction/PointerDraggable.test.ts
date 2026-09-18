import { describe, expect, it } from 'vitest';
import { isPointerDraggable } from './PointerDraggable';

describe('isPointerDraggable', () => {
  it('returns true for an object with a handlePointerPosition method', () => {
    expect(isPointerDraggable({ handlePointerPosition: () => {} })).toBe(true);
  });

  it('returns false for an object without one', () => {
    expect(isPointerDraggable({})).toBe(false);
  });

  it('returns false for a non-function handlePointerPosition property', () => {
    expect(isPointerDraggable({ handlePointerPosition: 'nope' })).toBe(false);
  });

  it('returns false for null and primitives', () => {
    expect(isPointerDraggable(null)).toBe(false);
    expect(isPointerDraggable(undefined)).toBe(false);
    expect(isPointerDraggable(42)).toBe(false);
    expect(isPointerDraggable('string')).toBe(false);
  });
});
