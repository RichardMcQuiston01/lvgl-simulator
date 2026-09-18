import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDisplayDriver } from './DisplayDriver.js';

class FakeContext2D {
  fillStyle = '';
  fillRect = vi.fn();
  clearRect = vi.fn();
  scale = vi.fn();
}

let fakeContext: FakeContext2D;

beforeEach(() => {
  fakeContext = new FakeContext2D();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    fakeContext as unknown as CanvasRenderingContext2D,
  );
});

describe('createDisplayDriver', () => {
  it('sizes the backing store by the device pixel ratio and reports logical dimensions', () => {
    const driver = createDisplayDriver({ width: 320, height: 240, devicePixelRatio: 2 });

    expect(driver.canvas.width).toBe(640);
    expect(driver.canvas.height).toBe(480);
    expect(driver.canvas.style.width).toBe('320px');
    expect(driver.canvas.style.height).toBe('240px');
    expect(driver.width).toBe(320);
    expect(driver.height).toBe(240);
    expect(driver.devicePixelRatio).toBe(2);
  });

  it('scales the context so callers draw in logical pixel coordinates', () => {
    createDisplayDriver({ width: 100, height: 100, devicePixelRatio: 3 });

    expect(fakeContext.scale).toHaveBeenCalledWith(3, 3);
  });

  it('defaults devicePixelRatio to 1 when unset and window.devicePixelRatio is unavailable', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
    Object.defineProperty(window, 'devicePixelRatio', { value: 0, configurable: true });

    const driver = createDisplayDriver({ width: 100, height: 100 });

    expect(driver.devicePixelRatio).toBe(1);

    if (originalDescriptor) {
      Object.defineProperty(window, 'devicePixelRatio', originalDescriptor);
    }
  });

  it('defaults the color format to RGB888', () => {
    const driver = createDisplayDriver({ width: 100, height: 100, devicePixelRatio: 1 });

    expect(driver.colorFormat).toBe('RGB888');
  });

  it('respects an explicit color format', () => {
    const driver = createDisplayDriver({
      width: 100,
      height: 100,
      devicePixelRatio: 1,
      colorFormat: 'RGB565',
    });

    expect(driver.colorFormat).toBe('RGB565');
  });

  it('throws a descriptive error when a 2D context is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    expect(() => createDisplayDriver({ width: 100, height: 100 })).toThrow(/2D rendering context/);
  });
});
