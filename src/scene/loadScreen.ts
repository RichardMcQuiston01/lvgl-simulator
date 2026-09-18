import { Button } from '../widgets/Button.js';
import { Checkbox } from '../widgets/Checkbox.js';
import { Container } from '../widgets/Container.js';
import { ImageWidget } from '../widgets/ImageWidget.js';
import { Label } from '../widgets/Label.js';
import type { LvObject } from '../core/LvObject.js';
import { Slider } from '../widgets/Slider.js';
import {
  SCENE_SCHEMA_VERSION,
  type Scene,
  type SceneButtonNode,
  type SceneCheckboxNode,
  type SceneContainerNode,
  type SceneImageNode,
  type SceneLabelNode,
  type SceneNode,
  type SceneSliderNode,
  type SceneSwitchNode,
} from './SceneSchema.js';
import { Switch } from '../widgets/Switch.js';

/**
 * Builds the object tree `scene` describes and returns its root — a
 * `Container` sized and styled per `scene`, mirroring how `createSimulator`
 * builds its own `screen`. Throws if `scene.version` doesn't match
 * {@link SCENE_SCHEMA_VERSION}, or if a node's `type` isn't recognized
 * (both realistic failure modes for hand-written or externally-produced
 * JSON, which — unlike a `Scene` built in TypeScript — isn't checked at
 * compile time).
 */
export function loadScreen(scene: Scene): Container {
  if (scene.version !== SCENE_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported scene schema version ${JSON.stringify(scene.version)} — this build of ` +
        `@richardmcquiston01/lvgl-simulator supports version ${SCENE_SCHEMA_VERSION}.`,
    );
  }

  return buildContainer({
    type: 'container',
    width: scene.width,
    height: scene.height,
    style: scene.style,
    layout: scene.layout,
    padding: scene.padding,
    children: scene.children,
  });
}

function buildNode(node: SceneNode): LvObject {
  switch (node.type) {
    case 'container':
      return buildContainer(node);
    case 'label':
      return buildLabel(node);
    case 'button':
      return buildButton(node);
    case 'checkbox':
      return buildCheckbox(node);
    case 'switch':
      return buildSwitch(node);
    case 'slider':
      return buildSlider(node);
    case 'image':
      return buildImage(node);
    default: {
      // Exhaustive in TypeScript; a real runtime guard for untyped JSON.
      const unknownType = (node as { readonly type?: unknown }).type;
      throw new Error(
        `Unknown scene node type ${JSON.stringify(unknownType)}. Supported types: ` +
          `container, label, button, checkbox, switch, slider, image.`,
      );
    }
  }
}

function buildContainer(node: SceneContainerNode): Container {
  const container = new Container({
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    style: node.style,
    flexGrow: node.flexGrow,
    gridColumn: node.gridColumn,
    gridRow: node.gridRow,
    gridColumnSpan: node.gridColumnSpan,
    gridRowSpan: node.gridRowSpan,
    pressed: node.pressed,
    disabled: node.disabled,
    focused: node.focused,
    layout: node.layout,
    padding: node.padding,
  });

  for (const child of node.children ?? []) {
    container.addChild(buildNode(child));
  }

  return container;
}

function buildLabel(node: SceneLabelNode): Label {
  return new Label({
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    style: node.style,
    flexGrow: node.flexGrow,
    gridColumn: node.gridColumn,
    gridRow: node.gridRow,
    gridColumnSpan: node.gridColumnSpan,
    gridRowSpan: node.gridRowSpan,
    pressed: node.pressed,
    disabled: node.disabled,
    focused: node.focused,
    text: node.text,
    textColor: node.textColor,
    fontSize: node.fontSize,
    fontFamily: node.fontFamily,
  });
}

function buildButton(node: SceneButtonNode): Button {
  return new Button({
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    style: node.style,
    flexGrow: node.flexGrow,
    gridColumn: node.gridColumn,
    gridRow: node.gridRow,
    gridColumnSpan: node.gridColumnSpan,
    gridRowSpan: node.gridRowSpan,
    pressed: node.pressed,
    disabled: node.disabled,
    focused: node.focused,
    text: node.text,
    backgroundColor: node.backgroundColor,
    textColor: node.textColor,
  });
}

function buildCheckbox(node: SceneCheckboxNode): Checkbox {
  return new Checkbox({
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    style: node.style,
    flexGrow: node.flexGrow,
    gridColumn: node.gridColumn,
    gridRow: node.gridRow,
    gridColumnSpan: node.gridColumnSpan,
    gridRowSpan: node.gridRowSpan,
    pressed: node.pressed,
    disabled: node.disabled,
    focused: node.focused,
    text: node.text,
    checked: node.checked,
    indicatorStyle: node.indicatorStyle,
  });
}

function buildSwitch(node: SceneSwitchNode): Switch {
  return new Switch({
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    style: node.style,
    flexGrow: node.flexGrow,
    gridColumn: node.gridColumn,
    gridRow: node.gridRow,
    gridColumnSpan: node.gridColumnSpan,
    gridRowSpan: node.gridRowSpan,
    pressed: node.pressed,
    disabled: node.disabled,
    focused: node.focused,
    checked: node.checked,
    knobStyle: node.knobStyle,
  });
}

function buildSlider(node: SceneSliderNode): Slider {
  return new Slider({
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    style: node.style,
    flexGrow: node.flexGrow,
    gridColumn: node.gridColumn,
    gridRow: node.gridRow,
    gridColumnSpan: node.gridColumnSpan,
    gridRowSpan: node.gridRowSpan,
    pressed: node.pressed,
    disabled: node.disabled,
    focused: node.focused,
    min: node.min,
    max: node.max,
    value: node.value,
    indicatorStyle: node.indicatorStyle,
    knobStyle: node.knobStyle,
  });
}

function buildImage(node: SceneImageNode): ImageWidget {
  return new ImageWidget({
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    style: node.style,
    flexGrow: node.flexGrow,
    gridColumn: node.gridColumn,
    gridRow: node.gridRow,
    gridColumnSpan: node.gridColumnSpan,
    gridRowSpan: node.gridRowSpan,
    pressed: node.pressed,
    disabled: node.disabled,
    focused: node.focused,
    src: node.src,
  });
}
