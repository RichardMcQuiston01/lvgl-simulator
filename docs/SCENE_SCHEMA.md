# Scene description schema

This is the JSON-serializable format `loadScreen()` (`src/scene/loadScreen.ts`)
consumes to build a widget tree — see `docs/PLAN.md`, Stage 5. It's
documented here on its own terms, independent of any specific producer
(a hand-authored fixture, a design tool export, or — someday — an adapter
from `html-to-lvgl`'s own internal AST). Anyone producing a `Scene` only
needs this document; they don't need to know anything about this
library's internals or about the converter engine.

The types themselves live in `src/scene/SceneSchema.ts` and are the
normative source of truth (this document explains and gives examples;
that file is what `loadScreen()` actually type-checks against). Every
field maps 1:1 onto some widget's constructor options — see
`docs/PLAN.md`'s Stage 3 notes on `Style`'s own 1:1 mapping to LVGL's
`style_*` attributes, which this schema embeds directly.

## Versioning

Every `Scene` carries a `version` field, currently `1`
(`SCENE_SCHEMA_VERSION`). `loadScreen()` throws if a scene's `version`
doesn't match the version this build of the library supports, naming
both in the error — a producer built against a different version fails
loudly, not with a subtly wrong render. A breaking change to the shapes
below bumps `SCENE_SCHEMA_VERSION`; this document and `SceneSchema.ts`
get a matching update.

## Shape

```ts
interface Scene {
  version: 1;
  width: number;
  height: number;
  style?: StyleSet; // see "Styling" below
  layout?: FlexLayout | GridLayout; // see "Layout" below
  padding?: number; // uniform inset shorthand for style.base.pad*
  children?: SceneNode[];
}
```

A `Scene`'s root is always a container — `width`/`height` size it (and
the canvas it's ultimately rendered into), matching what `createSimulator`
does with its own `screen`.

## Node types

Every entry in `children` is a `SceneNode`: a `type` tag plus that
widget's own fields. All of them also accept these common fields
(mirroring `LvObjectOptions`):

| Field                            | Meaning                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| `x`, `y`                         | Position relative to the parent's content origin (default `0`) |
| `width`, `height`                | Size (required)                                                |
| `style`                          | A `StyleSet` — see "Styling"                                   |
| `flexGrow`                       | Share of a flex parent's free space this child grows into      |
| `gridColumn`, `gridRow`          | 0-based grid placement (omit to auto-place)                    |
| `gridColumnSpan`, `gridRowSpan`  | Grid cell span                                                 |
| `pressed`, `disabled`, `focused` | Initial LVGL-style state flags                                 |

### `container`

```json
{ "type": "container", "width": 200, "height": 100, "layout": { "type": "flex" }, "children": [] }
```

The only node type that may have `children`. `layout` and `padding` work
exactly as on `Scene`'s own root (a `Scene` is really just a container
with a version tag).

### `label`

```json
{ "type": "label", "width": 120, "height": 20, "text": "Hello", "textColor": "#000000" }
```

`text` (required), `textColor`, `fontSize`, `fontFamily`.

### `button`

```json
{ "type": "button", "width": 100, "height": 36, "text": "OK", "backgroundColor": "#2196f3" }
```

`text`, `backgroundColor`, `textColor`.

### `checkbox`

```json
{ "type": "checkbox", "width": 160, "height": 20, "text": "Agree", "checked": false }
```

`text`, `checked`, `indicatorStyle` (LVGL's `LV_PART_INDICATOR` — see
`src/widgets/Checkbox.ts`).

### `switch`

```json
{ "type": "switch", "width": 44, "height": 24, "checked": true }
```

