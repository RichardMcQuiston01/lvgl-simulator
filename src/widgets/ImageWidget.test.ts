import { describe, expect, it, vi } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import { ImageWidget } from './ImageWidget.js';

/** A deterministic stand-in for HTMLImageElement: setting `src` fires `load` synchronously. */
class FakeImageElement {
  private listeners: Partial<Record<string, () => void>> = {};

  addEventListener(event: string, callback: () => void): void {
    this.listeners[event] = callback;
  }

  set src(_value: string) {
    this.listeners.load?.();
  }
}

describe('ImageWidget', () => {
  it('draws a placeholder box when no source is given', () => {
    const context = createFakeCanvasContext();
    const image = new ImageWidget({ width: 50, height: 50 });

    image.render(context);

    expect(context.fill).toHaveBeenCalled();
    expect(context.fillStyle).toBe(defaultTheme.disabledColor);
    expect(context.drawImage).not.toHaveBeenCalled();
  });

  it('draws an already-available drawable immediately', () => {
    const context = createFakeCanvasContext();
    const bitmap = {} as CanvasImageSource;
    const image = new ImageWidget({ x: 1, y: 2, width: 50, height: 50, image: bitmap });

    image.render(context);

    expect(context.drawImage).toHaveBeenCalledWith(bitmap, 1, 2, 50, 50);
  });

  it('loads from src, calling onLoad and then drawing the image instead of the placeholder', () => {
    vi.stubGlobal('Image', FakeImageElement);
    try {
      const onLoad = vi.fn();
      const context = createFakeCanvasContext();
      const image = new ImageWidget({ width: 50, height: 50, src: 'icon.png', onLoad });

      expect(onLoad).toHaveBeenCalledTimes(1);

      image.render(context);

      expect(context.drawImage).toHaveBeenCalled();
      expect(context.fill).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('prefers an explicit `image` over `src`', () => {
    vi.stubGlobal('Image', FakeImageElement);
    try {
      const context = createFakeCanvasContext();
      const bitmap = {} as CanvasImageSource;
      const image = new ImageWidget({ width: 50, height: 50, src: 'icon.png', image: bitmap });

      image.render(context);

      expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 50, 50);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
