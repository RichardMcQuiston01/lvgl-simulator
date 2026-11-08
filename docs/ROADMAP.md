# ROADMAP

Ordered by dependency, not by date. Mirrors the stage numbering in
`docs/PLAN.md`; update the status line as each stage completes.

## Stage 0: Scaffolding — done

- [x] `package.json` / `tsconfig.json` (strict, ES2022)
- [x] ESLint + Prettier config
- [x] Vitest set up
- [x] `playground/` Vite app (empty canvas, resolution configurable via
      `?width=`/`?height=` query params)
- [x] CI workflow: install, lint, typecheck, test, build

## Stage 1: Core rendering engine — done

- [x] Object-tree model (`LvObject`: parent/child, absolute position)
- [x] Display driver abstraction (`createDisplayDriver`: resolution, color
      format, devicePixelRatio-scaled backing store)
- [x] Render loop + repaint strategy (`createRenderLoop`: full repaint every
      animation frame)
- [x] Renders a static single-container screen at a given resolution with
      correct DPI scaling

## Stage 2: Widget library — done

- [x] Container (flex + grid layout, matching LVGL's `flex_flow`/
      `flex_main_place`/`flex_cross_place`/`pad_row`/`pad_column` and
      explicit grid track arrays — verified against `html-to-lvgl`'s
      actual output vocabulary)
- [x] Label, Button, ImageWidget
- [x] Checkbox, Switch, Slider

## Stage 3: Style & theme system — done

- [x] Core style property set (`Style`: bg/border/radius/padding/font/opacity,
      matching LVGL's `style_*` attribute names 1:1 for `src/style/Style.ts`)
- [x] Part/state model: `StyleSet` (base + per-state overrides) resolved via
      `resolveStyle()` against an object's active `LvState`s
      (pressed/checked/disabled/focused); widgets with multiple LVGL "parts"
      (Checkbox's indicator, Switch's/Slider's knob, Slider's indicator)
      expose separate named `StyleSet` fields, all resolved the same way

## Stage 4: Input & interaction — done

- [x] Pointer/touch hit-testing (`hitTest`: deepest/topmost object under a
      point, reverse z-order, disabled objects excluded by the controller)
- [x] LVGL-style event model (`EventEmitter`, `LvEvent`/`LvEventMap`:
      `pressed`/`released`/`clicked`/`valueChanged`) dispatched by
      `attachInteraction`, wired into `createSimulator` by default
- [x] State transitions driven by input: `Checkbox`/`Switch` toggle
      `checked` (+ `valueChanged`) on click; `Slider` implements
      `PointerDraggable` to update `value` (+ `valueChanged`) from drag
      position — verified end to end via a headless-browser click/drag
      against the playground, not just unit assertions

## Stage 5: Scene import adapter — done

- [x] Versioned JSON scene-description schema (`Scene`/`SceneNode` in
      `src/scene/SceneSchema.ts`, `SCENE_SCHEMA_VERSION`), documented
      independently of any producer in `docs/SCENE_SCHEMA.md`
- [x] `loadScreen()` entry point — builds the object tree a `Scene`
      describes and returns its root `Container`; rejects an unsupported
      `version` or an unknown node `type` with a descriptive error.
      Verified end to end via a headless-browser click against a
      hand-written fixture scene rendered in the playground, not just
      unit assertions

## Stage 6: Testing & fidelity validation — done

- [x] Vitest unit coverage (layout math, style resolution) — extended
      `src/layout/flex.test.ts`/`grid.test.ts` with `space_around`/
      `space_evenly` main-axis distribution, per-line cross-axis sizing
      and alignment when wrapped, cross-axis gaps between wrapped lines,
      and row-span track sizing (169 tests total, up from 163)
- [x] Playwright canvas snapshot regression tests — `e2e/widgets.spec.ts`
      screenshots a dedicated fixture (`e2e/fixtures/`) covering every
      Stage 2 widget in multiple states, compared against a committed
      baseline PNG with a small diff-pixel tolerance; wired into CI via
      `npm run test:e2e`, which blocks the build on a diff
- [x] Fidelity baseline report for the Stage 2 widget set
      (`docs/FIDELITY_BASELINE.md`) — documents exactly what the
      snapshot test covers, what it doesn't (no WASM/real-LVGL
      comparison exists yet), and how to update the baseline
      intentionally

