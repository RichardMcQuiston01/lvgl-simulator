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
- [Scrolling](#scrolling)
- [Focus & keyboard input](#focus--keyboard-input)
- [Animations](#animations)
- [Scenes (JSON UIs)](#scenes-json-uis)
- [Navigation (multi-view UIs)](#navigation-multi-view-uis)
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

### `Bar`

A filled track (`lv_bar`) for progress and levels. `mode` is `'normal'`
(fills from `min`), `'symmetrical'` (from zero out to `value`), or `'range'`
(between `startValue` and `value`). It runs vertically, filling upward, when
it is taller than wide, or force it with `orientation`. The filled part is
`indicatorStyle`. Not interactive; update it with `setValue()` (fires
`valueChanged`).

```ts
const level = new Bar({
  width: 160,
  height: 12,
  min: -100,
  max: 100,
  value: 40,
  mode: 'symmetrical',
});
level.setValue(65);
```

### `Arc`

A circular dial (`lv_arc`) with a knob. The defaults draw a 270° arc opening
at the bottom (`bgStartAngle: 135`, `bgEndAngle: 45`, angles clockwise from
3 o'clock); `rotation` turns the whole dial. Dragging sets `value` and fires
`valueChanged`; a pointer in the gap pins it to the nearer end. Thickness,
color and caps come from the style's `arcWidth`, `arcColor`, `arcOpa` and
`arcRounded`: the object's own `style` is the background arc, `indicatorStyle`
the filled arc, `knobStyle` the knob. Pass `clickable: false` for a read-only
gauge.

```ts
const dial = new Arc({ width: 120, height: 120, value: 65, mode: 'normal' });
```

### `Spinner`

A ring with a spinning arc (`lv_spinner`) for "loading". Its angle comes from
the clock at paint time, so it only moves while the render loop runs
(`simulator.start()`); `renderOnce()` draws one frame. `spinTimeMs` is one
revolution (default 1000) and `arcLengthDegrees` the arc (default 60). Not
clickable. The arc length is constant, a simplification of LVGL's pulsing arc.

### `Led`

A round indicator light (`lv_led`). `color` is the lit color; `brightness`
runs 0–255 and anything under 80 draws as dim as "off". Lit LEDs glow.
`on()`, `off()`, `toggle()` and `setBrightness()` change it (repaint
afterwards). Not clickable.

```ts
const power = new Led({ width: 20, height: 20, color: '#4caf50' });
power.off();
```

### `Line`

A polyline (`lv_line`) through `points` (relative to the object's top-left).
Omit `width`/`height` and the object sizes itself to the points, re-sizing on
`setPoints()`. `yInvert` flips the points within the height. Stroke comes
from the style's `lineWidth`, `lineColor`, `lineOpa` and `lineRounded`.

```ts
new Line({
  points: [
    { x: 0, y: 30 },
    { x: 40, y: 0 },
    { x: 80, y: 30 },
  ],
  style: { base: { lineWidth: 3, lineColor: '#e53935' } },
});
```

### `Scale`

Tick marks and labels along a line (`lv_scale`), linear or round. `mode` is
`horizontalTop`, `horizontalBottom`, `verticalLeft`, `verticalRight`,
`roundInner` or `roundOuter` (vertical scales run min at the bottom to max at
the top). `totalTickCount` ticks are spread over `min`–`max` with a major tick
every `majorTickEvery`; major ticks are labelled with their value or from
`labels`. Round scales use `angleRange` (270) and `rotation` (135).
`sections` recolor a value range, e.g. a red zone. The object's `style` is the
line and label text, `indicatorStyle` the major ticks, `itemsStyle` the minor
ticks. It draws the scale only; draw a needle with a `Line`. Not clickable.

```ts
new Scale({
  width: 220,
  height: 44,
  sections: [{ min: 70, max: 100, mainStyle: { lineColor: '#e53935' } }],
});
```

### `ImageButton`

A button drawn from per-state images (`lv_imagebutton`) instead of a style.
`images` maps `released`, `pressed`, `disabled` and the `checked*` states to a
`left` cap, a `right` cap and a `mid` image tiled between them, each a URL or
a decoded `CanvasImageSource`. A state with no image shows the `released`
one. `checkable` makes a click toggle `checked` (firing `valueChanged`). URL
sources load asynchronously, so pass `onLoad` to repaint.

```ts
new ImageButton({
  width: 120,
  height: 32,
  images: { released: { left: '/l.png', mid: '/m.png', right: '/r.png' } },
  onLoad: () => simulator.renderOnce(),
});
```

### `Textarea`

An editable text box (`lv_textarea`) with a caret, selection, word wrapping or a
single scrolling line (`oneLine`), a `placeholder`, and `passwordMode`
(`passwordChar` masks each character). It receives keys from a focus group, so
add it to `simulator.focusGroup` and click it (or Tab to it) before typing; it
also handles Shift+arrows and Ctrl/Cmd+A for selection, Up/Down in multi-line
mode, and pointer press and drag to place the caret and select. The caret only
shows while it has focus. `maxLength` and `acceptedChars` limit what can be
entered.

Events: `valueChanged` when the text changes, `ready` on Enter in one-line
mode, `cancel` on Escape. `setText()`, `insertText()`, `deleteBackward()` and
`moveCaret()` edit it from code. `placeholderStyle`, `selectionStyle` and
`cursorStyle` are the LVGL parts of the same names. Input arrives key by key,
so IME composition and paste are not handled.

```ts
const name = new Textarea({ width: 220, height: 36, oneLine: true, placeholder: 'Your name' });
simulator.focusGroup.add(name);
name.addEventListener('ready', () => console.log(name.text));
```

### `Keyboard`

An on-screen keyboard (`lv_keyboard`) with `textLower`, `textUpper`, `special`
and `number` layouts (the `ABC`, `abc` and `1#` keys switch between them). Set
`target` to a `Textarea` and keys type into it; backspace, the arrows and Enter
act on it too. The check key fires `ready` and the hide key fires `cancel` on
the keyboard, and every key fires `valueChanged` with the key's label in
`lastKey`. `gap` and `padding` space the keys; `itemsStyle` (with
`states.pressed`) and `controlKeyStyle` restyle them. A keyboard loaded from a
JSON scene has no target, so set `keyboard.target` in code afterwards.

```ts
const keyboard = new Keyboard({ width: 340, height: 160, target: name });
keyboard.addEventListener('ready', () => (keyboard.hidden = true));
```

### `Spinbox`

A number you step with the keys (`lv_spinbox`). The value is an **integer** with
a fixed count of `decimalDigits`, so there is no floating-point error: 12345
with two decimals shows as `123.45` (`decimalValue` gives the real number).
One digit is selected: Up/Down change the value by that digit's place (`step`),
Left/Right move the selection, and pressing a digit selects it. `min`, `max`
(limited to what `digitCount` digits can show) and `rollover` bound it. A sign
shows when the range includes negatives. `valueChanged` fires on a change and
`ready` on Enter.

```ts
const price = new Spinbox({ width: 120, height: 36, min: 0, value: 12345, decimalDigits: 2 });
```

### `Span`

Rich text (`lv_spangroup`): `spans` are runs that each override the group's text
color, size, family and `textDecor` (`'underline'` or `'strikethrough'`). Runs
wrap together and share a baseline, so mixed sizes line up. `mode` is `'break'`
(fixed width, height grows to the wrapped text, the default), `'fixed'` (keeps
its size and clips) or `'expand'` (one line, width grows). `maxLines` with
`overflow: 'ellipsis'` ends the last line in an ellipsis, `indent` indents the
first line, `lineSpacing` adds to every line, and the group's `textAlign`
aligns each line. A line can break between two spans even with no whitespace
between them. In `'break'` and `'expand'` mode the object resizes itself when
painted, so siblings in a flex or grid parent pick up the new size on the next
repaint.

```ts
new Span({
  width: 220,
  height: 60,
  spans: [
    { text: 'Rich ', style: { textColor: '#e53935' } },
    { text: 'text', style: { textFontSize: 22, textDecor: 'underline' } },
  ],
});
```

### `ArcLabel`

Text set along an arc (`lv_arclabel`, LVGL 9.3+). Each glyph is rotated to
stand on a circle of `radius`, running `direction` (`'clockwise'` or
`'counterClockwise'`) from `startAngle` for up to `sweepAngle` degrees, placed
by `align` within that sweep. `verticalAlign` puts the glyphs outside or inside
the circle, and `centerOffsetX`/`centerOffsetY` shift it. Text longer than the
sweep is cut off at its end. Glyph widths are measured one character at a time,
so kerning between glyphs is not applied.

```ts
new ArcLabel({ width: 150, height: 150, text: 'CURVED TEXT', radius: 55 });
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

| Event                                  | Fires when                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `pressed`                              | A pointer goes down on the object                                                                      |
| `released`                             | The pointer that pressed it is released or cancelled                                                   |
| `clicked`                              | A release lands back on the same object it was pressed on                                              |
| `valueChanged`                         | A widget's own value changes (`Checkbox`/`Switch` toggling, `Slider` dragging)                         |
| `pressLost`                            | The press turned into a scroll, so no `released`/`clicked` will follow                                 |
| `longPressed`                          | Held for 400 ms without moving more than 10 px                                                         |
| `longPressedRepeat`                    | Every 100 ms after `longPressed` while still held                                                      |
| `gesture`                              | Released after a 50 px+ swipe (`event.direction`: `left`/`right`/`top`/`bottom`), instead of `clicked` |
| `scrollBegin` / `scroll` / `scrollEnd` | A scroll gesture or throw starts, moves, and settles                                                   |
| `key`                                  | A key reaches the focused object (`event.key`)                                                         |
| `focused` / `defocused`                | A `FocusGroup` moves focus onto / off the object                                                       |

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

## Scrolling

Any object whose children overflow it scrolls (`scrollable`, default
`true`): drag, mouse wheel, or the API. Content is clipped to the object, a
scrollbar shows per `scrollbarMode` (`'auto'` default, `'on'`, `'active'`,
`'off'`), a fast release throws the content, and a child at its scroll
limit passes the drag to its scrolling parent (like LVGL's scroll chain).

```ts
const list = new Container({
  width: 200,
  height: 120,
  layout: { type: 'flex', direction: 'column' },
  scrollDirection: 'vertical', // 'all' (default) | 'horizontal' | 'none'
  scrollSnapY: 'start', // settle on the nearest child edge: 'start' | 'center' | 'end'
});
list.scrollTo(0, 80); // clamped to list.getScrollRange(); dispatches `scroll`
list.scrollBy(0, 20);
list.scrollToView(someChild);
```

Padding counts toward the scrollable area only when the container applies it
through a flex/grid `layout`; manually positioned children are measured
against the border box. Per-object flags: `hidden`, `clickable`, `floating`,
`ignoreLayout` (the last two keep a child out of flex/grid layout).

## Focus & keyboard input

`simulator.focusGroup` is a `FocusGroup` (`lv_group_t`). Add the objects
keys should reach; the first one added takes focus, pressing an object in
the group focuses it, and a focused object draws the theme's focus outline
(set `outlineWidth` yourself to override, or `0` to hide it) and applies
`style.states.focused`.

```ts
simulator.focusGroup.add(okButton);
simulator.focusGroup.add(cancelButton);
okButton.addEventListener('key', (event) => console.log(event.key));
```

`'keypad'` mode (default): Tab / Shift+Tab move focus, Enter clicks the
focused object, everything else arrives as a `key` event. `'encoder'` mode:
arrows move focus until Enter puts an `editable` object into edit mode
(arrows then arrive as `key` events until Enter/Escape). Click the canvas
(it is focusable) before typing.

## Animations

`simulator.animations` is an `lv_anim`-style engine that repaints the canvas
while anything runs — no `start()` needed.

```ts
simulator.animations.start({
  from: 0,
  to: 100,
  durationMs: 400,
  easing: 'easeOut', // linear | easeIn | easeOut | easeInOut | overshoot | bounce | step
  repeatCount: Infinity,
  playbackDurationMs: 400, // ping-pong back to `from`
  onUpdate: (value) => {
    slider.value = value;
  },
});
```

`startTimeline(engine, [{ atMs, animation }, ...])` sequences several, and
`createAnimationEngine({ now, scheduler: null })` gives a manually ticked
engine for tests.

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

## Navigation (multi-view UIs)

`createSimulator()` gives you one `screen`, but a real UI is usually more
than one page — a home screen with a button that opens a Settings screen,
say. `createNavigator()` (`src/navigation/Navigator.ts`) manages that: it
mounts one "view" (any `LvObject`, typically a `Container` built the same
way you'd build `screen`'s contents) under a screen at a time, and keeps a
back-stack so a "Back" button can return to whatever was showing before —
mirroring LVGL's `lv_screen_load()` plus the navigation history LVGL itself
doesn't track:

```ts
import {
  Container,
  createNavigator,
  createSimulator,
  Button,
} from '@richardmcquiston01/lvgl-simulator';

const simulator = createSimulator(document.getElementById('app')!, { width: 320, height: 240 });

const home = new Container({ width: 320, height: 240, padding: 16 });
const settings = new Container({ width: 320, height: 240, padding: 16 });

const openSettings = new Button({ width: 120, height: 32, text: 'Settings' });
const back = new Button({ width: 120, height: 32, text: 'Back' });
home.addChild(openSettings);
settings.addChild(back);

const navigator = createNavigator(simulator.screen, home, simulator.renderOnce);
openSettings.addEventListener('clicked', () => navigator.push(settings));
back.addEventListener('clicked', () => navigator.pop());
```

`createNavigator(screen, initialView, render, options?)` takes over
`screen`'s children — it mounts `initialView` immediately, clearing
anything already there. `push(view)` swaps in a new view and remembers the
current one; `pop()` (a no-op if there's nothing to return to) restores it.
`render` is called after every swap, so pass `simulator.renderOnce` (or any
function that repaints) to keep the canvas in sync automatically — you
don't need to call it yourself after navigating. `current`, `depth`
(`0` at the initial view), and `canPop` reflect the navigator's state at
any point. An optional `maxDepth` caps how many `push()`es are allowed
above the initial view — `push()` throws once reached, which is useful for
bounding how deep an embedded-style UI's navigation can go.

Since `push`/`pop` only ever swap `screen`'s single child, this needs no
changes to `createSimulator`, the render loop, or pointer interaction —
hit-testing and rendering already walk whatever's currently mounted there.

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
