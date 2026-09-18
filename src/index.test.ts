import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSimulator } from './index';
import { LvObject } from './core/LvObject';

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

describe('createSimulator', () => {
  it('mounts a canvas sized to the requested resolution', () => {
    const container = document.createElement('div');

    const { canvas } = createSimulator(container, { width: 320, height: 240, devicePixelRatio: 1 });

    expect(canvas.style.width).toBe('320px');
    expect(canvas.style.height).toBe('240px');
    expect(container.contains(canvas)).toBe(true);
  });

  it('creates a screen object sized to the resolution with the requested background', () => {
    const container = document.createElement('div');

    const { screen } = createSimulator(container, {
      width: 320,
      height: 240,
      backgroundColor: '#ff0000',
      devicePixelRatio: 1,
    });

    expect(screen).toBeInstanceOf(LvObject);
    expect(screen.width).toBe(320);
    expect(screen.height).toBe(240);
    expect(screen.backgroundColor).toBe('#ff0000');
  });

  it('defaults to a white screen background', () => {
    const container = document.createElement('div');

    const { screen } = createSimulator(container, { width: 10, height: 10, devicePixelRatio: 1 });

    expect(screen.backgroundColor).toBe('#ffffff');
  });

  it('paints the screen once on mount', () => {
    const container = document.createElement('div');

    createSimulator(container, {
      width: 10,
      height: 10,
      backgroundColor: '#00ff00',
      devicePixelRatio: 1,
    });

    expect(fakeContext.fillStyle).toBe('#00ff00');
    expect(fakeContext.fillRect).toHaveBeenCalledWith(0, 0, 10, 10);
  });

  it('renderOnce() clears the canvas and repaints the current tree', () => {
    const container = document.createElement('div');

    const { renderOnce, screen } = createSimulator(container, {
      width: 10,
      height: 10,
      devicePixelRatio: 1,
    });
    fakeContext.clearRect.mockClear();
    fakeContext.fillRect.mockClear();

    screen.backgroundColor = '#123456';
    renderOnce();

    expect(fakeContext.clearRect).toHaveBeenCalledWith(0, 0, 10, 10);
    expect(fakeContext.fillStyle).toBe('#123456');
  });

  it('start()/stop() do not throw', () => {
    const container = document.createElement('div');

    const simulator = createSimulator(container, { width: 10, height: 10, devicePixelRatio: 1 });

    expect(() => simulator.start()).not.toThrow();
    expect(() => simulator.stop()).not.toThrow();
  });

  it('propagates the descriptive error when a 2D context is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const container = document.createElement('div');

    expect(() => createSimulator(container, { width: 10, height: 10 })).toThrow(
      /2D rendering context/,
    );
  });
});
