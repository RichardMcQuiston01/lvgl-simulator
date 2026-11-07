import { describe, expect, it, vi } from 'vitest';
import { LvObject } from '../core/LvObject.js';
import { hitTest } from '../interaction/hitTest.js';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { paintBackgroundAndBorder, paintOutline, paintShadow } from './box.js';
import { inverseTransformPoint, resolveTransform } from './transform.js';

function contextWithExtras(): CanvasRenderingContext2D {
  const context = createFakeCanvasContext() as unknown as Record<string, unknown>;
  context.translate = vi.fn();
  context.rotate = vi.fn();
  context.createLinearGradient = vi.fn(() => ({ addColorStop: vi.fn() }));
  context.getTransform = vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }));
  context.setTransform = vi.fn();
  return context as unknown as CanvasRenderingContext2D;
}

describe('paintBackgroundAndBorder', () => {
  it('fills a plain rect without a radius', () => {
    const context = contextWithExtras();
    paintBackgroundAndBorder(context, 1, 2, 30, 40, { bgColor: '#ff0000' });
    expect(context.fillRect).toHaveBeenCalledWith(1, 2, 30, 40);
  });

  it('rounds the fill when a radius is set', () => {
    const context = contextWithExtras();
    paintBackgroundAndBorder(context, 0, 0, 30, 40, { bgColor: '#ff0000', radius: 6 });
    expect(context.fillRect).not.toHaveBeenCalled();
    expect(context.fill).toHaveBeenCalled();
  });

  it('uses a gradient when a direction and second color are set', () => {
    const context = contextWithExtras();
    paintBackgroundAndBorder(context, 0, 0, 30, 40, {
      bgColor: '#ff0000',
      bgGradColor: '#0000ff',
      bgGradDir: 'ver',
    });
    expect(context.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, 40);
    paintBackgroundAndBorder(context, 0, 0, 30, 40, {
      bgColor: '#ff0000',
      bgGradColor: '#0000ff',
      bgGradDir: 'hor',
    });
    expect(context.createLinearGradient).toHaveBeenLastCalledWith(0, 0, 30, 0);
  });

  it('strokes an inset border', () => {
    const context = contextWithExtras();
    paintBackgroundAndBorder(context, 0, 0, 30, 40, { borderWidth: 2, borderColor: '#000000' });
    expect(context.lineWidth).toBe(2);
    expect(context.stroke).toHaveBeenCalled();
  });

  it('skips the border when borderOpa is 0', () => {
    const context = contextWithExtras();
    paintBackgroundAndBorder(context, 0, 0, 30, 40, {
      borderWidth: 2,
      borderColor: '#000000',
      borderOpa: 0,
    });
    expect(context.stroke).not.toHaveBeenCalled();
  });
});

describe('paintShadow', () => {
  it('draws nothing without a shadow width', () => {
    const context = contextWithExtras();
    paintShadow(context, 0, 0, 10, 10, {});
    expect(context.fill).not.toHaveBeenCalled();
  });

  it('casts from an off-screen shape, compensating the offset', () => {
    const context = contextWithExtras();
    paintShadow(context, 10, 10, 20, 20, { shadowWidth: 8, shadowOffsetX: 3, shadowOffsetY: 4 });
    expect(context.fill).toHaveBeenCalledTimes(1);
    expect(context.save).toHaveBeenCalled();
    expect(context.restore).toHaveBeenCalled();
  });
});

describe('paintShadow on a scaled context', () => {
  it('maps the offset and blur through the transform and shifts the caster in device space', () => {
    const context = contextWithExtras();
    (context.getTransform as ReturnType<typeof vi.fn>).mockReturnValue({
      a: 2,
      b: 0,
      c: 0,
      d: 2,
      e: 0,
      f: 0,
    });
    paintShadow(context, 10, 10, 20, 20, { shadowWidth: 8, shadowOffsetX: 3, shadowOffsetY: 4 });

    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, -100_000, 0);
    expect(context.shadowBlur).toBe(16);
    expect(context.shadowOffsetX).toBe(100_000 + 6);
    expect(context.shadowOffsetY).toBe(8);
  });

  it('leaves an identity transform at the logical offset and blur', () => {
    const context = contextWithExtras();
    paintShadow(context, 10, 10, 20, 20, { shadowWidth: 8, shadowOffsetX: 3, shadowOffsetY: 4 });
    expect(context.shadowBlur).toBe(8);
    expect(context.shadowOffsetX).toBe(100_003);
    expect(context.shadowOffsetY).toBe(4);
  });
});

