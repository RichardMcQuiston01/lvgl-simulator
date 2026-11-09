import type { ContainerLayout } from '../widgets/Container.js';
import type { Style, StyleSet } from '../style/Style.js';
import type { ArcLabelAlign, ArcLabelDirection } from '../widgets/arcLabelMath.js';
import type { ArcLabelVerticalAlign } from '../widgets/ArcLabel.js';
import type { ArcMode } from '../widgets/arcMath.js';
import type { BarMode, BarOrientation } from '../widgets/Bar.js';
import type { LinePoint } from '../widgets/Line.js';
import type { ImageButtonState } from '../widgets/ImageButton.js';
import type { KeyboardMode } from '../widgets/keyboardLayout.js';
import type { SpanMode, SpanOverflow } from '../widgets/Span.js';
import type { ScaleMode } from '../widgets/scaleMath.js';

/**
 * Current version of the scene-description schema. `loadScreen()` rejects
 * any `Scene` whose `version` doesn't match, with a message naming both,
 * so a producer targeting a stale/newer schema fails loudly instead of
 * silently misrendering. Bump this — and add a migration or a versioned
 * union of schemas, as needed — whenever a breaking change is made to the
 * shapes below.
 */
export const SCENE_SCHEMA_VERSION = 1;

/** Widget types a `SceneNode.type` may be, one per concrete widget class in `src/widgets/`. */
export type SceneWidgetType =
  | 'container'
  | 'label'
  | 'button'
  | 'checkbox'
  | 'switch'
  | 'slider'
  | 'image'
  | 'bar'
  | 'arc'
  | 'spinner'
  | 'led'
  | 'line'
  | 'scale'
  | 'imagebutton'
  | 'textarea'
  | 'keyboard'
  | 'spinbox'
  | 'span'
  | 'arclabel';

/**
 * Fields every scene node shares, mirroring {@link LvObjectOptions}
 * (`src/core/LvObject.ts`) exactly — this is deliberately a plain,
 * JSON-safe subset (no functions, no live objects) of that same option
 * set, so a `SceneNode` is just "the constructor options for some widget,
 * as data, plus a `type` tag saying which widget."
 */
export interface SceneNodeBase {
  readonly x?: number;
  readonly y?: number;
  readonly width: number;
  readonly height: number;
  readonly style?: StyleSet;
  readonly flexGrow?: number;
  readonly gridColumn?: number;
  readonly gridRow?: number;
  readonly gridColumnSpan?: number;
  readonly gridRowSpan?: number;
  readonly pressed?: boolean;
  readonly disabled?: boolean;
  readonly focused?: boolean;
}

/** A `Container` (see `src/widgets/Container.ts`) — the only node type that may have `children`. */
export interface SceneContainerNode extends SceneNodeBase {
  readonly type: 'container';
  readonly layout?: ContainerLayout;
  readonly padding?: number;
  readonly children?: readonly SceneNode[];
}

/** A `Label` (see `src/widgets/Label.ts`). */
export interface SceneLabelNode extends SceneNodeBase {
  readonly type: 'label';
  readonly text: string;
  readonly textColor?: string;
  readonly fontSize?: number;
  readonly fontFamily?: string;
}

/** A `Button` (see `src/widgets/Button.ts`). */
export interface SceneButtonNode extends SceneNodeBase {
  readonly type: 'button';
  readonly text?: string;
  readonly backgroundColor?: string;
  readonly textColor?: string;
}

/** A `Checkbox` (see `src/widgets/Checkbox.ts`). */
export interface SceneCheckboxNode extends SceneNodeBase {
  readonly type: 'checkbox';
  readonly text?: string;
  readonly checked?: boolean;
  readonly indicatorStyle?: StyleSet;
}

/** A `Switch` (see `src/widgets/Switch.ts`). */
export interface SceneSwitchNode extends SceneNodeBase {
  readonly type: 'switch';
  readonly checked?: boolean;
  readonly knobStyle?: StyleSet;
}