## Stage 7: Packaging, docs, platform integration — published

- [x] README complete (prerequisites/install/usage/examples, plus a
      "Releasing" section for maintainers) and a deeper
      [`docs/GETTING_STARTED.md`](./GETTING_STARTED.md) walkthrough
- [x] npm publish workflow — `.github/workflows/release.yml`, triggered by
      a `vX.Y.Z` tag push: lints/typechecks/tests/builds, verifies the tag
      matches `package.json`'s version, then `npm publish --provenance`.
      Filled in the previously-empty `LICENSE` (Apache License 2.0,
      matching what `package.json`/`README.md` already declared) and
      `package.json`'s `repository`/`homepage`/`bugs`/`keywords`/`author`/
      `publishConfig` — required for a clean npm listing.
      [`v0.1.0`](https://www.npmjs.com/package/@richardmcquiston01/lvgl-simulator/v/0.1.0)
      published to npm, followed immediately by
      [`v0.1.1`](https://www.npmjs.com/package/@richardmcquiston01/lvgl-simulator/v/0.1.1)
      fixing a packaging bug `0.1.0` shipped with — see "Open items" below.
- [ ] Spike integration into a consumer web editor's live-preview app —
      per `docs/PLAN.md`, this is explicitly a follow-up in that other
      project, not this one ("separate PR, separate repo").

## Post-v1: Multi-view navigation — done

- [x] `createNavigator()` (`src/navigation/Navigator.ts`): mounts one view
      (any `LvObject`) under a screen at a time and keeps a back-stack, so
      a "Back" button can return to whatever was showing before —
      mirroring LVGL's `lv_screen_load()` plus the navigation history LVGL
      itself doesn't track. `push()`/`pop()`/`current`/`depth`/`canPop`,
      plus an optional `maxDepth` that caps how many `push()`es are
      allowed above the initial view. Needs no changes to
      `createSimulator`, the render loop, or `attachInteraction` — it only
      swaps the screen's single child, and those already traverse
      whatever's currently mounted there. 7 unit tests
      (`src/navigation/Navigator.test.ts`).
- [x] `playground/` rewritten around three views (Home → Settings →
      Advanced, `maxDepth: 2`) demonstrating it end to end — a Settings
      button pushes forward, Back buttons pop back — verified in a
      headless browser, not just unit assertions.
- [x] Documented in `docs/GETTING_STARTED.md`'s new "Navigation" section.
- [ ] Not yet published to npm — still sitting on `main` past `0.1.3`. The
      [live demo](https://lvgl-simulator-demo.vercel.app/) (a separate
      repo, `lvgl-simulator-demo`) depends on the published package, so it
      won't show this until a new version ships and that repo bumps its
      dependency.

## Widget expansion (LVGL 9 parity) — in progress (W0 and W1 done)

Goal: cover every LVGL widget a UI editor can emit. Shipped: `Container`
(`obj`), `Label`, `Button`, `Checkbox`, `Switch`, `Slider`, `ImageWidget`, and
from W1 `Bar`, `Arc`, `Spinner`, `Led`, `Line`, `Scale`, `ImageButton`.
Each widget below ships with: class in `src/widgets/`, unit tests, a `Scene`
node type in `SceneSchema.ts`/`loadScreen()`, a case in the Playwright
fixture, and a `GETTING_STARTED.md` entry. Each phase is released as a minor
version, with a CHANGELOG entry.

### Phase W0: Foundations (blocks later phases) — done

- [x] Scrolling: scrollable containers, clipping, scrollbars, drag + wheel,
      throw momentum, scroll chaining, snap (`src/scroll/`)
- [x] Object flags: `hidden`, `clickable`, `scrollable`, `floating`, `ignore_layout`
- [x] Style gaps: gradients, shadow, outline, `text_align`, `line_*`, `arc_*`
      props, transforms (rotate/scale), `clip_corner`. Note: `line_*`/`arc_*`
      props are style fields only until `Line`/`Arc` ship in W1; transforms
      are not yet honored by slider drag math.
- [x] Animation engine (`lv_anim`: timeline, easing, repeat) + render-loop hook
- [x] Focus groups: keyboard/encoder navigation, `focused` state, `key`/
      `focused`/`defocused` events
- [x] New events: `longPressed`, `longPressedRepeat`, `scroll`, `gesture`,
      `valueChanged` for all value widgets
- [x] Reusable text-input caret/selection and a text-measure cache

### Phase W1: Simple display and value widgets — done

- [x] `Bar` — value/range, start value, symmetrical, vertical
- [x] `Arc` — value/range, rotation, bg/fg angles, knob, drag input
- [x] `Spinner` — arc + spin animation (constant arc length; see GETTING_STARTED)
- [x] `LED` (`Led`) — brightness, color, glow
- [x] `Line` — point array, `y_invert`
- [x] `Scale` — linear/round, ticks, labels, sections (needed by gauges; no needle yet)
- [x] `ImageButton` — per-state images, tiled middle

### Phase W2: Text and input widgets

- [ ] `Textarea` — caret, selection, placeholder, password mode, one-line
- [ ] `Keyboard` — layouts (lower/upper/special/number), target textarea
- [ ] `Spinbox` — digits, step, range, increment/decrement
- [ ] `Span` — multi-style rich text spans, wrapping modes
- [ ] `ArcLabel` — text along an arc (LVGL 9.3+)

### Phase W3: Selection and list widgets (need W0 scrolling)

- [ ] `Dropdown` — popup list, direction, symbol, selected highlight
- [ ] `Roller` — infinite mode, visible rows, snap/momentum
- [ ] `ButtonMatrix` — button map, control flags (checkable, hidden, disabled)
- [ ] `List` — scrollable list of text/buttons
- [ ] `Checkbox` radio grouping (`checked` exclusivity)

### Phase W4: Container and navigation widgets

- [ ] `Tabview` — tab bar position, swipe, content pages
- [ ] `Tileview` — grid of tiles, swipe directions
- [ ] `Msgbox` — title, text, close button, footer buttons, modal backdrop
- [ ] `Win` — header, title, buttons, content
- [ ] `Menu` — sidebar/main pages, back button, separators, sections

### Phase W5: Data widgets

- [ ] `Table` — rows/columns, cell ctrl flags, column widths, merging
- [ ] `Chart` — line, bar, scatter; series, axes, ticks, cursors, zoom
- [ ] `Calendar` — month view, highlighted dates, header (arrow/dropdown)
- [ ] `Canvas` — draw API (rect, line, arc, text, image) over an offscreen buffer

### Phase W6: Media and extras (optional, size-gated)

- [ ] `AnimImg` — frame sequence
- [ ] `GIF` — decode via `ImageDecoder`/`createImageBitmap`
- [ ] `QRCode` / `Barcode` — pure-TS encoders, lazy-loaded
- [ ] `Lottie` — evaluate whether to wrap `lottie-web` as an optional peer dep

### Cross-cutting, every phase

- [ ] Add widgets to `SceneSchema` and bump the schema version when a node
      shape changes (additive changes stay compatible)
- [ ] Extend the Playwright fixture + baseline PNG; keep `FIDELITY_BASELINE.md` current
- [ ] Tree-shakeable exports; check bundle-size budget per phase
- [ ] Playground page showcasing each new widget
- [ ] npm-install smoke test in CI before each release

## Open items

- Lesson from `0.1.0`: verifying "installs correctly from npm" needs an
  actual `npm install` + plain `node` import of the published tarball,
  not just `npm run build` succeeding locally. `0.1.0` built and tested
  fine (Vite/Vitest's `"Bundler"` module resolution tolerates relative
  imports missing a file extension), but failed for any consumer using
  plain Node ESM (`Cannot find module '.../dist/core/RenderLoop'`) —
  Node's native resolver requires the literal `.js` extension, unlike a
  bundler. Fixed in `0.1.1` by adding `.js` to every relative
  import/export in `src/`, verified against a freshly-installed tarball
  before publishing. Worth keeping an npm-install smoke test in mind for
  future releases, not just the existing Vitest/Playwright suites.
- Decided in Stage 5: the scene-description schema stays standalone (see
  `docs/SCENE_SCHEMA.md`) rather than adopting `html-to-lvgl`'s internal
  AST directly. If/when needed, that repo gets a thin adapter mapping its
  AST to this schema.
- Decided in Stage 6: the fidelity baseline compares this simulator's
  rendering against itself (regression detection), not against a
  WASM/real-LVGL reference, since no such path exists in this repo yet —
  see `docs/FIDELITY_BASELINE.md`. A true fidelity-vs-real-LVGL harness
  remains a future addition once that reference path exists.
- No target dates yet.
