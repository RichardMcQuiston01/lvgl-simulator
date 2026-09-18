import { describe, expect, it, vi } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext';
import { defaultTheme } from '../theme/defaultTheme';
import { Slider } from './Slider';

describe('Slider', () => {
  it('defaults to a 0-100 range starting at the minimum', () => {
    const slider = new Slider({ width: 200, height: 20 });

    expect(slider.min).toBe(0);
    expect(slider.max).toBe(100);
    expect(slider.value).toBe(0);
    expect(slider.ratio).toBe(0);
  });

  it('computes the ratio of value within [min, max]', () => {
    const slider = new Slider({ width: 200, height: 20, min: 0, max: 200, value: 50 });

    expect(slider.ratio).toBe(0.25);
  });

  it('clamps the ratio to [0, 1] for out-of-range values', () => {
    const below = new Slider({ width: 10, height: 10, min: 0, max: 10, value: -5 });
    const above = new Slider({ width: 10, height: 10, min: 0, max: 10, value: 50 });

    expect(below.ratio).toBe(0);
    expect(above.ratio).toBe(1);
  });

  it('returns 0 when min and max are equal, instead of dividing by zero', () => {
    const slider = new Slider({ width: 10, height: 10, min: 5, max: 5, value: 5 });

    expect(slider.ratio).toBe(0);
  });

  it('positions the knob at the track start when value is at the minimum', () => {
    const context = createFakeCanvasContext();
    const slider = new Slider({ x: 0, y: 0, width: 200, height: 20, value: 0 });

    slider.render(context);

    expect(context.arc).toHaveBeenCalledWith(0, 10, 10, 0, Math.PI * 2);
  });

  it('positions the knob proportionally along the track for a mid-range value', () => {
    const context = createFakeCanvasContext();
    const slider = new Slider({ x: 0, y: 0, width: 200, height: 20, min: 0, max: 100, value: 50 });

    slider.render(context);

    expect(context.arc).toHaveBeenCalledWith(100, 10, 10, 0, Math.PI * 2);
  });

  it('draws the track, then the filled indicator, in their theme colors', () => {
    const context = createFakeCanvasContext();
    const fillColors: string[] = [];
    (context.fill as ReturnType<typeof vi.fn>).mockImplementation(() => {
      fillColors.push(context.fillStyle as string);
    });
    const slider = new Slider({ width: 200, height: 20, value: 50 });

    slider.render(context);

    expect(fillColors[0]).toBe(defaultTheme.borderColor);
    expect(fillColors[1]).toBe(defaultTheme.primaryColor);
  });

  it('lets a caller override the indicator and knob colors', () => {
    const context = createFakeCanvasContext();
    const fillColors: string[] = [];
    (context.fill as ReturnType<typeof vi.fn>).mockImplementation(() => {
      fillColors.push(context.fillStyle as string);
    });
    const slider = new Slider({
      width: 200,
      height: 20,
      value: 50,
      indicatorStyle: { base: { bgColor: '#ff00ff' } },
      knobStyle: { base: { bgColor: '#00ffff' } },
    });

    slider.render(context);

    expect(fillColors[1]).toBe('#ff00ff');
    expect(fillColors[2]).toBe('#00ffff');
  });
});
