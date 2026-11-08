import { describe, expect, it } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { Line } from './Line.js';

const POINTS = [
  { x: 0, y: 0 },
  { x: 40, y: 20 },
  { x: 80, y: 10 },
];

describe('Line', () => {
  it('sizes itself to the points when no size is given', () => {
    const line = new Line({ points: POINTS });
    expect([line.width, line.height]).toEqual([80, 20]);
  });

  it('keeps an explicit size and only auto-sizes the omitted axis', () => {
    const line = new Line({ points: POINTS, width: 200 });
    expect([line.width, line.height]).toEqual([200, 20]);
    line.setPoints([
      { x: 0, y: 0 },
      { x: 10, y: 50 },
    ]);
    expect([line.width, line.height]).toEqual([200, 50]);
  });

  it('resizes when points are replaced', () => {
    const line = new Line({ points: POINTS });
    line.setPoints([{ x: 5, y: 5 }]);
    expect([line.width, line.height]).toEqual([5, 5]);
    expect(line.points).toHaveLength(1);
  });

  it('strokes one connected path through every point', () => {
    const context = createFakeCanvasContext();
    new Line({ x: 10, y: 20, points: POINTS }).render(context);
    expect(context.moveTo).toHaveBeenCalledWith(10, 20);
    expect(context.lineTo).toHaveBeenCalledTimes(2);
    expect(context.lineTo).toHaveBeenLastCalledWith(90, 30);
    expect(context.stroke).toHaveBeenCalledTimes(1);
  });

  it('flips vertically within the object height with yInvert', () => {
    const context = createFakeCanvasContext();
    new Line({ points: POINTS, yInvert: true }).render(context);
    // Height is 20, so the first point (y 0) draws at y 20.
    expect(context.moveTo).toHaveBeenCalledWith(0, 20);
    expect(context.lineTo).toHaveBeenCalledWith(40, 0);
  });

  it('draws nothing for fewer than two points or a zero width', () => {
    const single = createFakeCanvasContext();
    new Line({ points: [{ x: 1, y: 1 }] }).render(single);
    expect(single.stroke).not.toHaveBeenCalled();

    const none = createFakeCanvasContext();
    new Line({ points: POINTS, style: { base: { lineWidth: 0 } } }).render(none);
    expect(none.stroke).not.toHaveBeenCalled();
  });

  it('uses round caps and joins unless lineRounded is false', () => {
    const rounded = createFakeCanvasContext();
    new Line({ points: POINTS }).render(rounded);
    expect([rounded.lineCap, rounded.lineJoin]).toEqual(['round', 'round']);

    const square = createFakeCanvasContext();
    new Line({ points: POINTS, style: { base: { lineRounded: false } } }).render(square);
    expect([square.lineCap, square.lineJoin]).toEqual(['butt', 'miter']);
  });

  it('still paints the object background', () => {
    const context = createFakeCanvasContext();
    new Line({ points: POINTS, style: { base: { bgColor: '#eeeeee' } } }).render(context);
    expect(context.fillRect).toHaveBeenCalled();
  });

  it('restores canvas state after stroking so cap and join cannot leak', () => {
    const context = createFakeCanvasContext();
    new Line({ points: POINTS }).render(context);
    expect(context.save).toHaveBeenCalledTimes(1);
    expect(context.restore).toHaveBeenCalledTimes(1);
  });
});
