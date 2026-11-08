import { describe, expect, it } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { Scale } from './Scale.js';

type Mock = { mock: { calls: unknown[][] } };
const callsOf = (fn: unknown): unknown[][] => (fn as Mock).mock.calls;

describe('Scale', () => {
  it('defaults to 11 ticks over 0-100 with a major tick every fifth, not clickable', () => {
    const scale = new Scale({ width: 200, height: 40 });
    expect(scale.ticks).toHaveLength(11);
    expect(scale.ticks.filter((tick) => tick.major)).toHaveLength(3);
    expect(scale.clickable).toBe(false);
  });

  it('draws the line plus one stroke per tick on a linear scale', () => {
    const context = createFakeCanvasContext();
    new Scale({ width: 200, height: 40 }).render(context);
    expect(context.stroke).toHaveBeenCalledTimes(1 + 11);
  });

  it('labels each major tick with its value', () => {
    const context = createFakeCanvasContext();
    new Scale({ width: 200, height: 40 }).render(context);
    expect(callsOf(context.fillText).map((call) => call[0])).toEqual(['0', '50', '100']);
  });

  it('uses custom labels and can hide labels entirely', () => {
    const custom = createFakeCanvasContext();
    new Scale({ width: 200, height: 40, labels: ['L', 'M', 'H'] }).render(custom);
    expect(callsOf(custom.fillText).map((call) => call[0])).toEqual(['L', 'M', 'H']);

    const hidden = createFakeCanvasContext();
    new Scale({ width: 200, height: 40, labelShow: false }).render(hidden);
    expect(hidden.fillText).not.toHaveBeenCalled();
  });

  it('draws major ticks longer than minor ones', () => {
    const context = createFakeCanvasContext();
    new Scale({ width: 200, height: 40 }).render(context);
    const lineTos = callsOf(context.lineTo);
    // horizontalBottom: line at y=1; tick ends at y = 1 + length. First tick is major (12).
    expect(lineTos[1]?.[1]).toBe(13);
    expect(lineTos[2]?.[1]).toBe(7);
  });

  it('strokes the line of a round scale as an arc', () => {
    const context = createFakeCanvasContext();
    new Scale({ width: 100, height: 100, mode: 'roundInner' }).render(context);
    expect(context.arc).toHaveBeenCalledTimes(1);
    // 11 tick strokes plus the arc.
    expect(context.stroke).toHaveBeenCalledTimes(12);
  });

  it('recolors ticks and the line inside a section', () => {
    const context = createFakeCanvasContext();
    const strokes: string[] = [];
    Object.defineProperty(context, 'strokeStyle', {
      set: (value: string) => strokes.push(value),
      get: () => '',
    });
    new Scale({
      width: 200,
      height: 40,
      totalTickCount: 3,
      majorTickEvery: 1,
      sections: [
        {
          min: 50,
          max: 100,
          mainStyle: { lineColor: '#ff0000' },
          indicatorStyle: { lineColor: '#ff0000' },
        },
      ],
    }).render(context);
    // Line, section line, then three major ticks; the last two fall in the section.
    expect(strokes.filter((color) => color === '#ff0000')).toHaveLength(3);
  });

  it('draws nothing but the line when there are no ticks', () => {
    const context = createFakeCanvasContext();
    new Scale({ width: 200, height: 40, totalTickCount: 0 }).render(context);
    expect(context.stroke).toHaveBeenCalledTimes(1);
  });
});
