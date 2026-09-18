import { describe, expect, it, vi } from 'vitest';
import { createRenderLoop, type RenderLoopScheduler } from './RenderLoop.js';

function createFakeScheduler(): RenderLoopScheduler & { readonly pendingCount: number } {
  let nextHandle = 1;
  const pending = new Map<number, FrameRequestCallback>();

  return {
    requestFrame: vi.fn((callback: FrameRequestCallback) => {
      const handle = nextHandle++;
      pending.set(handle, callback);
      return handle;
    }),
    cancelFrame: vi.fn((handle: number) => {
      pending.delete(handle);
    }),
    get pendingCount() {
      return pending.size;
    },
  };
}

describe('createRenderLoop', () => {
  it('schedules a frame and calls render on it', () => {
    const scheduler = createFakeScheduler();
    const render = vi.fn();
    const loop = createRenderLoop(render, scheduler);

    loop.start();

    expect(scheduler.requestFrame).toHaveBeenCalledTimes(1);
    expect(render).not.toHaveBeenCalled();
  });

  it('re-schedules itself after each frame (full-repaint loop)', () => {
    const scheduler = createFakeScheduler();
    const render = vi.fn();
    let frame: FrameRequestCallback | undefined;
    (scheduler.requestFrame as ReturnType<typeof vi.fn>).mockImplementation((callback) => {
      frame = callback;
      return 1;
    });

    const loop = createRenderLoop(render, scheduler);
    loop.start();

    frame?.(0);
    frame?.(16);

    expect(render).toHaveBeenCalledTimes(2);
    expect(scheduler.requestFrame).toHaveBeenCalledTimes(3);
  });

  it('start() is a no-op while already running', () => {
    const scheduler = createFakeScheduler();
    const loop = createRenderLoop(vi.fn(), scheduler);

    loop.start();
    loop.start();

    expect(scheduler.requestFrame).toHaveBeenCalledTimes(1);
    expect(loop.isRunning).toBe(true);
  });

  it('stop() cancels the pending frame and marks the loop as not running', () => {
    const scheduler = createFakeScheduler();
    const loop = createRenderLoop(vi.fn(), scheduler);

    loop.start();
    loop.stop();

    expect(scheduler.cancelFrame).toHaveBeenCalledTimes(1);
    expect(loop.isRunning).toBe(false);
    expect(scheduler.pendingCount).toBe(0);
  });

  it('stop() is a no-op when not running', () => {
    const scheduler = createFakeScheduler();
    const loop = createRenderLoop(vi.fn(), scheduler);

    expect(() => loop.stop()).not.toThrow();
    expect(scheduler.cancelFrame).not.toHaveBeenCalled();
  });
});
