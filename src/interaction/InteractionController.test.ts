import { describe, expect, it, vi } from 'vitest';
import { LvObject } from '../core/LvObject.js';
import { createFakeCanvas } from '../testing/fakeCanvas.js';
import { attachInteraction } from './InteractionController.js';
import type { PointerDraggable } from './PointerDraggable.js';

function pointerEvent(overrides: Partial<PointerEvent> = {}): Partial<PointerEvent> {
  return { pointerId: 1, offsetX: 0, offsetY: 0, ...overrides };
}

describe('attachInteraction', () => {
  it('presses the hit object and fires "pressed" on pointerdown', () => {
    const canvas = createFakeCanvas();
    const screen = new LvObject({ width: 100, height: 100 });
    const button = new LvObject({ x: 10, y: 10, width: 20, height: 20 });
    screen.addChild(button);
    const pressed = vi.fn();
    button.addEventListener('pressed', pressed);
    const render = vi.fn();

    attachInteraction(canvas, screen, render);
    canvas.dispatch('pointerdown', pointerEvent({ offsetX: 15, offsetY: 15 }));

    expect(button.pressed).toBe(true);
    expect(pressed).toHaveBeenCalledWith({ target: button });
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('does nothing on pointerdown when the point is outside the screen entirely', () => {
    const canvas = createFakeCanvas();
    const screen = new LvObject({ width: 100, height: 100 });
    const button = new LvObject({ x: 10, y: 10, width: 20, height: 20 });
    screen.addChild(button);
    const render = vi.fn();

    attachInteraction(canvas, screen, render);
    canvas.dispatch('pointerdown', pointerEvent({ offsetX: 200, offsetY: 200 }));

    expect(button.pressed).toBe(false);
    expect(render).not.toHaveBeenCalled();
  });

  it('never presses a disabled object', () => {
    const canvas = createFakeCanvas();
    const screen = new LvObject({ width: 100, height: 100 });
    const button = new LvObject({ x: 10, y: 10, width: 20, height: 20, disabled: true });
    screen.addChild(button);
    const clicked = vi.fn();
    button.addEventListener('clicked', clicked);
    const render = vi.fn();

    attachInteraction(canvas, screen, render);
    canvas.dispatch('pointerdown', pointerEvent({ offsetX: 15, offsetY: 15 }));
    canvas.dispatch('pointerup', pointerEvent({ offsetX: 15, offsetY: 15 }));

    expect(button.pressed).toBe(false);
    expect(clicked).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });

  it('fires "clicked" when release lands back on the pressed object', () => {
    const canvas = createFakeCanvas();
    const screen = new LvObject({ width: 100, height: 100 });
    const button = new LvObject({ x: 10, y: 10, width: 20, height: 20 });
    screen.addChild(button);
    const released = vi.fn();
    const clicked = vi.fn();
    button.addEventListener('released', released);
    button.addEventListener('clicked', clicked);

    attachInteraction(canvas, screen, vi.fn());
    canvas.dispatch('pointerdown', pointerEvent({ offsetX: 15, offsetY: 15 }));
    canvas.dispatch('pointerup', pointerEvent({ offsetX: 18, offsetY: 18 }));

    expect(button.pressed).toBe(false);
    expect(released).toHaveBeenCalledWith({ target: button });
    expect(clicked).toHaveBeenCalledWith({ target: button });
  });

  it('does not fire "clicked" when release lands outside the pressed object', () => {
    const canvas = createFakeCanvas();
    const screen = new LvObject({ width: 100, height: 100 });
    const button = new LvObject({ x: 10, y: 10, width: 20, height: 20 });
    screen.addChild(button);
    const released = vi.fn();
    const clicked = vi.fn();
    button.addEventListener('released', released);
    button.addEventListener('clicked', clicked);

    attachInteraction(canvas, screen, vi.fn());
    canvas.dispatch('pointerdown', pointerEvent({ offsetX: 15, offsetY: 15 }));
    canvas.dispatch('pointerup', pointerEvent({ offsetX: 90, offsetY: 90 }));

    expect(button.pressed).toBe(false);
    expect(released).toHaveBeenCalledTimes(1);
    expect(clicked).not.toHaveBeenCalled();
  });

  it('ignores pointerup/pointermove from a pointerId that is not the active one', () => {
    const canvas = createFakeCanvas();
    const screen = new LvObject({ width: 100, height: 100 });
    const button = new LvObject({ x: 10, y: 10, width: 20, height: 20 });
    screen.addChild(button);

    attachInteraction(canvas, screen, vi.fn());
    canvas.dispatch('pointerdown', pointerEvent({ pointerId: 1, offsetX: 15, offsetY: 15 }));
    canvas.dispatch('pointerup', pointerEvent({ pointerId: 2, offsetX: 15, offsetY: 15 }));

    expect(button.pressed).toBe(true); // the real (id 1) press is still active
  });

  it('forwards pointer position to a PointerDraggable target on press and on move', () => {
    const canvas = createFakeCanvas();
    const screen = new LvObject({ width: 100, height: 100 });

    class DraggableWidget extends LvObject implements PointerDraggable {
      readonly positions: Array<{ x: number; y: number }> = [];
      handlePointerPosition(localX: number, localY: number): void {
        this.positions.push({ x: localX, y: localY });
      }
    }

    const slider = new DraggableWidget({ x: 10, y: 10, width: 50, height: 10 });
    screen.addChild(slider);
    const render = vi.fn();

    attachInteraction(canvas, screen, render);
    canvas.dispatch('pointerdown', pointerEvent({ offsetX: 20, offsetY: 15 }));
    canvas.dispatch('pointermove', pointerEvent({ offsetX: 30, offsetY: 15 }));

    expect(slider.positions).toEqual([
      { x: 10, y: 5 },
      { x: 20, y: 5 },
    ]);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('does not forward pointermove to a non-draggable active object', () => {
    const canvas = createFakeCanvas();
    const screen = new LvObject({ width: 100, height: 100 });
    const button = new LvObject({ x: 10, y: 10, width: 20, height: 20 });
    screen.addChild(button);
    const render = vi.fn();

    attachInteraction(canvas, screen, render);
    canvas.dispatch('pointerdown', pointerEvent({ offsetX: 15, offsetY: 15 }));
    render.mockClear();
    canvas.dispatch('pointermove', pointerEvent({ offsetX: 16, offsetY: 16 }));

    expect(render).not.toHaveBeenCalled();
  });

  it('resets pressed state without firing "clicked" on pointercancel', () => {
    const canvas = createFakeCanvas();
    const screen = new LvObject({ width: 100, height: 100 });
    const button = new LvObject({ x: 10, y: 10, width: 20, height: 20 });
    screen.addChild(button);
    const released = vi.fn();
    const clicked = vi.fn();
    button.addEventListener('released', released);
    button.addEventListener('clicked', clicked);

    attachInteraction(canvas, screen, vi.fn());
    canvas.dispatch('pointerdown', pointerEvent({ offsetX: 15, offsetY: 15 }));
    canvas.dispatch('pointercancel', pointerEvent({ offsetX: 15, offsetY: 15 }));

    expect(button.pressed).toBe(false);
    expect(released).toHaveBeenCalledTimes(1);
    expect(clicked).not.toHaveBeenCalled();
  });

  it('captures and releases the pointer when the canvas supports it', () => {
    const canvas = createFakeCanvas({ withPointerCapture: true });
    const screen = new LvObject({ width: 100, height: 100 });
    const button = new LvObject({ x: 10, y: 10, width: 20, height: 20 });
    screen.addChild(button);

    attachInteraction(canvas, screen, vi.fn());
    canvas.dispatch('pointerdown', pointerEvent({ pointerId: 7, offsetX: 15, offsetY: 15 }));
    canvas.dispatch('pointerup', pointerEvent({ pointerId: 7, offsetX: 15, offsetY: 15 }));

    expect(canvas.setPointerCapture).toHaveBeenCalledWith(7);
    expect(canvas.releasePointerCapture).toHaveBeenCalledWith(7);
  });

  it('does not throw when the canvas lacks pointer capture support (matches jsdom)', () => {
    const canvas = createFakeCanvas({ withPointerCapture: false });
    const screen = new LvObject({ width: 100, height: 100 });
    const button = new LvObject({ x: 10, y: 10, width: 20, height: 20 });
    screen.addChild(button);

    attachInteraction(canvas, screen, vi.fn());

    expect(() => {
      canvas.dispatch('pointerdown', pointerEvent({ offsetX: 15, offsetY: 15 }));
      canvas.dispatch('pointerup', pointerEvent({ offsetX: 15, offsetY: 15 }));
    }).not.toThrow();
  });

  it('dispose() stops responding to further pointer input', () => {
    const canvas = createFakeCanvas();
    const screen = new LvObject({ width: 100, height: 100 });
    const button = new LvObject({ x: 10, y: 10, width: 20, height: 20 });
    screen.addChild(button);

    const controller = attachInteraction(canvas, screen, vi.fn());
    controller.dispose();
    canvas.dispatch('pointerdown', pointerEvent({ offsetX: 15, offsetY: 15 }));

    expect(button.pressed).toBe(false);
  });
});
