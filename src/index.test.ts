import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSimulator } from './index';

class FakeContext2D {
  fillStyle = '';
  fillRect = vi.fn();
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

    const { canvas } = createSimulator(container, { width: 320, height: 240 });

    expect(canvas.width).toBe(320);
    expect(canvas.height).toBe(240);
    expect(container.contains(canvas)).toBe(true);
  });

  it('fills the canvas with the requested background color', () => {
    const container = document.createElement('div');

    createSimulator(container, { width: 10, height: 10, backgroundColor: '#ff0000' });

    expect(fakeContext.fillStyle).toBe('#ff0000');
    expect(fakeContext.fillRect).toHaveBeenCalledWith(0, 0, 10, 10);
  });

  it('defaults to a white background when none is specified', () => {
    const container = document.createElement('div');

    createSimulator(container, { width: 10, height: 10 });

    expect(fakeContext.fillStyle).toBe('#ffffff');
  });

  it('throws a descriptive error when a 2D context is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const container = document.createElement('div');

    expect(() => createSimulator(container, { width: 10, height: 10 })).toThrow(
      /2D rendering context/,
    );
  });
});
