# CHANGELOG

## Unreleased

- Stage 5 scene import adapter: a versioned JSON scene-description schema
  (`Scene`/`SceneNode` in `src/scene/SceneSchema.ts`, `SCENE_SCHEMA_VERSION`),
  documented independently of any producer in `docs/SCENE_SCHEMA.md`, and
  `loadScreen()` (`src/scene/loadScreen.ts`), which builds the object tree
  a `Scene` describes and returns its root `Container` — rejecting an
  unsupported `version` or unknown node `type` with a descriptive error.
  Every node field maps 1:1 onto some widget's constructor options; a
  node's `style`/`layout` fields are used exactly as their TypeScript
  counterparts (`StyleSet`, `FlexLayout`/`GridLayout`), since both are
  already plain, JSON-safe data. Verified end to end with a real
  headless-browser click against a hand-written fixture scene rendered in
  the playground, not just unit assertions.
- Stage 4 input & interaction: `hitTest()` (`src/interaction/hitTest.ts`,
  deepest/topmost object under a point), `attachInteraction()`
  (`src/interaction/InteractionController.ts`, pointer/touch → hit-test →
  pressed/released/clicked, plus continuous drag forwarding to any object
  implementing `PointerDraggable`), and an `LvEvent`/`LvEventMap`
  (`pressed`/`released`/`clicked`/`valueChanged`) dispatched through a new
  `EventEmitter`. `LvObject` gained `addEventListener`/`removeEventListener`/
  `dispatchEvent`. `createSimulator()` now wires `attachInteraction` onto
  its canvas by default and exposes `destroy()` to detach it.
  `Checkbox`/`Switch` toggle `checked` (dispatching `valueChanged`) on
  `clicked`; `Slider` implements `PointerDraggable` to set `value` from
  drag position. Verified end to end with a real headless-browser
  click/drag against the playground (button click counter, switch
  toggle, slider drag), not just unit assertions.
- Stage 3 style & theme system: `Style`/`StyleSet`/`LvState`/`resolveStyle`
  (`src/style/Style.ts`) — a flat, LVGL-`style_*`-mappable property bag
  plus per-state overrides (pressed/checked/disabled/focused), resolved
  with a documented fixed priority order. `LvObject` gained `style`,
  `pressed`/`disabled`/`focused`, `getActiveStates()`, and a `resolvedStyle`
  getter; `render()` now applies a resolved `opa` via `globalAlpha`.
  Widgets with multiple LVGL "parts" (Checkbox's indicator, Switch's/
  Slider's knob, Slider's indicator) expose separate `StyleSet` fields.
  `Button` now darkens when `pressed`, matching LVGL's default theme, and
  every widget's per-state styling is caller-overridable via `style.states`.
  `Container`'s `padding` option is now sugar over `style.base`'s
  `pad*` fields (still supports per-side padding directly).
- Stage 2 widget library: `Container` (flex + grid layout engines matching
  LVGL's flex/grid vocabulary), `Label`, `Button`, `Checkbox`, `Switch`,
  `Slider`, `ImageWidget`, drawn against an LVGL-default-theme
  approximation (`defaultTheme`). `createSimulator()`'s `screen` is now a
  `Container`, so widgets can be added directly with an optional
  flex/grid layout.
- Stage 1 core rendering engine: `LvObject` object tree, `createDisplayDriver`
  (devicePixelRatio-scaled canvas backing store), `createRenderLoop`
  (full-repaint `requestAnimationFrame` loop). `createSimulator()` now
  renders a real static screen instead of Stage 0's placeholder fill.
- Stage 0 scaffolding: `package.json`/`tsconfig`, ESLint + Prettier, Vitest,
  a Vite-based `playground/` app, and CI (lint/format/typecheck/test/build).
  See `docs/PLAN.md` and `docs/ROADMAP.md`.