/** A `Slider` (see `src/widgets/Slider.ts`). */
export interface SceneSliderNode extends SceneNodeBase {
  readonly type: 'slider';
  readonly min?: number;
  readonly max?: number;
  readonly value?: number;
  readonly indicatorStyle?: StyleSet;
  readonly knobStyle?: StyleSet;
}

/**
 * An `ImageWidget` (see `src/widgets/ImageWidget.ts`). Only `src` (a URL)
 * is representable in JSON — `ImageWidgetOptions.image`/`onLoad` are a
 * live bitmap and a callback, neither of which serialize, so they have no
 * place in the scene schema.
 */
export interface SceneImageNode extends SceneNodeBase {
  readonly type: 'image';
  readonly src?: string;
}

/** A `Bar` (see `src/widgets/Bar.ts`). */
export interface SceneBarNode extends SceneNodeBase {
  readonly type: 'bar';
  readonly min?: number;
  readonly max?: number;
  readonly value?: number;
  readonly startValue?: number;
  readonly mode?: BarMode;
  readonly orientation?: BarOrientation;
  readonly indicatorStyle?: StyleSet;
}

/** An `Arc` (see `src/widgets/Arc.ts`). */
export interface SceneArcNode extends SceneNodeBase {
  readonly type: 'arc';
  readonly min?: number;
  readonly max?: number;
  readonly value?: number;
  readonly bgStartAngle?: number;
  readonly bgEndAngle?: number;
  readonly rotation?: number;
  readonly mode?: ArcMode;
  readonly indicatorStyle?: StyleSet;
  readonly knobStyle?: StyleSet;
}

/**
 * A `Spinner` (see `src/widgets/Spinner.ts`). `SpinnerOptions.now` is a
 * function, which cannot be serialized, so it has no place in the schema.
 */
export interface SceneSpinnerNode extends SceneNodeBase {
  readonly type: 'spinner';
  readonly spinTimeMs?: number;
  readonly arcLengthDegrees?: number;
  readonly indicatorStyle?: StyleSet;
}

/** A `Led` (see `src/widgets/Led.ts`). */
export interface SceneLedNode extends SceneNodeBase {
  readonly type: 'led';
  readonly color?: string;
  readonly brightness?: number;
}

/**
 * A `Line` (see `src/widgets/Line.ts`). Unlike every other node, `width` and
 * `height` are optional: omitted, the line sizes itself to its points.
 */
export interface SceneLineNode extends Omit<SceneNodeBase, 'width' | 'height'> {
  readonly type: 'line';
  readonly width?: number;
  readonly height?: number;
  readonly points?: readonly LinePoint[];
  readonly yInvert?: boolean;
}

/** One section of a `scale` node: a value range drawn with its own look. */
export interface SceneScaleSection {
  readonly min: number;
  readonly max: number;
  readonly mainStyle?: Partial<Style>;
  readonly indicatorStyle?: Partial<Style>;
  readonly itemsStyle?: Partial<Style>;
}

/** A `Scale` (see `src/widgets/Scale.ts`). */
export interface SceneScaleNode extends SceneNodeBase {
  readonly type: 'scale';
  readonly mode?: ScaleMode;
  readonly min?: number;
  readonly max?: number;
  readonly totalTickCount?: number;
  readonly majorTickEvery?: number;
  readonly labelShow?: boolean;
  readonly labels?: readonly string[];
  readonly angleRange?: number;
  readonly rotation?: number;
  readonly majorTickLength?: number;
  readonly minorTickLength?: number;
  readonly sections?: readonly SceneScaleSection[];
  readonly indicatorStyle?: StyleSet;
  readonly itemsStyle?: StyleSet;
}

/**
 * An `ImageButton` (see `src/widgets/ImageButton.ts`). Only URL strings are
 * representable in JSON, so each state's `left`/`mid`/`right` is a `src`.
 */
export interface SceneImageButtonNode extends SceneNodeBase {
  readonly type: 'imagebutton';
  readonly images?: Partial<
    Record<
      ImageButtonState,
      { readonly left?: string; readonly mid?: string; readonly right?: string }
    >
  >;
  readonly checkable?: boolean;
  readonly checked?: boolean;
}

