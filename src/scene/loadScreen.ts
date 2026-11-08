import { Arc } from '../widgets/Arc.js';
import { Bar } from '../widgets/Bar.js';
import { Button } from '../widgets/Button.js';
import { Checkbox } from '../widgets/Checkbox.js';
import { Container } from '../widgets/Container.js';
import { ImageButton } from '../widgets/ImageButton.js';
import { ImageWidget } from '../widgets/ImageWidget.js';
import { Led } from '../widgets/Led.js';
import { Line } from '../widgets/Line.js';
import { Label } from '../widgets/Label.js';
import type { LvObject } from '../core/LvObject.js';
import { Scale } from '../widgets/Scale.js';
import { Slider } from '../widgets/Slider.js';
import { Spinner } from '../widgets/Spinner.js';
import {
  SCENE_SCHEMA_VERSION,
  type Scene,
  type SceneArcNode,
  type SceneBarNode,
  type SceneButtonNode,
  type SceneCheckboxNode,
  type SceneContainerNode,
  type SceneImageButtonNode,
  type SceneImageNode,
  type SceneLabelNode,
  type SceneLedNode,
  type SceneLineNode,
  type SceneNode,
  type SceneNodeBase,
  type SceneScaleNode,
  type SceneSliderNode,
  type SceneSpinnerNode,
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
    case 'bar':
      return buildBar(node);
    case 'arc':
      return buildArc(node);
    case 'spinner':
      return buildSpinner(node);
    case 'led':
      return buildLed(node);
    case 'line':
      return buildLine(node);
    case 'scale':
      return buildScale(node);
    case 'imagebutton':
      return buildImageButton(node);
    default: {
      // Exhaustive in TypeScript; a real runtime guard for untyped JSON.
      const unknownType = (node as { readonly type?: unknown }).type;
      throw new Error(
        `Unknown scene node type ${JSON.stringify(unknownType)}. Supported types: ` +
          `container, label, button, checkbox, switch, slider, image, bar, arc, spinner, led, line, scale, ` +
          `imagebutton.`,
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

/** The `LvObjectOptions` fields every node shares except its size, which `Line` leaves optional. */
function commonFields(node: Omit<SceneNodeBase, 'width' | 'height'>): {
  readonly x: number | undefined;
  readonly y: number | undefined;
  readonly style: SceneNodeBase['style'];
  readonly flexGrow: number | undefined;
  readonly gridColumn: number | undefined;
  readonly gridRow: number | undefined;
  readonly gridColumnSpan: number | undefined;
  readonly gridRowSpan: number | undefined;
  readonly pressed: boolean | undefined;
  readonly disabled: boolean | undefined;
  readonly focused: boolean | undefined;
} {
  return {
    x: node.x,
    y: node.y,
    style: node.style,
    flexGrow: node.flexGrow,
    gridColumn: node.gridColumn,
    gridRow: node.gridRow,
    gridColumnSpan: node.gridColumnSpan,
    gridRowSpan: node.gridRowSpan,
    pressed: node.pressed,
    disabled: node.disabled,
    focused: node.focused,
  };
}

function buildBar(node: SceneBarNode): Bar {
  return new Bar({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    min: node.min,
    max: node.max,
    value: node.value,
    startValue: node.startValue,
    mode: node.mode,
    orientation: node.orientation,
    indicatorStyle: node.indicatorStyle,
  });
}

function buildArc(node: SceneArcNode): Arc {
  return new Arc({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    min: node.min,
    max: node.max,
    value: node.value,
    bgStartAngle: node.bgStartAngle,
    bgEndAngle: node.bgEndAngle,
    rotation: node.rotation,
    mode: node.mode,
    indicatorStyle: node.indicatorStyle,
    knobStyle: node.knobStyle,
  });
}

function buildSpinner(node: SceneSpinnerNode): Spinner {
  return new Spinner({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    spinTimeMs: node.spinTimeMs,
    arcLengthDegrees: node.arcLengthDegrees,
    indicatorStyle: node.indicatorStyle,
  });
}

function buildLed(node: SceneLedNode): Led {
  return new Led({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    color: node.color,
    brightness: node.brightness,
  });
}

function buildLine(node: SceneLineNode): Line {
  return new Line({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    points: node.points,
    yInvert: node.yInvert,
  });
}

function buildScale(node: SceneScaleNode): Scale {
  return new Scale({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    mode: node.mode,
    min: node.min,
    max: node.max,
    totalTickCount: node.totalTickCount,
    majorTickEvery: node.majorTickEvery,
    labelShow: node.labelShow,
    labels: node.labels,
    angleRange: node.angleRange,
    rotation: node.rotation,
    majorTickLength: node.majorTickLength,
    minorTickLength: node.minorTickLength,
    sections: node.sections,
    indicatorStyle: node.indicatorStyle,
    itemsStyle: node.itemsStyle,
  });
}

function buildImageButton(node: SceneImageButtonNode): ImageButton {
  return new ImageButton({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    images: node.images,
    checkable: node.checkable,
    checked: node.checked,
  });
}
