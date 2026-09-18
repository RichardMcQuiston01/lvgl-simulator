import { describe, expect, it } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext';
import {
  paintCheckmark,
  paintCircle,
  paintCircleStroke,
  paintRoundedRect,
  paintRoundedRectStroke,
} from './shapes';

describe('paintRoundedRect', () => {
  it('traces a path and fills it with the given color', () => {
    const context = createFakeCanvasContext();

    paintRoundedRect(context, 0, 0, 10, 10, 2, '#abcdef');

    expect(context.beginPath).toHaveBeenCalled();
    expect(context.closePath).toHaveBeenCalled();
    expect(context.fill).toHaveBeenCalled();
    expect(context.fillStyle).toBe('#abcdef');
  });

  it('does not throw when the radius exceeds half the smallest dimension', () => {
    const context = createFakeCanvasContext();

    expect(() => paintRoundedRect(context, 0, 0, 4, 10, 100, '#fff')).not.toThrow();
  });
});

describe('paintRoundedRectStroke', () => {
  it('traces a path and strokes it with the given color and width', () => {
    const context = createFakeCanvasContext();

    paintRoundedRectStroke(context, 0, 0, 10, 10, 2, '#123456', 3);

    expect(context.stroke).toHaveBeenCalled();
    expect(context.strokeStyle).toBe('#123456');
    expect(context.lineWidth).toBe(3);
  });
});

describe('paintCircle', () => {
  it('fills a full arc at the given center and radius', () => {
    const context = createFakeCanvasContext();

    paintCircle(context, 5, 5, 5, '#111111');

    expect(context.arc).toHaveBeenCalledWith(5, 5, 5, 0, Math.PI * 2);
    expect(context.fill).toHaveBeenCalled();
    expect(context.fillStyle).toBe('#111111');
  });
});

describe('paintCircleStroke', () => {
  it('strokes a full arc at the given center and radius', () => {
    const context = createFakeCanvasContext();

    paintCircleStroke(context, 5, 5, 5, '#222222');

    expect(context.arc).toHaveBeenCalledWith(5, 5, 5, 0, Math.PI * 2);
    expect(context.stroke).toHaveBeenCalled();
    expect(context.strokeStyle).toBe('#222222');
  });
});

describe('paintCheckmark', () => {
  it('draws a three-point polyline and strokes it', () => {
    const context = createFakeCanvasContext();

    paintCheckmark(context, 0, 0, 20, '#ffffff');

    expect(context.moveTo).toHaveBeenCalledTimes(1);
    expect(context.lineTo).toHaveBeenCalledTimes(2);
    expect(context.stroke).toHaveBeenCalled();
    expect(context.strokeStyle).toBe('#ffffff');
  });
});