/**
 * A `Textarea` (see `src/widgets/Textarea.ts`). `TextareaOptions.now` is a
 * function, which cannot be serialized, so it has no place in the schema.
 */
export interface SceneTextareaNode extends SceneNodeBase {
  readonly type: 'textarea';
  readonly text?: string;
  readonly placeholder?: string;
  readonly oneLine?: boolean;
  readonly passwordMode?: boolean;
  readonly passwordChar?: string;
  readonly maxLength?: number;
  readonly acceptedChars?: string;
  readonly blinkMs?: number;
  readonly placeholderStyle?: StyleSet;
  readonly selectionStyle?: StyleSet;
  readonly cursorStyle?: StyleSet;
}

/**
 * A `Keyboard` (see `src/widgets/Keyboard.ts`). `KeyboardOptions.target` is a
 * live widget, which a scene cannot reference, so a loaded keyboard has no
 * target: set `keyboard.target` in code after `loadScreen()`.
 */
export interface SceneKeyboardNode extends SceneNodeBase {
  readonly type: 'keyboard';
  readonly mode?: KeyboardMode;
  readonly gap?: number;
  readonly padding?: number;
  readonly itemsStyle?: StyleSet;
  readonly controlKeyStyle?: StyleSet;
}

/** A `Spinbox` (see `src/widgets/Spinbox.ts`). */
export interface SceneSpinboxNode extends SceneNodeBase {
  readonly type: 'spinbox';
  readonly value?: number;
  readonly min?: number;
  readonly max?: number;
  readonly digitCount?: number;
  readonly decimalDigits?: number;
  readonly step?: number;
  readonly rollover?: boolean;
  readonly cursorStyle?: StyleSet;
}

/** One run of a `span` node: its text and a partial style (`textColor`, `textFontSize`, `textFontFamily`, `textDecor`). */
export interface SceneSpanRun {
  readonly text: string;
  readonly style?: Partial<Style>;
}

/** A `Span` (see `src/widgets/Span.ts`). */
export interface SceneSpanNode extends SceneNodeBase {
  readonly type: 'span';
  readonly spans?: readonly SceneSpanRun[];
  readonly mode?: SpanMode;
  readonly overflow?: SpanOverflow;
  readonly maxLines?: number;
  readonly indent?: number;
  readonly lineSpacing?: number;
}

/** An `ArcLabel` (see `src/widgets/ArcLabel.ts`). */
export interface SceneArcLabelNode extends SceneNodeBase {
  readonly type: 'arclabel';
  readonly text?: string;
  readonly radius?: number;
  readonly startAngle?: number;
  readonly sweepAngle?: number;
  readonly direction?: ArcLabelDirection;
  readonly align?: ArcLabelAlign;
  readonly verticalAlign?: ArcLabelVerticalAlign;
  readonly centerOffsetX?: number;
  readonly centerOffsetY?: number;
}

export type SceneNode =
  | SceneContainerNode
  | SceneLabelNode
  | SceneButtonNode
  | SceneCheckboxNode
  | SceneSwitchNode
  | SceneSliderNode
  | SceneImageNode
  | SceneBarNode
  | SceneArcNode
  | SceneSpinnerNode
  | SceneLedNode
  | SceneLineNode
  | SceneScaleNode
  | SceneImageButtonNode
  | SceneTextareaNode
  | SceneKeyboardNode
  | SceneSpinboxNode
  | SceneSpanNode
  | SceneArcLabelNode;

/**
 * A full screen: the root is always a container (matching `createSimulator`'s
 * `screen`), described independently of any specific producer — see
 * `docs/SCENE_SCHEMA.md`. If/when this is compared against `html-to-lvgl`'s
 * own internal AST, that repo gets a thin adapter that maps its AST to
 * this shape, rather than this library adopting that AST as its public
 * contract (keeps the two repos decoupled — see docs/PLAN.md, Stage 5).
 */
export interface Scene {
  readonly version: typeof SCENE_SCHEMA_VERSION;
  readonly width: number;
  readonly height: number;
  readonly style?: StyleSet;
  readonly layout?: ContainerLayout;
  readonly padding?: number;
  readonly children?: readonly SceneNode[];
}