describe('paintOutline', () => {
  it('strokes outside the box by pad plus half the width', () => {
    const context = contextWithExtras();
    paintOutline(context, 10, 10, 20, 20, {}, 2, '#ff0000', 1);
    expect(context.lineWidth).toBe(2);
    expect(context.stroke).toHaveBeenCalled();
  });

  it('draws nothing for a zero width', () => {
    const context = contextWithExtras();
    paintOutline(context, 10, 10, 20, 20, {}, 0, '#ff0000', 1);
    expect(context.stroke).not.toHaveBeenCalled();
  });
});

describe('transforms', () => {
  it('is the identity by default', () => {
    expect(resolveTransform({})).toBeNull();
    expect(resolveTransform({ transformScaleX: 256, transformScaleY: 256 })).toBeNull();
  });

  it('converts LVGL units (0.1 degree rotation, 256 = 100% scale)', () => {
    const transform = resolveTransform({ transformRotation: 900, transformScaleX: 512 });
    expect(transform?.rotation).toBeCloseTo(Math.PI / 2);
    expect(transform?.scaleX).toBe(2);
    expect(transform?.scaleY).toBe(1);
  });

  it('inverse-maps points around the pivot', () => {
    const transform = resolveTransform({
      transformRotation: 900,
      transformPivotX: 10,
      transformPivotY: 10,
    });
    if (!transform) {
      throw new Error('Expected a non-identity transform.');
    }
    // Rotating 90 degrees clockwise around (10,10) sends local (20,10) to (10,20);
    // the inverse maps (10,20) back to (20,10).
    const point = inverseTransformPoint(transform, 0, 0, 10, 20);
    expect(point.x).toBeCloseTo(20);
    expect(point.y).toBeCloseTo(10);
  });
});

describe('LvObject painting integration', () => {
  it('draws the focus outline on a focused object that sets no outline', () => {
    const context = contextWithExtras();
    const focused = new LvObject({ width: 20, height: 20, focused: true });
    focused.render(context);
    expect(context.stroke).toHaveBeenCalled();

    const plain = contextWithExtras();
    new LvObject({ width: 20, height: 20 }).render(plain);
    expect(plain.stroke).not.toHaveBeenCalled();
  });

  it('lets an explicit outlineWidth of 0 suppress the focus outline', () => {
    const context = contextWithExtras();
    new LvObject({
      width: 20,
      height: 20,
      focused: true,
      style: { base: { outlineWidth: 0 } },
    }).render(context);
    expect(context.stroke).not.toHaveBeenCalled();
  });

  it('wraps a transformed subtree in save/restore with a rotation', () => {
    const context = contextWithExtras();
    new LvObject({
      width: 20,
      height: 20,
      style: { base: { transformRotation: 450 } },
    }).render(context);
    expect(context.rotate).toHaveBeenCalledWith(expect.closeTo(Math.PI / 4));
    expect(context.save).toHaveBeenCalledTimes(1);
    expect(context.restore).toHaveBeenCalledTimes(1);
  });

  it('clips children to rounded corners with clipCorner', () => {
    const context = contextWithExtras();
    const parent = new LvObject({
      width: 40,
      height: 40,
      style: { base: { radius: 8, clipCorner: true } },
    });
    parent.addChild(new LvObject({ width: 10, height: 10 }));
    parent.render(context);
    expect(context.clip).toHaveBeenCalledTimes(1);
  });

  it('hit-tests a rotated object in its own space', () => {
    const screen = new LvObject({ width: 200, height: 200 });
    // 100x20 bar rotated 90 degrees about its top-left corner covers x 80-100... i.e. x in [-20,0], y in [0,100]
    const bar = new LvObject({
      x: 100,
      y: 50,
      width: 100,
      height: 20,
      style: { base: { transformRotation: 900 } },
    });
    screen.addChild(bar);
    // Unrotated, (150, 60) is inside the bar; rotated about (100,50) it is not.
    expect(hitTest(screen, 150, 60)).toBe(screen);
    // Rotated, the bar runs downward from (100,50): (90, 100) is inside it.
    expect(hitTest(screen, 90, 100)).toBe(bar);
  });
});
