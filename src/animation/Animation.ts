import { easings, type EasingFunction, type EasingName } from './easing.js';

/**
 * Options for {@link AnimationEngine.start}, mirroring `lv_anim_t`: a value
 * tweened from `from` to `to` over `durationMs`, optionally delayed,
 * played back in reverse, and repeated.
 */
export interface AnimationOptions {
  readonly from: number;
  readonly to: number;
  readonly durationMs: number;
  readonly delayMs?: number;
  readonly easing?: EasingName | EasingFunction;
  /** Total plays, `Infinity` for forever. Default 1. Mirrors `lv_anim_set_repeat_count`. */
  readonly repeatCount?: number;
  /** Pause between repeats. Mirrors `lv_anim_set_repeat_delay`. */
  readonly repeatDelayMs?: number;
  /** Duration of the reverse `to` → `from` pass; 0 (default) disables playback. */
  readonly playbackDurationMs?: number;
  /** Pause before the reverse pass starts. */
  readonly playbackDelayMs?: number;
  readonly onUpdate: (value: number) => void;
  readonly onComplete?: () => void;
}

export interface AnimationHandle {
  /** Stops the animation without calling `onComplete`. No-op once finished. */
  cancel(): void;
  readonly finished: boolean;
}

export interface AnimationFrameScheduler {
  requestFrame(callback: () => void): number;
  cancelFrame(handle: number): void;
}

export interface AnimationEngineOptions {
  /** Clock in ms. Defaults to `performance.now()`. */
  readonly now?: () => number;
  /**
   * Schedules frames while any animation is active. Defaults to
   * `requestAnimationFrame` when available; pass `null` to drive the
   * engine manually with {@link AnimationEngine.tick} (e.g. in tests).
   */
  readonly scheduler?: AnimationFrameScheduler | null;
  /** Called after every engine frame, e.g. to repaint the canvas. */
  readonly onFrame?: () => void;
}

export interface AnimationEngine {
  start(options: AnimationOptions): AnimationHandle;
  /** Advances all animations to `nowMs` (same clock as `options.now`). Called automatically when a scheduler is set. */
  tick(nowMs: number): void;
  readonly activeCount: number;
  cancelAll(): void;
}

interface ActiveAnimation {
  readonly options: AnimationOptions;
  readonly startMs: number;
  readonly easing: EasingFunction;
  readonly handle: { finished: boolean; cancel(): void };
}

/** Evaluates `options` at `elapsedMs` since the end of its start delay. Returns `done` once all repeats finish. */
export function evaluateAnimation(
  options: AnimationOptions,
  elapsedMs: number,
  easing: EasingFunction,
): { readonly value: number; readonly done: boolean } {
  const { from, to } = options;
  const forward = Math.max(0, options.durationMs);
  const playback = Math.max(0, options.playbackDurationMs ?? 0);
  const playbackDelay = playback > 0 ? Math.max(0, options.playbackDelayMs ?? 0) : 0;
  const repeatDelay = Math.max(0, options.repeatDelayMs ?? 0);
  const repeatCount = options.repeatCount ?? 1;
  const restValue = playback > 0 ? from : to;

  const playLength = forward + playbackDelay + playback;
  const cycleLength = playLength + repeatDelay;
  const cycle = cycleLength > 0 ? Math.floor(elapsedMs / cycleLength) : repeatCount;
  if (cycle >= repeatCount) {
    return { value: restValue, done: true };
  }

  const t = cycleLength > 0 ? elapsedMs - cycle * cycleLength : 0;
  const lerp = (a: number, b: number, progress: number): number => a + (b - a) * progress;
  if (t < forward) {
    return { value: lerp(from, to, easing(t / forward)), done: false };
  }
  if (t < forward + playbackDelay) {
    return { value: to, done: false };
  }
  if (t < playLength) {
    return { value: lerp(to, from, easing((t - forward - playbackDelay) / playback)), done: false };
  }
  return { value: restValue, done: false };
}

/** Creates an {@link AnimationEngine}. With a scheduler (the default `requestAnimationFrame`) it ticks itself while any animation is active; with `scheduler: null` it is driven manually through `tick`. */
export function createAnimationEngine(options: AnimationEngineOptions = {}): AnimationEngine {
  const now = options.now ?? ((): number => performance.now());
  const scheduler = options.scheduler === undefined ? getDefaultScheduler() : options.scheduler;
  const active = new Set<ActiveAnimation>();
  let frameHandle: number | null = null;

  /** Requests the next engine frame while an animation is active and none is already pending. */
  function scheduleFrame(): void {
    if (!scheduler || frameHandle !== null || active.size === 0) {
      return;
    }
    frameHandle = scheduler.requestFrame(() => {
      frameHandle = null;
      engine.tick(now());
      options.onFrame?.();
      scheduleFrame();
    });
  }

  const engine: AnimationEngine = {
    /** Registers `animation`, starting after its `delayMs`, and returns a handle that can cancel it. */
    start(animation: AnimationOptions): AnimationHandle {
      const easing =
        typeof animation.easing === 'function'
          ? animation.easing
          : easings[animation.easing ?? 'linear'];
      const entry: ActiveAnimation = {
        options: animation,
        startMs: now() + Math.max(0, animation.delayMs ?? 0),
        easing,
        handle: {
          finished: false,
          /** Stops this animation without calling `onComplete`. No-op once finished. */
          cancel(): void {
            if (!entry.handle.finished) {
              entry.handle.finished = true;
              active.delete(entry);
            }
          },
        },
      };
      active.add(entry);
      scheduleFrame();
      return entry.handle;
    },

    /** Advances every active animation to `nowMs`, delivering `onUpdate` values and `onComplete` for the ones that finish. */
    tick(nowMs: number): void {
      for (const entry of [...active]) {
        if (entry.handle.finished || nowMs < entry.startMs) {
          continue;
        }
        const { value, done } = evaluateAnimation(
          entry.options,
          nowMs - entry.startMs,
          entry.easing,
        );
        entry.options.onUpdate(value);
        if (done && !entry.handle.finished) {
          entry.handle.finished = true;
          active.delete(entry);
          entry.options.onComplete?.();
        }
      }
    },

    get activeCount(): number {
      return active.size;
    },

    /** Cancels every active animation without calling their `onComplete` callbacks. */
    cancelAll(): void {
      for (const entry of [...active]) {
        entry.handle.cancel();
      }
    },
  };

  return engine;
}

/** One step of a {@link startTimeline}: `animation` begins `atMs` after the timeline starts. */
export interface TimelineEntry {
  readonly atMs: number;
  readonly animation: AnimationOptions;
}

/** Starts several animations at fixed offsets, mirroring `lv_anim_timeline`. Cancelling the handle cancels them all. */
export function startTimeline(
  engine: AnimationEngine,
  entries: readonly TimelineEntry[],
): AnimationHandle {
  const handles = entries.map((entry) =>
    engine.start({
      ...entry.animation,
      delayMs: (entry.animation.delayMs ?? 0) + entry.atMs,
    }),
  );
  return {
    /** Cancels every animation in the timeline. */
    cancel(): void {
      for (const handle of handles) {
        handle.cancel();
      }
    },
    get finished(): boolean {
      return handles.every((handle) => handle.finished);
    },
  };
}

/** The `requestAnimationFrame` scheduler, or `null` outside a browser. */
function getDefaultScheduler(): AnimationFrameScheduler | null {
  if (typeof requestAnimationFrame !== 'function') {
    return null;
  }
  return {
    requestFrame: (callback) => requestAnimationFrame(() => callback()),
    cancelFrame: (handle) => cancelAnimationFrame(handle),
  };
}
