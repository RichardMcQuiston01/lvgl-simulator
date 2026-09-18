import { createRenderLoop } from './core/RenderLoop';
import { createDisplayDriver, type ColorFormat, type DisplayDriver } from './display/DisplayDriver';
import { Container, type ContainerLayout } from './widgets/Container';

export { LvObject } from './core/LvObject';
export type { LvObjectOptions } from './core/LvObject';
export { createRenderLoop } from './core/RenderLoop';
export type { RenderLoop, RenderLoopScheduler } from './core/RenderLoop';
export { createDisplayDriver } from './display/DisplayDriver';
export type { ColorFormat, DisplayDriver, DisplayDriverOptions } from './display/DisplayDriver';

export { defaultTheme } from './theme/defaultTheme';

export { applyFlexLayout } from './layout/flex';
export type {
  FlexCrossAlign,
  FlexDirection,
  FlexLayout,
  FlexMainAlign,
  FlexWrap,
} from './layout/flex';
export { applyGridLayout } from './layout/grid';
export type { GridLayout } from './layout/grid';

export { Container } from './widgets/Container';
export type { ContainerLayout, ContainerOptions } from './widgets/Container';
export { Label } from './widgets/Label';
export type { LabelOptions } from './widgets/Label';
export { Button } from './widgets/Button';
export type { ButtonOptions } from './widgets/Button';
export { Checkbox } from './widgets/Checkbox';
export type { CheckboxOptions } from './widgets/Checkbox';
export { Switch } from './widgets/Switch';
export type { SwitchOptions } from './widgets/Switch';
export { Slider } from './widgets/Slider';
export type { SliderOptions } from './widgets/Slider';
export { ImageWidget } from './widgets/ImageWidget';
export type { ImageWidgetOptions } from './widgets/ImageWidget';

/**
 * Options for {@link createSimulator}.
 */
export interface SimulatorOptions {
  readonly width: number;
  readonly height: number;
  readonly backgroundColor?: string;
  readonly colorFormat?: ColorFormat;
  readonly devicePixelRatio?: number;
  /** Flex/grid layout applied to the screen's own direct children. */
  readonly layout?: ContainerLayout;
  readonly padding?: number;
}

/**
 * Handle to a mounted simulator instance.
 */
export interface Simulator {
  readonly canvas: HTMLCanvasElement;
  readonly displayDriver: DisplayDriver;
  /** Root of the object tree, analogous to LVGL's `lv_scr_act()`. */
  readonly screen: Container;
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
 * that repaints the whole tree every frame (see docs/PLAN.md). `screen` is
 * a {@link Container}, so widgets (Stage 2) can be added directly with an
 * optional flex/grid layout; interaction (Stage 4) builds on top of it.
 */
export function createSimulator(container: HTMLElement, options: SimulatorOptions): Simulator {
  const {
    width,
    height,
    backgroundColor = '#ffffff',
    colorFormat,
    devicePixelRatio,
    layout,
    padding,
  } = options;

  const displayDriver = createDisplayDriver({ width, height, colorFormat, devicePixelRatio });
  const screen = new Container({ x: 0, y: 0, width, height, backgroundColor, layout, padding });

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
