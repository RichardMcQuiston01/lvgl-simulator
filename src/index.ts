import { createRenderLoop } from './core/RenderLoop.js';
import {
  createDisplayDriver,
  type ColorFormat,
  type DisplayDriver,
} from './display/DisplayDriver.js';
import { attachInteraction } from './interaction/InteractionController.js';
import { mergeStyle, paddingAll } from './style/Style.js';
import { Container, type ContainerLayout } from './widgets/Container.js';

export { LvObject } from './core/LvObject.js';
export type { LvObjectOptions } from './core/LvObject.js';
export { createRenderLoop } from './core/RenderLoop.js';
export type { RenderLoop, RenderLoopScheduler } from './core/RenderLoop.js';
export { createDisplayDriver } from './display/DisplayDriver.js';
export type { ColorFormat, DisplayDriver, DisplayDriverOptions } from './display/DisplayDriver.js';

export { defaultTheme } from './theme/defaultTheme.js';

export { mergeStyle, paddingAll, resolveStyle } from './style/Style.js';
export type { LvState, Style, StyleSet } from './style/Style.js';
export { withOpacity } from './style/color.js';

export type { LvEvent, LvEventMap } from './events/LvEvent.js';

export { attachInteraction } from './interaction/InteractionController.js';
export type { InteractionController } from './interaction/InteractionController.js';
export { hitTest } from './interaction/hitTest.js';
export { isPointerDraggable } from './interaction/PointerDraggable.js';
export type { PointerDraggable } from './interaction/PointerDraggable.js';

export { loadScreen } from './scene/loadScreen.js';
export { SCENE_SCHEMA_VERSION } from './scene/SceneSchema.js';
export type {
  Scene,
  SceneButtonNode,
  SceneCheckboxNode,
  SceneContainerNode,
  SceneImageNode,
  SceneLabelNode,
  SceneNode,
  SceneNodeBase,
  SceneSliderNode,
  SceneSwitchNode,
  SceneWidgetType,
} from './scene/SceneSchema.js';

export { applyFlexLayout } from './layout/flex.js';
export type {
  FlexCrossAlign,
  FlexDirection,
  FlexLayout,
  FlexMainAlign,
  FlexWrap,
} from './layout/flex.js';
export { applyGridLayout } from './layout/grid.js';
export type { GridLayout } from './layout/grid.js';

export { Container } from './widgets/Container.js';
export type { ContainerLayout, ContainerOptions } from './widgets/Container.js';
export { Label } from './widgets/Label.js';
export type { LabelOptions } from './widgets/Label.js';
export { Button } from './widgets/Button.js';
export type { ButtonOptions } from './widgets/Button.js';
export { Checkbox } from './widgets/Checkbox.js';
export type { CheckboxOptions } from './widgets/Checkbox.js';
export { Switch } from './widgets/Switch.js';
export type { SwitchOptions } from './widgets/Switch.js';
export { Slider } from './widgets/Slider.js';
export type { SliderOptions } from './widgets/Slider.js';
export { ImageWidget } from './widgets/ImageWidget.js';
export type { ImageWidgetOptions } from './widgets/ImageWidget.js';

/**
 * Options for {@link createSimulator}.
 */
export interface SimulatorOptions {
  readonly width: number;
  readonly height: number;
  /** Sugar for the screen's `style.base.bgColor`. */
  readonly backgroundColor?: string;
  readonly colorFormat?: ColorFormat;
  readonly devicePixelRatio?: number;
  /** Flex/grid layout applied to the screen's own direct children. */
  readonly layout?: ContainerLayout;
  /** Sugar for a uniform `style.base` padding on the screen. */
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
  /** Stops the render loop and detaches pointer input handling. Call when unmounting. */
  destroy(): void;
}

/**
 * Mounts a simulator display inside `container`: a `<canvas>` sized to the
 * given resolution, an object tree rooted at `screen`, a render loop that
 * repaints the whole tree every frame, and pointer input wired to `screen`
 * (see docs/PLAN.md — `attachInteraction` drives pressed/released/clicked/
 * valueChanged). `screen` is a {@link Container}, so widgets can be added
 * directly with an optional flex/grid layout and a `StyleSet`.
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
  const screen = new Container({
    x: 0,
    y: 0,
    width,
    height,
    layout,
    style: {
      base: mergeStyle(
        { bgColor: backgroundColor },
        padding !== undefined ? paddingAll(padding) : undefined,
      ),
    },
  });

  function renderOnce(): void {
    displayDriver.context.clearRect(0, 0, displayDriver.width, displayDriver.height);
    screen.render(displayDriver.context);
  }

  const loop = createRenderLoop(renderOnce);
  const interaction = attachInteraction(displayDriver.canvas, screen, renderOnce);

  container.appendChild(displayDriver.canvas);
  renderOnce();

  return {
    canvas: displayDriver.canvas,
    displayDriver,
    screen,
    start: () => loop.start(),
    stop: () => loop.stop(),
    renderOnce,
    destroy: () => {
      loop.stop();
      interaction.dispose();
    },
  };
}
