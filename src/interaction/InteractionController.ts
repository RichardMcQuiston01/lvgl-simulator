import type { LvObject } from '../core/LvObject';
import { hitTest } from './hitTest';
import { isPointerDraggable } from './PointerDraggable';

export interface InteractionController {
  /** Stops listening for pointer input on the canvas. */
  dispose(): void;
}

/**
 * Wires pointer/touch input on `canvas` to `screen`'s object tree, mirroring
 * LVGL's input driver → object dispatch: hit-tests the pointer position,
 * drives `pressed`/`released` state and events on the hit object, fires
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
): InteractionController {
  let activeObject: LvObject | null = null;
  let activePointerId: number | null = null;

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

    hit.pressed = true;
    hit.dispatchEvent('pressed');

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

    releasedObject.pressed = false;
    releasedObject.dispatchEvent('released');

    if (hitTest(screen, event.offsetX, event.offsetY) === releasedObject) {
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
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
    },
  };
}
