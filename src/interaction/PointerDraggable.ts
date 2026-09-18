/**
 * Implemented by widgets that react to a pointer's ongoing position while
 * pressed (e.g. `Slider` computing its value from drag position), as
 * opposed to only reacting once on release (a plain click). The
 * interaction controller duck-types for this rather than special-casing
 * specific widget classes, so any future widget can opt in the same way.
 */
export interface PointerDraggable {
  /**
   * Called with the pointer's position local to this object's own bounds
   * (0, 0 is this object's top-left corner) on pointerdown and on every
   * pointermove while this object remains the active (captured) target.
   */
  handlePointerPosition(localX: number, localY: number): void;
}

export function isPointerDraggable(value: unknown): value is PointerDraggable {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Partial<PointerDraggable>).handlePointerPosition === 'function'
  );
}
