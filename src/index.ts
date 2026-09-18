import { LvObject } from './core/LvObject';
import { createRenderLoop } from './core/RenderLoop';
import { createDisplayDriver, type ColorFormat, type DisplayDriver } from './display/DisplayDriver';

export { LvObject } from './core/LvObject';
export type { LvObjectOptions } from './core/LvObject';
export { createRenderLoop } from './core/RenderLoop';
export type { RenderLoop, RenderLoopScheduler } from './core/RenderLoop';
export { createDisplayDriver } from './display/DisplayDriver';
export type { ColorFormat, DisplayDriver, DisplayDriverOptions } from './display/DisplayDriver';

/**
 * Options for {@link createSimulator}.
 */
export interface SimulatorOptions {
  readonly width: number;
  readonly height: number;
  readonly backgroundColor?: string;
  readonly colorFormat?: ColorFormat;
  readonly devicePixelRatio?: number;
}

/**
 * Handle to a mounted simulator instance.
 */
export interface Simulator {
  readonly canvas: HTMLCanvasElement;
  readonly displayDriver: DisplayDriver;
  /** Root of the object tree, analogous to LVGL's `lv_scr_act()`. */
  readonly screen: LvObject;
  /** Starts the render loop (full repaint on every animation frame). */
  start(): void;
  /** Stops the render loop. */
  stop(): void;
  /** Repaints the current tree once, without starting the render loop. */
  renderOnce(): void;
}

/**
 * Mounts a simulator display inside `container`: a `<canvas>` sized to the
 * given resolution, an object tree rooted at `screen`, and a render loop
 * that repaints the whole tree every frame (see docs/PLAN.md, Stage 1).
 * Widgets, layout, and interaction are built on top of `screen` in later
 * stages.
 */
export function createSimulator(container: HTMLElement, options: SimulatorOptions): Simulator {
  const { width, height, backgroundColor = '#ffffff', colorFormat, devicePixelRatio } = options;

  const displayDriver = createDisplayDriver({ width, height, colorFormat, devicePixelRatio });
  const screen = new LvObject({ x: 0, y: 0, width, height, backgroundColor });

  function renderOnce(): void {
    displayDriver.context.clearRect(0, 0, displayDriver.width, displayDriver.height);
    screen.render(displayDriver.context);
  }

  const loop = createRenderLoop(renderOnce);

  container.appendChild(displayDriver.canvas);
  renderOnce();

  return {
    canvas: displayDriver.canvas,
    displayDriver,
    screen,
    start: () => loop.start(),
    stop: () => loop.stop(),
    renderOnce,
  };
}
