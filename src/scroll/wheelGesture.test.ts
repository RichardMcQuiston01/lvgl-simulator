import { describe, expect, it } from 'vitest';
import { WheelGesture } from './wheelGesture.js';

describe('WheelGesture', () => {
  it('allows the first step of a gesture and refuses the rest of a stream of events', () => {
    const clock = { time: 0 };
    const gesture = new WheelGesture(() => clock.time);
    expect(gesture.allowStep()).toBe(true);
    clock.time = 16;
    expect(gesture.allowStep()).toBe(false);
    clock.time = 40;
    expect(gesture.allowStep()).toBe(false);
  });

  it('keeps a long stream one gesture while the gaps stay short', () => {
    const clock = { time: 0 };
    const gesture = new WheelGesture(() => clock.time);
    gesture.allowStep();
    for (let step = 1; step <= 50; step += 1) {
      clock.time = step * 100;
      expect(gesture.allowStep()).toBe(false);
    }
  });

  it('starts a new gesture after a quiet gap', () => {
    const clock = { time: 0 };
    const gesture = new WheelGesture(() => clock.time);
    expect(gesture.allowStep()).toBe(true);
    clock.time = 500;
    expect(gesture.allowStep()).toBe(true);
    clock.time = 520;
    expect(gesture.allowStep()).toBe(false);
  });

  it('honours its own quiet window', () => {
    const clock = { time: 0 };
    const gesture = new WheelGesture(() => clock.time, 50);
    gesture.allowStep();
    clock.time = 49;
    expect(gesture.allowStep()).toBe(false);
    clock.time = 120;
    expect(gesture.allowStep()).toBe(true);
  });
});
