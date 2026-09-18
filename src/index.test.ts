import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSimulator, Button, Container } from './index';
import { LvObject } from './core/LvObject';

function pointerEventAt(type: string, x: number, y: number, pointerId = 1): PointerEvent {
  const event = new PointerEvent(type, { pointerId, bubbles: true });
  Object.defineProperty(event, 'offsetX', { value: x, configurable: true });
  Object.defineProperty(event, 'offsetY', { value: y, configurable: true });
  return event;
}

class FakeContext2D {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 0;
  font = '';
  textAlign = '';
  textBaseline = '';
  fillRect = vi.fn();
  clearRect = vi.fn();
  scale = vi.fn();
  beginPath = vi.fn();
  closePath = vi.fn();
  moveTo = vi.fn();
  arcTo = vi.fn();
  fill = vi.fn();
  stroke = vi.fn();
  fillText = vi.fn();
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
    expect(screen.resolvedStyle.bgColor).toBe('#ff0000');
  });

  it('defaults to a white screen background', () => {
    const container = document.createElement('div');

    const { screen } = createSimulator(container, { width: 10, height: 10, devicePixelRatio: 1 });

    expect(screen.resolvedStyle.bgColor).toBe('#ffffff');
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

    screen.style = { base: { bgColor: '#123456' } };
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

  it('renders a screen with a flex-laid-out widget tree end to end', () => {
    const container = document.createElement('div');

    const { screen, renderOnce } = createSimulator(container, {
      width: 200,
      height: 60,
      layout: { type: 'flex', columnGap: 10 },
      padding: 5,
    });
    const first = new Button({ width: 50, height: 30, text: 'A' });
    const second = new Button({ width: 50, height: 30, text: 'B' });
    screen.addChild(first);
    screen.addChild(second);

    renderOnce();

    expect(screen).toBeInstanceOf(Container);
    expect(first.x).toBe(5);
    expect(second.x).toBe(65); // 5 (padding) + 50 (first) + 10 (gap)
    expect(fakeContext.fillText).toHaveBeenCalledWith('A', expect.any(Number), expect.any(Number));
    expect(fakeContext.fillText).toHaveBeenCalledWith('B', expect.any(Number), expect.any(Number));
  });

  it('wires real pointer input on the canvas to the screen tree end to end', () => {
    const container = document.createElement('div');
    const { canvas, screen } = createSimulator(container, { width: 100, height: 100 });
    const button = new Button({ x: 10, y: 10, width: 30, height: 20, text: 'Go' });
    const clicked = vi.fn();
    button.addEventListener('clicked', clicked);
    screen.addChild(button);

    canvas.dispatchEvent(pointerEventAt('pointerdown', 20, 20));
    expect(button.pressed).toBe(true);

    canvas.dispatchEvent(pointerEventAt('pointerup', 20, 20));

    expect(button.pressed).toBe(false);
    expect(clicked).toHaveBeenCalledWith({ target: button });
  });

  it('destroy() stops the render loop and detaches pointer input without throwing', () => {
    const container = document.createElement('div');
    const simulator = createSimulator(container, { width: 100, height: 100 });
    const button = new Button({ x: 10, y: 10, width: 30, height: 20, text: 'Go' });
    simulator.screen.addChild(button);

    expect(() => simulator.destroy()).not.toThrow();

    const clicked = vi.fn();
    button.addEventListener('clicked', clicked);
    simulator.canvas.dispatchEvent(pointerEventAt('pointerdown', 20, 20));
    simulator.canvas.dispatchEvent(pointerEventAt('pointerup', 20, 20));

    expect(clicked).not.toHaveBeenCalled();
  });
});
