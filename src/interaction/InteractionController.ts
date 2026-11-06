import type { LvObject } from '../core/LvObject.js';
import type { LvGestureDirection } from '../events/LvEvent.js';
import { hitTest } from './hitTest.js';
import { isPointerDraggable } from './PointerDraggable.js';

/** Tunables for {@link attachInteraction}, defaulting to LVGL's `LV_INDEV_DEF_*` values. */
export interface InteractionOptions {
  /** Hold time before `longPressed` fires (ms). Default 400. */
  readonly longPressTimeMs?: number;
  /** Interval between `longPressedRepeat` events after `longPressed` (ms). Default 100. */
  readonly longPressRepeatTimeMs?: number;
  /** Pointer travel (px) that cancels a pending long press. Default 10. */
  readonly scrollLimit?: number;
  /** Minimum travel (px) on the dominant axis for a release to count as a swipe. Default 50. */
  readonly gestureLimit?: number;
}

export interface InteractionController {
  /** Stops listening for pointer input on the canvas. */
  dispose(): void;
}

/**
 * Wires pointer/touch input on `canvas` to `screen`'s object tree, mirroring
 * LVGL's input driver → object dispatch: hit-tests the pointer position,
 * drives `pressed`/`released` state, `longPressed`/`longPressedRepeat` while held,
 * a `gesture` swipe event on release (in place of `clicked`), and events on the hit object, fires
 * `clicked` when a release lands back on the object it was pressed on, and
 * forwards the pointer's position — on press and every subsequent move,
 * while captured — to any hit object implementing {@link PointerDraggable}
 * (e.g. `Slider`, which reacts by updating its value and dispatching
 * `valueChanged`). A disabled object never becomes the active target, so it
 * neither presses nor drags nor clicks — matching LVGL's disabled state.
 *
 * Calls `render` after each interaction-driven change so the canvas
 * reflects it immediately, whether or not the render loop is running.
 */
export function attachInteraction(
  canvas: HTMLCanvasElement,
  screen: LvObject,
  render: () => void,
  options: InteractionOptions = {},
): InteractionController {
  const longPressTimeMs = options.longPressTimeMs ?? 400;
  const longPressRepeatTimeMs = options.longPressRepeatTimeMs ?? 100;
  const scrollLimit = options.scrollLimit ?? 10;
  const gestureLimit = options.gestureLimit ?? 50;

  let activeObject: LvObject | null = null;
  let activePointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressRepeatTimer: ReturnType<typeof setInterval> | null = null;

  function clearLongPress(): void {
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (longPressRepeatTimer !== null) {
      clearInterval(longPressRepeatTimer);
      longPressRepeatTimer = null;
    }
  }

  function startLongPress(target: LvObject): void {
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      target.dispatchEvent('longPressed');
      render();
      longPressRepeatTimer = setInterval(() => {
        target.dispatchEvent('longPressedRepeat');
        render();
      }, longPressRepeatTimeMs);
    }, longPressTimeMs);
  }

  function detectGesture(deltaX: number, deltaY: number): LvGestureDirection | null {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    if (Math.max(absX, absY) < gestureLimit) {
      return null;
    }
    if (absX >= absY) {
      return deltaX < 0 ? 'left' : 'right';
    }
    return deltaY < 0 ? 'top' : 'bottom';
  }

  function localPosition(object: LvObject, x: number, y: number): { x: number; y: number } {
    const { x: objectX, y: objectY } = object.getAbsolutePosition();
    return { x: x - objectX, y: y - objectY };
  }

  function onPointerDown(event: PointerEvent): void {
    const hit = hitTest(screen, event.offsetX, event.offsetY);
    if (!hit || hit.disabled) {
      return;
    }

    activeObject = hit;
    activePointerId = event.pointerId;
    canvas.setPointerCapture?.(event.pointerId);

    startX = event.offsetX;
    startY = event.offsetY;

    hit.pressed = true;
    hit.dispatchEvent('pressed');
    startLongPress(hit);

    if (isPointerDraggable(hit)) {
      const local = localPosition(hit, event.offsetX, event.offsetY);
      hit.handlePointerPosition(local.x, local.y);
    }

    render();
  }

  function onPointerMove(event: PointerEvent): void {
    if (!activeObject || event.pointerId !== activePointerId) {
      return;
    }
    if (Math.hypot(event.offsetX - startX, event.offsetY - startY) > scrollLimit) {
      clearLongPress();
    }
    if (!isPointerDraggable(activeObject)) {
      return;
    }

    const local = localPosition(activeObject, event.offsetX, event.offsetY);
    activeObject.handlePointerPosition(local.x, local.y);
    render();
  }

  function onPointerUp(event: PointerEvent): void {
    if (!activeObject || event.pointerId !== activePointerId) {
      return;
    }

    const releasedObject = activeObject;
    canvas.releasePointerCapture?.(event.pointerId);
    activeObject = null;
    activePointerId = null;
    clearLongPress();

    releasedObject.pressed = false;
    releasedObject.dispatchEvent('released');

    const direction = isPointerDraggable(releasedObject)
      ? null
      : detectGesture(event.offsetX - startX, event.offsetY - startY);
    if (direction) {
      releasedObject.dispatchEvent('gesture', { direction });
    } else if (hitTest(screen, event.offsetX, event.offsetY) === releasedObject) {
      releasedObject.dispatchEvent('clicked');
    }

    render();
  }

  function onPointerCancel(event: PointerEvent): void {
    if (!activeObject || event.pointerId !== activePointerId) {
      return;
    }

    canvas.releasePointerCapture?.(event.pointerId);
    const releasedObject = activeObject;
    activeObject = null;
    activePointerId = null;
    clearLongPress();

    releasedObject.pressed = false;
    releasedObject.dispatchEvent('released');

    render();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);

  return {
    dispose(): void {
      clearLongPress();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
    },
  };
}
