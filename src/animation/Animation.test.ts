import { describe, expect, it, vi } from 'vitest';
import { createAnimationEngine, evaluateAnimation, startTimeline } from './Animation.js';
import { cubicBezier, easings } from './easing.js';

function manualEngine(): {
  engine: ReturnType<typeof createAnimationEngine>;
  time: { now: number };
} {
  const time = { now: 0 };
  const engine = createAnimationEngine({ now: () => time.now, scheduler: null });
  return { engine, time };
}

describe('easings', () => {
  it.each(Object.keys(easings) as Array<keyof typeof easings>)('%s runs from 0 to 1', (name) => {
    expect(easings[name](0)).toBeCloseTo(0, 5);
    expect(easings[name](1)).toBeCloseTo(1, 5);
  });

  it('easeIn starts slow and easeOut starts fast', () => {
    expect(easings.easeIn(0.25)).toBeLessThan(0.25);
    expect(easings.easeOut(0.25)).toBeGreaterThan(0.25);
  });

  it('overshoot exceeds 1 mid-way', () => {
    expect(Math.max(...[0.5, 0.6, 0.7, 0.8].map((t) => easings.overshoot(t)))).toBeGreaterThan(1);
  });

  it('cubicBezier(0,0,1,1) is linear', () => {
    expect(cubicBezier(0, 0, 1, 1)(0.3)).toBeCloseTo(0.3, 3);
  });
});

describe('evaluateAnimation', () => {
  const base = { from: 0, to: 100, durationMs: 100, onUpdate: () => {} };

  it('interpolates and completes at the duration', () => {
    expect(evaluateAnimation(base, 50, easings.linear)).toEqual({ value: 50, done: false });
    expect(evaluateAnimation(base, 100, easings.linear)).toEqual({ value: 100, done: true });
  });

  it('plays back to the start value, then completes', () => {
    const options = { ...base, playbackDurationMs: 100 };
    expect(evaluateAnimation(options, 150, easings.linear).value).toBeCloseTo(50);
    expect(evaluateAnimation(options, 200, easings.linear)).toEqual({ value: 0, done: true });
  });

  it('repeats the requested number of times with a repeat delay', () => {
    const options = { ...base, repeatCount: 2, repeatDelayMs: 50 };
    expect(evaluateAnimation(options, 120, easings.linear)).toEqual({ value: 100, done: false });
    expect(evaluateAnimation(options, 175, easings.linear).value).toBeCloseTo(25);
    expect(evaluateAnimation(options, 300, easings.linear).done).toBe(true);
  });

  it('repeats forever with Infinity', () => {
    const options = { ...base, repeatCount: Infinity };
    expect(evaluateAnimation(options, 1_000_050, easings.linear)).toEqual({
      value: 50,
      done: false,
    });
  });
});

describe('createAnimationEngine', () => {
  it('delivers updates then onComplete, and respects the start delay', () => {
    const { engine, time } = manualEngine();
    const onUpdate = vi.fn();
    const onComplete = vi.fn();
    engine.start({ from: 0, to: 10, durationMs: 100, delayMs: 50, onUpdate, onComplete });

    time.now = 25;
    engine.tick(time.now);
    expect(onUpdate).not.toHaveBeenCalled();

    time.now = 100;
    engine.tick(time.now);
    expect(onUpdate).toHaveBeenLastCalledWith(5);

    time.now = 200;
    engine.tick(time.now);
    expect(onUpdate).toHaveBeenLastCalledWith(10);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(engine.activeCount).toBe(0);
  });

  it('cancel stops updates without completing', () => {
    const { engine, time } = manualEngine();
    const onUpdate = vi.fn();
    const onComplete = vi.fn();
    const handle = engine.start({ from: 0, to: 10, durationMs: 100, onUpdate, onComplete });
    handle.cancel();
    time.now = 50;
    engine.tick(time.now);
    expect(onUpdate).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    expect(handle.finished).toBe(true);
  });

  it('drives itself through its scheduler and calls onFrame', () => {
    let pending: (() => void) | null = null;
    const time = { now: 0 };
    const onFrame = vi.fn();
    const engine = createAnimationEngine({
      now: () => time.now,
      onFrame,
      scheduler: {
        requestFrame: (callback) => {
          pending = callback;
          return 1;
        },
        cancelFrame: () => {
          pending = null;
        },
      },
    });
    const onUpdate = vi.fn();
    engine.start({ from: 0, to: 1, durationMs: 100, onUpdate });

    const runFrame = (): void => {
      const callback = pending as (() => void) | null;
      pending = null;
      callback?.();
    };

    time.now = 50;
    runFrame();
    expect(onUpdate).toHaveBeenLastCalledWith(0.5);
    expect(onFrame).toHaveBeenCalledTimes(1);

    time.now = 100;
    runFrame();
    expect(engine.activeCount).toBe(0);
    expect(pending).toBeNull();
  });
});

describe('startTimeline', () => {
  it('offsets each entry and cancels as a group', () => {
    const { engine, time } = manualEngine();
    const first = vi.fn();
    const second = vi.fn();
    const handle = startTimeline(engine, [
      { atMs: 0, animation: { from: 0, to: 1, durationMs: 100, onUpdate: first } },
      { atMs: 100, animation: { from: 0, to: 1, durationMs: 100, onUpdate: second } },
    ]);
    time.now = 50;
    engine.tick(time.now);
    expect(first).toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    expect(handle.finished).toBe(false);
    handle.cancel();
    expect(handle.finished).toBe(true);
  });
});
