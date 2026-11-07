import type { LvObject } from '../core/LvObject.js';
import type { LvGestureDirection } from '../events/LvEvent.js';
import type { AnimationEngine, AnimationHandle } from '../animation/Animation.js';
import type { FocusGroup } from '../focus/FocusGroup.js';
import { applyScrollSnap, findScrollTarget } from '../scroll/scrollMath.js';
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
  /**
   * Animation engine used for scroll throws and snap settling. Without it,
   * a released scroll stops where it is (still honoring snap, instantly).
   */
  readonly animations?: AnimationEngine;
  /** Pressing an object that belongs to this group focuses it (LVGL's pointer-to-group behavior). */
  readonly focusGroup?: FocusGroup;
  /** How far a scroll throw coasts, as a multiple of release velocity in ms. Default 250. */
  readonly scrollThrowMs?: number;
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
  const scrollThrowMs = options.scrollThrowMs ?? 250;

  let activeObject: LvObject | null = null;
  let activePointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressRepeatTimer: ReturnType<typeof setInterval> | null = null;
  let scrollTarget: LvObject | null = null;
  let scrollThrow: AnimationHandle | null = null;
  let scrollThrowTarget: LvObject | null = null;
  let lastX = 0;
  let lastY = 0;
  let lastTime = 0;
  let velocityX = 0;
  let velocityY = 0;

  /** Cancels any pending long-press timeout and its repeat interval. */
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
    clearLongPress();
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

  function endScroll(target: LvObject): void {
    target.scrolling = false;
    target.dispatchEvent('scrollEnd');
    render();
  }

  /** Coasts `target` with the release velocity, then settles on its snap point. */
  function releaseScroll(target: LvObject): void {
    const landing = applyScrollSnap(
      target,
      target.scrollX + velocityX * scrollThrowMs,
      target.scrollY + velocityY * scrollThrowMs,
    );
    const startX = target.scrollX;
    const startY = target.scrollY;
    const distance = Math.hypot(landing.x - startX, landing.y - startY);
    if (!options.animations || distance < 0.5) {
      target.scrollTo(landing.x, landing.y);
      endScroll(target);
      return;
    }
    scrollThrowTarget = target;
    scrollThrow = options.animations.start({
      from: 0,
      to: 1,
      durationMs: Math.min(800, Math.max(150, distance * 3)),
      easing: 'easeOut',
      onUpdate: (progress) =>
        target.scrollTo(
          startX + (landing.x - startX) * progress,
          startY + (landing.y - startY) * progress,
        ),
      onComplete: () => {
        scrollThrow = null;
        scrollThrowTarget = null;
        endScroll(target);
      },
    });
  }

  /** Classifies a press-to-release displacement as a swipe direction, or `null` when it is under the gesture limit. */
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

  /** Starts a press: hit-tests the pointer, focuses the target, dispatches `pressed`, and arms the long-press timer. */
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
    lastX = startX;
    lastY = startY;
    lastTime = event.timeStamp ?? 0;
    velocityX = 0;
    velocityY = 0;
    scrollTarget = null;
    if (scrollThrow) {
      scrollThrow.cancel();
      scrollThrow = null;
      // cancel() skips onComplete, so close out the interrupted throw here.
      if (scrollThrowTarget) {
        endScroll(scrollThrowTarget);
        scrollThrowTarget = null;
      }
    }

    options.focusGroup?.focus(hit);
    hit.pressed = true;
    hit.dispatchEvent('pressed');
    startLongPress(hit);

    if (isPointerDraggable(hit)) {
      const local = localPosition(hit, event.offsetX, event.offsetY);
      hit.handlePointerPosition(local.x, local.y);
    }

    render();
  }

  /** Tracks pointer movement: cancels a long press past the scroll limit, forwards position to draggable widgets, and otherwise scrolls the nearest scrollable ancestor. */
  function onPointerMove(event: PointerEvent): void {
    if (!activeObject || event.pointerId !== activePointerId) {
      return;
    }
    const traveled = Math.hypot(event.offsetX - startX, event.offsetY - startY);
    if (traveled > scrollLimit) {
      clearLongPress();
    }

    if (!isPointerDraggable(activeObject)) {
      if (!scrollTarget && traveled > scrollLimit) {
        // The scroll offset moves opposite to the pointer.
        const dx = startX - event.offsetX;
        const dy = startY - event.offsetY;
        const vertical = Math.abs(dy) >= Math.abs(dx);
        const candidate = findScrollTarget(activeObject, vertical ? 0 : dx, vertical ? dy : 0);
        if (candidate) {
          scrollTarget = candidate;
          activeObject.pressed = false;
          activeObject.dispatchEvent('pressLost');
          candidate.scrolling = true;
          candidate.dispatchEvent('scrollBegin');
        }
      }
      if (scrollTarget) {
        const elapsed = Math.max(1, (event.timeStamp ?? lastTime + 16) - lastTime);
        const moveX = lastX - event.offsetX;
        const moveY = lastY - event.offsetY;
        velocityX = 0.7 * velocityX + 0.3 * (moveX / elapsed);
        velocityY = 0.7 * velocityY + 0.3 * (moveY / elapsed);
        scrollTarget.scrollBy(moveX, moveY);
        lastX = event.offsetX;
        lastY = event.offsetY;
        lastTime = event.timeStamp ?? lastTime + 16;
        render();
      }
      return;
    }

    const local = localPosition(activeObject, event.offsetX, event.offsetY);
    activeObject.handlePointerPosition(local.x, local.y);
    render();
  }

  /** Ends a press: finishes any scroll, otherwise dispatches `released` and then `gesture` or `clicked`. */
  function onPointerUp(event: PointerEvent): void {
    if (!activeObject || event.pointerId !== activePointerId) {
      return;
    }

    const releasedObject = activeObject;
    canvas.releasePointerCapture?.(event.pointerId);
    activeObject = null;
    activePointerId = null;
    clearLongPress();

    if (scrollTarget) {
      const finishedTarget = scrollTarget;
      scrollTarget = null;
      releasedObject.pressed = false;
      releaseScroll(finishedTarget);
      render();
      return;
    }

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

  /** Abandons a press when the browser cancels the pointer, dispatching `released` (or finishing a scroll) without a click. */
  function onPointerCancel(event: PointerEvent): void {
    if (!activeObject || event.pointerId !== activePointerId) {
      return;
    }

    canvas.releasePointerCapture?.(event.pointerId);
    const releasedObject = activeObject;
    activeObject = null;
    activePointerId = null;
    clearLongPress();

    if (scrollTarget) {
      const finishedTarget = scrollTarget;
      scrollTarget = null;
      releasedObject.pressed = false;
      releaseScroll(finishedTarget);
      return;
    }

    releasedObject.pressed = false;
    releasedObject.dispatchEvent('released');

    render();
  }

  /** Scrolls the nearest scrollable ancestor under the pointer by the wheel delta, preventing the page scroll only when it consumed the event. */
  function onWheel(event: WheelEvent): void {
    const scale = event.deltaMode === 1 ? 16 : 1;
    const dx = event.deltaX * scale;
    const dy = event.deltaY * scale;
    const hit = hitTest(screen, event.offsetX, event.offsetY);
    if (!hit) {
      return;
    }
    const vertical = Math.abs(dy) >= Math.abs(dx);
    const target = findScrollTarget(hit, vertical ? 0 : dx, vertical ? dy : 0);
    if (!target) {
      return;
    }
    event.preventDefault?.();
    target.scrollBy(vertical ? 0 : dx, vertical ? dy : 0);
    render();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  return {
    dispose(): void {
      clearLongPress();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('wheel', onWheel);
    },
  };
}
