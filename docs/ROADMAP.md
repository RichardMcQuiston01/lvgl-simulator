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

## Stage 6: Testing & fidelity validation — not started

- [ ] Vitest unit coverage (layout math, style resolution)
- [ ] Playwright canvas snapshot regression tests
- [ ] Fidelity baseline report for the Stage 2 widget set

## Stage 7: Packaging, docs, platform integration — not started

- [ ] README complete (prerequisites/install/usage/examples)
- [ ] npm publish workflow
- [ ] Spike integration into `html2lvgl-platform`'s `apps/web`

## Open items

- Decided in Stage 5: the scene-description schema stays standalone (see
  `docs/SCENE_SCHEMA.md`) rather than adopting `html-to-lvgl`'s internal
  AST directly. If/when needed, that repo gets a thin adapter mapping its
  AST to this schema.
- Whether Stage 6's fidelity harness needs the WASM/real-LVGL path to exist
  first, or can ship its own hand-authored reference screenshots instead.
- No target dates yet.
