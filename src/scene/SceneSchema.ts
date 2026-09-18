import type { ContainerLayout } from '../widgets/Container.js';
import type { StyleSet } from '../style/Style.js';

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
  'container' | 'label' | 'button' | 'checkbox' | 'switch' | 'slider' | 'image';

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

export type SceneNode =
  | SceneContainerNode
  | SceneLabelNode
  | SceneButtonNode
  | SceneCheckboxNode
  | SceneSwitchNode
  | SceneSliderNode
  | SceneImageNode;

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
