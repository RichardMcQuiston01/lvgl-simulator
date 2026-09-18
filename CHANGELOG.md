# CHANGELOG

## Unreleased

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
