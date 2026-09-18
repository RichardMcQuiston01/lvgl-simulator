/**
 * Frame scheduler abstraction so {@link createRenderLoop} isn't hard-wired
 * to the global `requestAnimationFrame`/`cancelAnimationFrame` (useful for
 * tests, and for any future host environment that supplies its own clock).
 */
export interface RenderLoopScheduler {
  requestFrame(callback: FrameRequestCallback): number;
  cancelFrame(handle: number): void;
}

export interface RenderLoop {
  readonly isRunning: boolean;
  start(): void;
  stop(): void;
}

/**
 * Drives `render` on every animation frame using a full-repaint strategy —
 * `render` is expected to redraw the whole tree each call. A dirty-rect
 * strategy can replace this once profiling shows the full repaint is a
 * bottleneck (see docs/PLAN.md, Stage 1).
 */
export function createRenderLoop(
  render: () => void,
  scheduler: RenderLoopScheduler = getDefaultScheduler(),
): RenderLoop {
  let frameHandle: number | null = null;

  function tick(): void {
    render();
    frameHandle = scheduler.requestFrame(tick);
  }

  return {
    get isRunning(): boolean {
      return frameHandle !== null;
    },
    start(): void {
      if (frameHandle !== null) {
        return;
      }
      frameHandle = scheduler.requestFrame(tick);
    },
    stop(): void {
      if (frameHandle === null) {
        return;
      }
      scheduler.cancelFrame(frameHandle);
      frameHandle = null;
    },
  };
}

function getDefaultScheduler(): RenderLoopScheduler {
  return {
    requestFrame: (callback) => window.requestAnimationFrame(callback),
    cancelFrame: (handle) => window.cancelAnimationFrame(handle),
  };
}