`checked`, `knobStyle` (LVGL's `LV_PART_KNOB`).

### `slider`

```json
{ "type": "slider", "width": 200, "height": 20, "min": 0, "max": 100, "value": 60 }
```

`min`, `max`, `value`, `indicatorStyle` (`LV_PART_INDICATOR`), `knobStyle`
(`LV_PART_KNOB`).

### `image`

```json
{ "type": "image", "width": 64, "height": 64, "src": "https://example.com/icon.png" }
```

`src` only. `ImageWidget`'s `image`/`onLoad` constructor options are a
live bitmap and a callback — neither is JSON-serializable, so they have
no place here; a scene can only ever reference an image by URL.

### `bar`

```json
{ "type": "bar", "width": 160, "height": 12, "min": 0, "max": 100, "value": 60, "mode": "normal" }
```

`min`, `max`, `value`, `startValue`, `mode` (`normal`, `symmetrical`,
`range`), `orientation` (`auto`, `horizontal`, `vertical`), `indicatorStyle`.

### `arc`

```json
{ "type": "arc", "width": 120, "height": 120, "value": 65, "bgStartAngle": 135, "bgEndAngle": 45 }
```

`min`, `max`, `value`, `bgStartAngle`, `bgEndAngle`, `rotation`, `mode`
(`normal`, `symmetrical`, `reverse`), `indicatorStyle`, `knobStyle`.

### `spinner`

```json
{ "type": "spinner", "width": 44, "height": 44, "spinTimeMs": 1000, "arcLengthDegrees": 60 }
```

`spinTimeMs`, `arcLengthDegrees`, `indicatorStyle`. `SpinnerOptions.now` is a
function and is not part of the schema.

### `led`

```json
{ "type": "led", "width": 20, "height": 20, "color": "#4caf50", "brightness": 255 }
```

`color`, `brightness` (0-255).

### `line`

```json
{
  "type": "line",
  "points": [
    { "x": 0, "y": 30 },
    { "x": 40, "y": 0 },
    { "x": 80, "y": 30 }
  ]
}
```

`points`, `yInvert`. The only node whose `width` and `height` are optional:
omitted, the line sizes itself to its points.

### `scale`

```json
{
  "type": "scale",
  "width": 220,
  "height": 44,
  "mode": "horizontalBottom",
  "min": 0,
  "max": 100,
  "sections": [{ "min": 70, "max": 100, "mainStyle": { "lineColor": "#e53935" } }]
}
```

`mode`, `min`, `max`, `totalTickCount`, `majorTickEvery`, `labelShow`,
`labels`, `angleRange`, `rotation`, `majorTickLength`, `minorTickLength`,
`sections` (each `min`, `max`, and partial `mainStyle`/`indicatorStyle`/
`itemsStyle`), `indicatorStyle`, `itemsStyle`.

### `imagebutton`

```json
{
  "type": "imagebutton",
  "width": 120,
  "height": 32,
  "checkable": true,
  "images": { "released": { "left": "/l.png", "mid": "/m.png", "right": "/r.png" } }
}
```

`images` (states `released`, `pressed`, `disabled`, `checkedReleased`,
`checkedPressed`, `checkedDisabled`, each with `left`/`mid`/`right` URLs),
`checkable`, `checked`. Only URLs are representable; `ImageButtonOptions`'
decoded drawables and `onLoad` callback are not.

## Styling

`style` is a `StyleSet` (`src/style/Style.ts`) — a plain, JSON-safe
object, so it's used here exactly as it's used in TypeScript:

```json
{
  "type": "button",
  "width": 120,
  "height": 36,
  "text": "Danger",
  "style": {
    "base": { "bgColor": "#e53935" },
    "states": { "pressed": { "bgColor": "#b71c1c" } }
  }
}
```

## Layout

`layout` on a `container` (or on `Scene`'s own root) is a `FlexLayout` or
`GridLayout` (`src/layout/flex.ts`, `src/layout/grid.ts`), used exactly
as in TypeScript:

```json
{ "type": "flex", "direction": "column", "rowGap": 8, "mainAlign": "center" }
```

```json
{ "type": "grid", "columns": [80, 80], "rows": [40, 40], "columnGap": 8 }
```

## A complete example

```json
{
  "version": 1,
  "width": 240,
  "height": 80,
  "padding": 8,
  "layout": { "type": "flex", "direction": "column", "rowGap": 8 },
  "children": [
    { "type": "label", "width": 200, "height": 16, "text": "Fixture screen" },
    {
      "type": "container",
      "width": 200,
      "height": 32,
      "layout": { "type": "flex", "columnGap": 8 },
      "children": [
        { "type": "button", "width": 80, "height": 32, "text": "OK" },
        { "type": "checkbox", "width": 100, "height": 20, "text": "Agree" }
      ]
    }
  ]
}
```

```ts
import { loadScreen } from '@richardmcquiston01/lvgl-simulator';
import scene from './fixture-scene.json';

const root = loadScreen(scene); // a Container, ready to render or add to a screen
```

## Non-goals (for now)

- **Serialization** (`Container` → `Scene`) isn't provided — this schema
  is currently import-only, matching Stage 5's scope.
- **`html-to-lvgl` AST compatibility** is deliberately not built in. If a
  producer wants to feed that converter's output through `loadScreen()`,
  it needs a small adapter translating that AST into this shape — this
  schema does not adopt the converter's AST as its own contract, keeping
  the two repos decoupled (see `docs/PLAN.md`).
