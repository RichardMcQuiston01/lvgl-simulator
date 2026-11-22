import { Arc } from '../widgets/Arc.js';
import { ArcLabel } from '../widgets/ArcLabel.js';
import { Bar } from '../widgets/Bar.js';
import { Button } from '../widgets/Button.js';
import { ButtonMatrix } from '../widgets/ButtonMatrix.js';
import { Checkbox } from '../widgets/Checkbox.js';
import { CheckboxGroup } from '../widgets/CheckboxGroup.js';
import { Dropdown } from '../widgets/Dropdown.js';
import { Container } from '../widgets/Container.js';
import { ImageButton } from '../widgets/ImageButton.js';
import { ImageWidget } from '../widgets/ImageWidget.js';
import { Keyboard } from '../widgets/Keyboard.js';
import { Led } from '../widgets/Led.js';
import { Line } from '../widgets/Line.js';
import { Label } from '../widgets/Label.js';
import { Menu, MenuPage, type MenuColumn } from '../widgets/Menu.js';
import { Msgbox } from '../widgets/Msgbox.js';
import { List } from '../widgets/List.js';
import { Roller } from '../widgets/Roller.js';
import type { LvObject } from '../core/LvObject.js';
import { Scale } from '../widgets/Scale.js';
import { Slider } from '../widgets/Slider.js';
import { Span } from '../widgets/Span.js';
import { Spinbox } from '../widgets/Spinbox.js';
import { Spinner } from '../widgets/Spinner.js';
import { Tabview } from '../widgets/Tabview.js';
import { Tileview } from '../widgets/Tileview.js';
import { Win } from '../widgets/Win.js';
import { Textarea } from '../widgets/Textarea.js';
import {
  SCENE_SCHEMA_VERSION,
  type Scene,
  type SceneArcLabelNode,
  type SceneArcNode,
  type SceneBarNode,
  type SceneButtonMatrixNode,
  type SceneButtonNode,
  type SceneCheckboxNode,
  type SceneContainerNode,
  type SceneDropdownNode,
  type SceneImageButtonNode,
  type SceneImageNode,
  type SceneKeyboardNode,
  type SceneLabelNode,
  type SceneLedNode,
  type SceneLineNode,
  type SceneMenuItem,
  type SceneMenuNode,
  type SceneMenuPage,
  type SceneMenuSection,
  type SceneMenuSeparator,
  type SceneMsgboxNode,
  type SceneListNode,
  type SceneNode,
  type SceneNodeBase,
  type SceneRollerNode,
  type SceneScaleNode,
  type SceneSliderNode,
  type SceneSpanNode,
  type SceneSpinboxNode,
  type SceneSpinnerNode,
  type SceneTabviewNode,
  type SceneTileviewNode,
  type SceneWinNode,
  type SceneTextareaNode,
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
  const context: BuildContext = { radioGroups: new Map() };
  if (scene.version !== SCENE_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported scene schema version ${JSON.stringify(scene.version)} — this build of ` +
        `@richardmcquiston01/lvgl-simulator supports version ${SCENE_SCHEMA_VERSION}.`,
    );
  }

  return buildContainer(
    {
      type: 'container',
      width: scene.width,
      height: scene.height,
      style: scene.style,
      layout: scene.layout,
      padding: scene.padding,
      children: scene.children,
    },
    context,
  );
}

/** State shared by every node built in one {@link loadScreen} call. */
interface BuildContext {
  /** Radio groups by name, so checkboxes naming the same group end up in one `CheckboxGroup`. */
  readonly radioGroups: Map<string, CheckboxGroup>;
}

/** Builds the widget a scene node describes by dispatching on its `type`; throws on an unknown type. */
function buildNode(node: SceneNode, context: BuildContext): LvObject {
  switch (node.type) {
    case 'container':
      return buildContainer(node, context);
    case 'label':
      return buildLabel(node);
    case 'button':
      return buildButton(node);
    case 'checkbox':
      return buildCheckbox(node, context);
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
    case 'textarea':
      return buildTextarea(node);
    case 'keyboard':
      return buildKeyboard(node);
    case 'spinbox':
      return buildSpinbox(node);
    case 'span':
      return buildSpan(node);
    case 'arclabel':
      return buildArcLabel(node);
    case 'dropdown':
      return buildDropdown(node);
    case 'roller':
      return buildRoller(node);
    case 'buttonmatrix':
      return buildButtonMatrix(node);
    case 'list':
      return buildList(node);
    case 'win':
      return buildWin(node, context);
    case 'tabview':
      return buildTabview(node, context);
    case 'tileview':
      return buildTileview(node, context);
    case 'msgbox':
      return buildMsgbox(node);
    case 'menu':
      return buildMenu(node);
    default: {
      // Exhaustive in TypeScript; a real runtime guard for untyped JSON.
      const unknownType = (node as { readonly type?: unknown }).type;
      throw new Error(
        `Unknown scene node type ${JSON.stringify(unknownType)}. Supported types: ` +
          `container, label, button, checkbox, switch, slider, image, bar, arc, spinner, led, line, scale, ` +
          `imagebutton, textarea, keyboard, spinbox, span, arclabel, dropdown, roller, buttonmatrix, list, win, tabview, tileview, msgbox, menu.`,
      );
    }
  }
}

/** Builds a `Container` and, recursively, all of its `children`. */
function buildContainer(node: SceneContainerNode, context: BuildContext): Container {
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
    container.addChild(buildNode(child, context));
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

/** Builds a `Checkbox`, joining the scene-wide radio group named by `radioGroup`, if any. */
function buildCheckbox(node: SceneCheckboxNode, context: BuildContext): Checkbox {
  let group: CheckboxGroup | undefined;
  if (node.radioGroup !== undefined) {
    group = context.radioGroups.get(node.radioGroup) ?? new CheckboxGroup();
    context.radioGroups.set(node.radioGroup, group);
  }
  return new Checkbox({
    group,
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

function buildTextarea(node: SceneTextareaNode): Textarea {
  return new Textarea({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    text: node.text,
    placeholder: node.placeholder,
    oneLine: node.oneLine,
    passwordMode: node.passwordMode,
    passwordChar: node.passwordChar,
    maxLength: node.maxLength,
    acceptedChars: node.acceptedChars,
    blinkMs: node.blinkMs,
    placeholderStyle: node.placeholderStyle,
    selectionStyle: node.selectionStyle,
    cursorStyle: node.cursorStyle,
  });
}

function buildKeyboard(node: SceneKeyboardNode): Keyboard {
  return new Keyboard({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    mode: node.mode,
    gap: node.gap,
    padding: node.padding,
    itemsStyle: node.itemsStyle,
    controlKeyStyle: node.controlKeyStyle,
  });
}

function buildSpinbox(node: SceneSpinboxNode): Spinbox {
  return new Spinbox({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    value: node.value,
    min: node.min,
    max: node.max,
    digitCount: node.digitCount,
    decimalDigits: node.decimalDigits,
    step: node.step,
    rollover: node.rollover,
    cursorStyle: node.cursorStyle,
  });
}

function buildSpan(node: SceneSpanNode): Span {
  return new Span({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    spans: node.spans,
    mode: node.mode,
    overflow: node.overflow,
    maxLines: node.maxLines,
    indent: node.indent,
    lineSpacing: node.lineSpacing,
  });
}

function buildArcLabel(node: SceneArcLabelNode): ArcLabel {
  return new ArcLabel({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    text: node.text,
    radius: node.radius,
    startAngle: node.startAngle,
    sweepAngle: node.sweepAngle,
    direction: node.direction,
    align: node.align,
    verticalAlign: node.verticalAlign,
    centerOffsetX: node.centerOffsetX,
    centerOffsetY: node.centerOffsetY,
  });
}

function buildDropdown(node: SceneDropdownNode): Dropdown {
  return new Dropdown({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    options: node.options,
    selected: node.selected,
    direction: node.direction,
    text: node.text,
    symbol: node.symbol,
    itemHeight: node.itemHeight,
    maxListHeight: node.maxListHeight,
    selectedHighlight: node.selectedHighlight,
    itemsStyle: node.itemsStyle,
  });
}

function buildRoller(node: SceneRollerNode): Roller {
  return new Roller({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    options: node.options,
    selected: node.selected,
    visibleRows: node.visibleRows,
    infinite: node.infinite,
    selectedStyle: node.selectedStyle,
  });
}

/** Builds a `ButtonMatrix`, reading a `null` control entry as a button with no flags. */
function buildButtonMatrix(node: SceneButtonMatrixNode): ButtonMatrix {
  return new ButtonMatrix({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    map: node.map,
    // JSON has no `undefined`, so a `null` entry stands for "no flags for this button".
    controls: node.controls?.map((control) => control ?? undefined),
    oneChecked: node.oneChecked,
    gap: node.gap,
    padding: node.padding,
    itemsStyle: node.itemsStyle,
  });
}

/** Builds a `List` and adds each described heading or button row to it. */
function buildList(node: SceneListNode): List {
  const list = new List({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    itemHeight: node.itemHeight,
  });
  for (const item of node.items ?? []) {
    if (item.kind === 'text') {
      list.addText(item.text);
    } else {
      list.addButton(item.text, item.icon);
    }
  }
  return list;
}

/** Builds a `Win`, adding its header buttons and building `children` into its content area. */
function buildWin(node: SceneWinNode, context: BuildContext): Win {
  const win = new Win({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    title: node.title,
    headerHeight: node.headerHeight,
    headerStyle: node.headerStyle,
    contentStyle: node.contentStyle,
  });
  for (const button of node.headerButtons ?? []) {
    win.addButton(button.text, button.width);
  }
  for (const child of node.children ?? []) {
    win.content.addChild(buildNode(child, context));
  }
  return win;
}

/** Builds a `Tabview` with one page per tab, each filled from that tab's `children`. */
function buildTabview(node: SceneTabviewNode, context: BuildContext): Tabview {
  const view = new Tabview({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    tabPosition: node.tabPosition,
    tabBarSize: node.tabBarSize,
    barStyle: node.barStyle,
    tabStyle: node.tabStyle,
    indicatorColor: node.indicatorColor,
    indicatorThickness: node.indicatorThickness,
  });
  for (const tab of node.tabs ?? []) {
    const page = view.addTab(tab.name);
    for (const child of tab.children ?? []) {
      page.addChild(buildNode(child, context));
    }
  }
  return view;
}

/** Builds a `Tileview` with each described tile, filled from its `children`. */
function buildTileview(node: SceneTileviewNode, context: BuildContext): Tileview {
  const view = new Tileview({
    ...commonFields(node),
    width: node.width,
    height: node.height,
  });
  for (const tile of node.tiles ?? []) {
    const container = view.addTile(tile.col, tile.row, tile.directions);
    for (const child of tile.children ?? []) {
      container.addChild(buildNode(child, context));
    }
  }
  return view;
}

/** Builds a `Msgbox`. */
function buildMsgbox(node: SceneMsgboxNode): Msgbox {
  return new Msgbox({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    title: node.title,
    text: node.text,
    buttons: node.buttons,
    closeButton: node.closeButton,
    modal: node.modal,
    boxWidth: node.boxWidth,
    dismissOnBackdrop: node.dismissOnBackdrop,
    boxStyle: node.boxStyle,
  });
}

/**
 * Builds a `Menu`. Every page is created first so items can name any page,
 * including ones defined later; then their rows are filled in, and the root
 * (and sidebar) page set. A `page` naming no page throws.
 */
function buildMenu(node: SceneMenuNode): Menu {
  const menu = new Menu({
    ...commonFields(node),
    width: node.width,
    height: node.height,
    headerHeight: node.headerHeight,
    sidebarWidth: node.sidebarWidth,
    itemHeight: node.itemHeight,
    alwaysShowBack: node.alwaysShowBack,
    headerStyle: node.headerStyle,
  });
  const pages = new Map<string, MenuPage>();
  for (const description of node.pages ?? []) {
    pages.set(description.id, menu.createPage(description.title));
  }
  const lookup = (id: string, usedBy: string): MenuPage => {
    const page = pages.get(id);
    if (!page) {
      throw new Error(
        `Menu ${usedBy} refers to the page ${JSON.stringify(id)}, but the menu's pages are ` +
          `${JSON.stringify([...pages.keys()])}.`,
      );
    }
    return page;
  };
  const fill = (column: MenuColumn, entries: SceneMenuPage['items'], owner: string): void => {
    for (const entry of entries ?? []) {
      addMenuEntry(column, entry, owner, lookup);
    }
  };
  for (const description of node.pages ?? []) {
    const page = lookup(description.id, 'itself');
    fill(page, description.items, `page ${JSON.stringify(description.id)}`);
  }
  const root = node.rootPage ?? node.pages?.[0]?.id;
  if (root !== undefined) {
    menu.setPage(lookup(root, 'rootPage'));
  }
  if (node.sidebarPage !== undefined) {
    menu.setSidebarPage(lookup(node.sidebarPage, 'sidebarPage'));
  }
  return menu;
}

/** Adds one described row, section or separator to `column`. */
function addMenuEntry(
  column: MenuColumn,
  entry: SceneMenuItem | SceneMenuSection | SceneMenuSeparator,
  owner: string,
  lookup: (id: string, usedBy: string) => MenuPage,
): void {
  if (entry.kind === 'separator') {
    column.addSeparator();
  } else if (entry.kind === 'section') {
    if (!(column instanceof MenuPage)) {
      throw new Error(`Menu ${owner} puts a section inside a section, which is not supported.`);
    }
    const section = column.addSection(entry.title);
    for (const inner of entry.items ?? []) {
      addMenuEntry(section, inner, owner, lookup);
    }
  } else {
    column.addItem(entry.text, {
      icon: entry.icon,
      page: entry.page === undefined ? undefined : lookup(entry.page, owner),
    });
  }
}
