# Getting Started

A full walkthrough of the library: installation, the core rendering model,
every widget, styling/state, layout, events, JSON scenes, framework
integration, and troubleshooting. The [README](../README.md) covers the
same ground in miniature — start here if you want the whole picture before
writing code, or jump to a section below as reference while you build.

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [Core concepts](#core-concepts)
- [Widgets](#widgets)
- [Styling & state](#styling--state)
- [Layout](#layout)
- [Events & interaction](#events--interaction)
- [Scenes (JSON UIs)](#scenes-json-uis)
- [Framework integration](#framework-integration)
- [Troubleshooting](#troubleshooting)
- [Where to go next](#where-to-go-next)

## Install

```bash
npm install @richardmcquiston01/lvgl-simulator
```

The package ships as native ESM with zero runtime dependencies. It targets
a browser-like environment — see [Troubleshooting](#troubleshooting) if
you're running it somewhere other than a browser tab (SSR, Node, tests).

## Quick start

`createSimulator()` mounts a `<canvas>` inside a container element, sets up
a display driver and render loop, and wires up pointer input — everything
you need to start adding widgets:

```ts
import { createSimulator, Label, Button } from '@richardmcquiston01/lvgl-simulator';

const simulator = createSimulator(document.getElementById('app')!, {
  width: 320,
  height: 240,
  padding: 16,
  layout: { type: 'flex', direction: 'column', rowGap: 16 },
});

const label = new Label({ width: 200, height: 20, text: 'Clicks: 0' });
const button = new Button({ width: 120, height: 36, text: 'Click me' });

let clicks = 0;
button.addEventListener('clicked', () => {
  label.text = `Clicks: ${++clicks}`;
});

simulator.screen.addChild(button);
simulator.screen.addChild(label);
```

That's it — `createSimulator` already called `renderOnce()` once
internally when it mounted, but since you added children afterward, call
it again (or `start()` the render loop) to actually paint them:

```ts
simulator.renderOnce(); // one-shot repaint — good for static/mostly-static UIs
// or:
simulator.start(); // requestAnimationFrame loop — good if content animates
```

## Core concepts

- **Object tree** (`LvObject`, `src/core/LvObject.ts`): every widget is an
  `LvObject` with a parent/children hierarchy (`addChild`/`removeChild`),
  position (`x`/`y`, relative to its parent), size (`width`/`height`), and
  a `StyleSet`. This mirrors LVGL's `lv_obj_t` tree.
- **Display driver** (`createDisplayDriver`, `src/display/DisplayDriver.ts`):
  creates and sizes the actual `<canvas>` element, scaling its backing
  store by `devicePixelRatio` so drawing stays sharp on high-DPI screens.
  You write all coordinates in logical (CSS) pixels regardless of DPI —
  `createSimulator` sets this up for you via its `devicePixelRatio` option
  (defaults to `window.devicePixelRatio`).
- **Render loop** (`createRenderLoop`, `src/core/RenderLoop.ts`): a
  `requestAnimationFrame` loop that repaints the whole tree every frame
  while running (`start()`/`stop()`). `renderOnce()` does a single repaint
  without starting it — cheaper for UIs that only change in response to
  events (clicks, drags), which is what the examples in this guide use.
- **`Simulator` handle**: `createSimulator()` returns
  `{ canvas, displayDriver, screen, start, stop, renderOnce, destroy }`.
  `screen` is the root `Container` (see [Layout](#layout)) — add your
  widgets to it, directly or nested. `destroy()` stops the render loop and
  detaches pointer listeners; call it when unmounting (e.g. a framework
  component's cleanup function).

## Widgets

Every widget constructor takes the common `LvObjectOptions` fields plus its
own — pass a plain object, no builder pattern:

| Field                            | Meaning                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| `x`, `y`                         | Position relative to the parent's content origin (default `0`) |
| `width`, `height`                | Size (required)                                                |
| `style`                          | A `StyleSet` — see [Styling & state](#styling--state)          |
| `flexGrow`                       | Share of a flex parent's free space this child grows into      |
| `gridColumn`, `gridRow`          | 0-based grid placement (omit to auto-place)                    |
| `gridColumnSpan`, `gridRowSpan`  | Grid cell span                                                 |
| `pressed`, `disabled`, `focused` | Initial LVGL-style state flags                                 |

### `Container`

A plain box, optionally with a [flex or grid layout](#layout) applied to
its children. `createSimulator`'s `screen` is a `Container`, so anything
you can do with a manually-created one, you can do with `screen` too.

```ts
import { Container, Label } from '@richardmcquiston01/lvgl-simulator';

const box = new Container({
  width: 200,
  height: 80,
  padding: 8, // sugar for style.base.pad{Top,Right,Bottom,Left}
  layout: { type: 'flex', direction: 'column', rowGap: 4 },
  style: { base: { bgColor: '#f5f5f5', borderColor: '#ccc', borderWidth: 1, radius: 6 } },
});
box.addChild(new Label({ width: 180, height: 20, text: 'Inside a box' }));
```

### `Label`

A single line of text (`lv_label`). `text` is required and mutable —
assign `label.text = '...'` to update it, then repaint.

```ts
new Label({ width: 200, height: 20, text: 'Hello', textColor: '#333333', fontSize: 16 });
```

### `Button`

A rounded, filled push button (`lv_button`). Darkens automatically when
`pressed` (a caller-supplied `style.states.pressed` replaces that default
outright, since state overrides are shallow, not deep-merged).

```ts
new Button({ width: 120, height: 36, text: 'OK', backgroundColor: '#2196f3' });
```

### `Checkbox`

A square indicator with an optional trailing label (`lv_checkbox`). Toggles
its own `checked` (and fires `valueChanged`) when clicked — you don't need
to wire that up yourself. The indicator box is LVGL's `LV_PART_INDICATOR`,
styled separately via `indicatorStyle`; the object's own `style` covers the
label text.

```ts
const agree = new Checkbox({ width: 160, height: 20, text: 'I agree', checked: false });
agree.addEventListener('valueChanged', () => console.log(agree.checked));
```

### `Switch`

A pill-shaped toggle (`lv_switch`), same click-to-toggle/`valueChanged`
behavior as `Checkbox`. The sliding knob is `LV_PART_KNOB`, styled via
`knobStyle`.

```ts
new Switch({ width: 44, height: 24, checked: true });
```

### `Slider`

A draggable track (`lv_slider`) with a filled indicator and a knob.
Dragging updates `value` and fires `valueChanged` — the interaction
controller (see [Events & interaction](#events--interaction)) forwards
pointer position to it automatically. The filled portion is
`LV_PART_INDICATOR` (`indicatorStyle`), the knob is `LV_PART_KNOB`
(`knobStyle`).

```ts
const volume = new Slider({ width: 200, height: 20, min: 0, max: 100, value: 60 });
volume.addEventListener('valueChanged', () => console.log(Math.round(volume.value)));
```

### `ImageWidget`

Draws a bitmap (`lv_image`). Loading a `src` URL is asynchronous — pass
`onLoad` to repaint once it's ready. `image` (a pre-decoded
`CanvasImageSource`) takes precedence over `src` if both are given, and is
useful in tests or when you already have a decoded bitmap. Renders a
neutral placeholder box until a source is available.

```ts
const icon = new ImageWidget({
  width: 32,
  height: 32,
  src: '/icon.png',
  onLoad: () => simulator.renderOnce(),
});
```

## Styling & state

Every widget's paint properties are a **`StyleSet`** (`src/style/Style.ts`)
— a `base` `Style` plus optional per-state overrides, mirroring LVGL's
part/state model:

```ts
interface Style {
  bgColor?: string; // '#rrggbb'
  bgOpa?: number; // 0-255, LVGL's LV_OPA_* scale (not CSS's 0-1)
  borderWidth?: number;
  borderColor?: string;
  radius?: number;
  padTop?: number;
  padRight?: number;
  padBottom?: number;
  padLeft?: number;
  textColor?: string;
  textFontFamily?: string;
  textFontSize?: number;
  opa?: number; // overall object opacity, 0-255
}

interface StyleSet {
  base: Style;
  states?: Partial<Record<'checked' | 'focused' | 'pressed' | 'disabled', Partial<Style>>>;
}
```

States are resolved against whichever of `checked`/`focused`/`pressed`/
`disabled` are currently active on the object (`pressed`/`disabled`/
`focused` are plain fields on every `LvObject`; `checked` is added by
`Checkbox`/`Switch`). If more than one is active at once, a fixed priority
order applies (`checked` < `focused` < `pressed` < `disabled`, lowest to
highest) — e.g. a disabled _and_ pressed object resolves as disabled, since
a disabled control isn't really pressable:

```ts
new Button({
  width: 160,
  height: 36,
  text: 'Custom pressed color',
  style: { base: {}, states: { pressed: { bgColor: '#8e24aa' } } },
});
```

Widgets with more than one LVGL "part" expose extra named `StyleSet`
fields, resolved the same way against the same active states:
`Checkbox.indicatorStyle`, `Switch.knobStyle`, `Slider.indicatorStyle` /
`Slider.knobStyle`.

Many widgets also accept flat convenience options (`Label.textColor`,
`Button.backgroundColor`, etc.) as sugar over `style.base` — use whichever
reads better for your case; an explicit `style.base` value always wins over
an unset convenience option.

## Layout

`Container` (including `screen`) can arrange its children with a `layout`:

**Flex** (`{ type: 'flex', ... }`), mirroring LVGL's flex container:

| Field        | Values                                                                                          | Default    |
| ------------ | ----------------------------------------------------------------------------------------------- | ---------- |
| `direction`  | `'row'` \| `'column'`                                                                           | `'row'`    |
| `wrap`       | `'nowrap'` \| `'wrap'`                                                                          | `'nowrap'` |
| `mainAlign`  | `'start'` \| `'center'` \| `'end'` \| `'space_between'` \| `'space_around'` \| `'space_evenly'` | `'start'`  |
| `crossAlign` | `'start'` \| `'center'` \| `'end'`                                                              | `'start'`  |
| `rowGap`     | Gap between rows (the cross axis when `direction: 'row'`, the main axis when `'column'`)        | `0`        |
| `columnGap`  | Gap between columns (the main axis when `'row'`, the cross axis when `'column'`)                | `0`        |

Children can also set `flexGrow` (share of free main-axis space to grow
into, consumed before alignment runs — same semantics as CSS flex-grow).

**Grid** (`{ type: 'grid', ... }`):

```ts
new Container({
  width: 168,
  height: 88,
  layout: { type: 'grid', columns: [80, 80], rows: [40, 40], columnGap: 8, rowGap: 8 },
});
```

`columns`/`rows` are explicit pixel track sizes (required — this is a live
layout engine, not one that measures children). Children auto-place in
row-major order unless they set `gridColumn`/`gridRow` (0-based) explicitly;
`gridColumnSpan`/`gridRowSpan` span multiple tracks, including the gaps
between them.

## Events & interaction

`createSimulator` wires pointer/touch input onto its canvas automatically
(`attachInteraction`, `src/interaction/InteractionController.ts`) —
there's no separate setup step. It hit-tests the pointer against the
object tree (deepest/topmost object under the cursor, skipping `disabled`
objects) and dispatches LVGL-style events through
`addEventListener`/`dispatchEvent`, mirroring `lv_obj_add_event_cb`:

| Event          | Fires when                                                                     |
| -------------- | ------------------------------------------------------------------------------ |
| `pressed`      | A pointer goes down on the object                                              |
| `released`     | The pointer that pressed it is released or cancelled                           |
| `clicked`      | A release lands back on the same object it was pressed on                      |
| `valueChanged` | A widget's own value changes (`Checkbox`/`Switch` toggling, `Slider` dragging) |

```ts
button.addEventListener('clicked', (event) => {
  console.log(event.target === button); // true — every event carries { target }
});
button.removeEventListener('clicked', handler); // also available
```

To make a custom widget draggable like `Slider`, implement
`PointerDraggable` (`src/interaction/PointerDraggable.ts`) —
`handlePointerPosition(localX, localY)`, called on press and on every move
while your widget is the active (pointer-captured) target, with the
position local to your widget's own top-left corner. The interaction
controller duck-types for this interface rather than special-casing
specific classes, so any widget can opt in.

## Scenes (JSON UIs)

A whole subtree can come from plain JSON via `loadScreen()` instead of
manual `new Widget()`/`addChild()` calls — see
[`docs/SCENE_SCHEMA.md`](./SCENE_SCHEMA.md) for the complete, versioned
schema (every field maps 1:1 onto a widget's constructor options):

```ts
import { loadScreen, type Scene } from '@richardmcquiston01/lvgl-simulator';

const scene: Scene = {
  version: 1,
  width: 200,
  height: 40,
  layout: { type: 'flex', columnGap: 8 },
  children: [{ type: 'button', width: 90, height: 32, text: 'OK' }],
};

simulator.screen.addChild(loadScreen(scene));
```

`loadScreen()` throws if the scene's `version` doesn't match the schema
version this build supports (naming both), so a producer built against a
stale/newer schema fails loudly rather than misrendering silently. Scene
import is currently one-way — there's no `Container` → `Scene` serializer.

## Framework integration

The library is framework-agnostic — `createSimulator` just needs a DOM
element to mount into. A React example, since it's the most common case
needing explicit mount/unmount handling:

```tsx
import { useEffect, useRef } from 'react';
import { createSimulator, Button, Label } from '@richardmcquiston01/lvgl-simulator';

function LvglPreview() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const simulator = createSimulator(containerRef.current, { width: 320, height: 240 });
    const label = new Label({ width: 200, height: 20, text: 'Ready' });
    simulator.screen.addChild(label);
    simulator.renderOnce();

    return () => simulator.destroy(); // stop the render loop, detach pointer listeners
  }, []);

  return <div ref={containerRef} />;
}
```

For Vue/Svelte/plain HTML, the pattern is the same: create the simulator
once the target element exists (`onMounted`, `mount()`, or just a
`<script type="module">` after the element in markup), and call
`destroy()` when it's removed.

## Troubleshooting

- **"Cannot find module '.../dist/...'" when importing the package.**
  This was a real bug in the `0.1.0` release (fixed in `0.1.1` — see
  `CHANGELOG.md`). Make sure you're on `0.1.1` or later:
  `npm view @richardmcquiston01/lvgl-simulator version`.
- **"Failed to acquire a 2D rendering context" / running outside a
  browser.** This library needs a real `<canvas>` 2D context, which plain
  Node.js and jsdom don't provide out of the box (jsdom throws "Not
  implemented: HTMLCanvasElement's getContext()" without the separate
  `canvas` npm package installed). In a server-rendered framework
  (Next.js, Nuxt, SvelteKit, etc.), only call `createSimulator` on the
  client — inside `useEffect`/`onMounted`/a browser-only guard, never at
  module scope or during SSR.
- **Canvas looks blurry on a high-DPI display.** `createSimulator`'s
  `devicePixelRatio` option defaults to `window.devicePixelRatio`, which
  should already handle this — only pass it explicitly if you need a
  different scale (e.g. rendering at a fixed resolution for a screenshot).
- **A style override isn't taking effect.** State overrides in
  `style.states` are shallow per-state replacements, not deep merges — if
  you override `states.pressed`, you replace the widget's _entire_ default
  pressed style for that state, not just the properties you listed.
- **Widgets aren't showing up after `addChild`.** Adding children doesn't
  repaint by itself — call `simulator.renderOnce()` (or `start()` the
  render loop) after changing the tree, same as after any state change
  made outside of `clicked`/`valueChanged` handlers (which already
  don't auto-repaint either — see the Quick Start example).

## Where to go next

- [`docs/SCENE_SCHEMA.md`](./SCENE_SCHEMA.md) — full JSON scene format
- [`docs/FIDELITY_BASELINE.md`](./FIDELITY_BASELINE.md) — what the visual
  regression suite covers for the current widget set
- [`docs/PLAN.md`](./PLAN.md) — architecture rationale and the full
  multi-stage development plan
- [`docs/ROADMAP.md`](./ROADMAP.md) — current status and open items
- `playground/` — a live, interactive gallery of everything in this guide
  (`npm run dev` after cloning the repo)
