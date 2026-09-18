/**
 * Options for {@link createSimulator}.
 */
export interface SimulatorOptions {
  readonly width: number;
  readonly height: number;
  readonly backgroundColor?: string;
}

/**
 * Handle to a mounted simulator instance.
 */
export interface Simulator {
  readonly canvas: HTMLCanvasElement;
}

/**
 * Stage 0 placeholder: mounts a blank canvas sized to the given resolution
 * inside `container`. This stands in for the real display-driver + render
 * loop built in Stage 1 (see docs/PLAN.md) so the Vite playground has
 * something to render against from the start.
 */
export function createSimulator(container: HTMLElement, options: SimulatorOptions): Simulator {
  const { width, height, backgroundColor = '#ffffff' } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to acquire a 2D rendering context for the simulator canvas.');
  }

  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, width, height);

  container.appendChild(canvas);

  return { canvas };
}
