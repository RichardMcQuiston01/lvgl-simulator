import { describe, expect, it, vi } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { ImageButton } from './ImageButton.js';

function image(width: number, height: number): CanvasImageSource {
  return { width, height } as unknown as CanvasImageSource;
}

describe('ImageButton', () => {
  it('derives its image state from checked, pressed and disabled', () => {
    const button = new ImageButton({ width: 100, height: 20 });
    expect(button.imageState).toBe('released');
    button.pressed = true;
    expect(button.imageState).toBe('pressed');
    button.pressed = false;
    button.disabled = true;
    expect(button.imageState).toBe('disabled');
    button.disabled = false;
    button.checked = true;
    expect(button.imageState).toBe('checkedReleased');
    button.pressed = true;
    expect(button.imageState).toBe('checkedPressed');
    button.pressed = false;
    button.disabled = true;
    expect(button.imageState).toBe('checkedDisabled');
  });

  it('draws nothing without images', () => {
    const context = createFakeCanvasContext();
    new ImageButton({ width: 100, height: 20 }).render(context);
    expect(context.drawImage).not.toHaveBeenCalled();
  });

  it('draws the end caps and tiles the middle between them', () => {
    const context = createFakeCanvasContext();
    const left = image(10, 20);
    const mid = image(20, 20);
    const right = image(10, 20);
    new ImageButton({
      x: 5,
      y: 6,
      width: 100,
      height: 20,
      images: { released: { left, mid, right } },
    }).render(context);

    const calls = (context.drawImage as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    // left cap, right cap, then (100 - 10 - 10) / 20 = 4 tiles.
    expect(calls).toHaveLength(6);
    expect(calls[0]).toEqual([left, 5, 6, 10, 20]);
    expect(calls[1]).toEqual([right, 95, 6, 10, 20]);
    expect(calls[2]?.[1]).toBe(15);
    expect(calls[5]?.[1]).toBe(75);
    expect(context.clip).toHaveBeenCalledTimes(1);
  });

  it('tiles a lone middle image across the whole width', () => {
    const context = createFakeCanvasContext();
    new ImageButton({
      width: 50,
      height: 10,
      images: { released: { mid: image(20, 10) } },
    }).render(context);
    expect(context.drawImage).toHaveBeenCalledTimes(3);
  });

  it('shows the pressed artwork while pressed, falling back to released otherwise', () => {
    const released = image(30, 10);
    const pressed = image(40, 10);
    const button = new ImageButton({
      width: 60,
      height: 10,
      images: { released: { left: released }, pressed: { left: pressed } },
    });

    const idle = createFakeCanvasContext();
    button.render(idle);
    expect((idle.drawImage as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0]).toBe(
      released,
    );

    button.pressed = true;
    const down = createFakeCanvasContext();
    button.render(down);
    expect((down.drawImage as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0]).toBe(
      pressed,
    );

    button.pressed = false;
    button.disabled = true;
    const off = createFakeCanvasContext();
    button.render(off);
    expect((off.drawImage as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0]).toBe(
      released,
    );
  });

  it('toggles checked on click only when checkable', () => {
    const plain = new ImageButton({ width: 10, height: 10 });
    plain.dispatchEvent('clicked');
    expect(plain.checked).toBe(false);

    const toggle = new ImageButton({ width: 10, height: 10, checkable: true });
    const listener = vi.fn();
    toggle.addEventListener('valueChanged', listener);
    toggle.dispatchEvent('clicked');
    expect(toggle.checked).toBe(true);
    toggle.dispatchEvent('clicked');
    expect(toggle.checked).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  describe('loading URL sources', () => {
    type Listener = () => void;
    class FakeImage {
      static instances: FakeImage[] = [];
      naturalWidth = 20;
      naturalHeight = 10;
      src = '';
      private readonly listeners = new Map<string, Listener>();
      constructor() {
        FakeImage.instances.push(this);
      }
      addEventListener(type: string, listener: Listener): void {
        this.listeners.set(type, listener);
      }
      fire(type: string): void {
        this.listeners.get(type)?.();
      }
    }

    function withFakeImages(run: () => void): void {
      FakeImage.instances = [];
      vi.stubGlobal('Image', FakeImage);
      try {
        run();
      } finally {
        vi.unstubAllGlobals();
      }
    }

    it('reports a failed load through onError with the URL', () => {
      withFakeImages(() => {
        const onError = vi.fn();
        new ImageButton({
          width: 40,
          height: 10,
          images: { released: { mid: 'missing.png' } },
          onError,
        });
        FakeImage.instances[0]?.fire('error');
        expect(onError).toHaveBeenCalledWith('missing.png');
      });
    });

    it('draws a URL source once it has loaded and reports the load', () => {
      withFakeImages(() => {
        const onLoad = vi.fn();
        const button = new ImageButton({
          width: 40,
          height: 10,
          images: { released: { mid: 'tile.png' } },
          onLoad,
        });

        const before = createFakeCanvasContext();
        button.render(before);
        expect(before.drawImage).not.toHaveBeenCalled();

        FakeImage.instances[0]?.fire('load');
        expect(onLoad).toHaveBeenCalledTimes(1);

        const after = createFakeCanvasContext();
        button.render(after);
        expect(after.drawImage).toHaveBeenCalledTimes(2);
      });
    });
  });
});
