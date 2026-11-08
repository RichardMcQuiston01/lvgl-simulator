import { describe, expect, it } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { Spinner } from './Spinner.js';

function clockedSpinner(options: { spinTimeMs?: number; arcLengthDegrees?: number } = {}): {
  spinner: Spinner;
  time: { now: number };
} {
  const time = { now: 5000 };
  const spinner = new Spinner({ width: 60, height: 60, now: () => time.now, ...options });
  return { spinner, time };
}

describe('Spinner', () => {
  it('is not clickable by default but can be made so', () => {
    expect(new Spinner({ width: 10, height: 10 }).clickable).toBe(false);
    expect(new Spinner({ width: 10, height: 10, clickable: true }).clickable).toBe(true);
  });

  it('starts at angle 0 and returns to it after each revolution', () => {
    const { spinner, time } = clockedSpinner({ spinTimeMs: 1000 });
    expect(spinner.currentAngle).toBe(0);
    time.now += 1000;
    expect(spinner.currentAngle).toBe(0);
    time.now += 2000;
    expect(spinner.currentAngle).toBe(0);
  });

  it('eases through a revolution, passing halfway at the midpoint', () => {
    const { spinner, time } = clockedSpinner({ spinTimeMs: 1000 });
    time.now += 500;
    expect(spinner.currentAngle).toBeCloseTo(180, 0);
    time.now += 250;
    expect(spinner.currentAngle).toBeGreaterThan(180);
    expect(spinner.currentAngle).toBeLessThan(360);
  });

  it('does not spin for a non-positive spin time', () => {
    const { spinner, time } = clockedSpinner({ spinTimeMs: 0 });
    time.now += 300;
    expect(spinner.currentAngle).toBe(0);
  });

  it('paints a full background ring and the spinning arc', () => {
    const context = createFakeCanvasContext();
    clockedSpinner().spinner.render(context);
    expect(context.stroke).toHaveBeenCalledTimes(2);
  });

  it('moves the arc as time advances', () => {
    const { spinner, time } = clockedSpinner();
    const first = createFakeCanvasContext();
    spinner.render(first);
    time.now += 300;
    const second = createFakeCanvasContext();
    spinner.render(second);
    const startOf = (context: CanvasRenderingContext2D): unknown =>
      (context.arc as unknown as { mock: { calls: unknown[][] } }).mock.calls[1]?.[3];
    expect(startOf(second)).not.toBe(startOf(first));
  });
});
