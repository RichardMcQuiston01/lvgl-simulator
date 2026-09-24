# CHANGELOG

## Unreleased

- Added `createNavigator()` (`src/navigation/Navigator.ts`) for multi-view
  UIs: mounts one view under a screen at a time and keeps a back-stack for
  a "Back" button, with an optional `maxDepth` guard. No changes needed to
  `createSimulator`, the render loop, or `attachInteraction`. Documented in
  `docs/GETTING_STARTED.md`; demonstrated in `playground/` with a
  Home → Settings → Advanced three-view flow.

## 0.1.3 - 2026-09-23

- No code changes. README cleanup: regenerated `donate.svg` (it was
  missing entirely, so the Stripe QR image in Buy Me a Coffee was
  broken), added a Live Demo link under the title, removed the
  Releasing section, and collapsed Getting Started down to a link to
  `docs/GETTING_STARTED.md` (dropping the now-redundant link to it from
  Overview).

## 0.1.2 - 2026-09-18

- No code changes. Removed all references to a private consumer
  repository from `README.md`, `docs/PLAN.md`, and `docs/ROADMAP.md` —
  the README is rendered verbatim on the public npm package page, which
  had leaked the private repo's name and URL there. See
  `docs/PLAN.md`/`docs/ROADMAP.md` for the same architecture rationale
  and integration plan, now described generically.

## 0.1.1 - 2026-09-18

- Fix: the published `0.1.0` package failed to load under plain Node.js
  ESM (`Cannot find module '.../dist/core/RenderLoop'`) — this library's
  relative imports omitted file extensions, which Node's native ESM
  resolver requires (bundlers like Vite/Vitest tolerate it, which is why
  this wasn't caught by the existing test suite). Added `.js` extensions
  to every relative import/export specifier across `src/` — the standard
  pattern for a TypeScript package that ships as native ESM — verified by
  installing the built tarball fresh and importing it with plain
  `node --input-type=module`.

## 0.1.0 - 2026-09-18

- Stage 7 packaging & docs: filled in `LICENSE` (Apache License 2.0, matching
  the license already declared in `package.json`/`README.md`), added
  `repository`/`homepage`/`bugs`/`keywords`/`author`/`publishConfig` to
  `package.json`, and added a tag-triggered release workflow
  (`.github/workflows/release.yml`) that lints/typechecks/tests/builds and
  publishes to npm with provenance on a `vX.Y.Z` tag push. Cut this
  changelog's accumulated `Unreleased` entries (Stages 0–6) as the `0.1.0`
  release.
- Stage 6 testing & fidelity validation: extended the Vitest layout suite
  (`src/layout/flex.test.ts`/`grid.test.ts`) with `space_around`/
  `space_evenly` main-axis distribution, per-line cross-axis sizing and
  alignment once flex wraps, cross-axis gaps between wrapped lines, and
  grid row-span sizing (169 tests total). Added Playwright as a real
  devDependency (`@playwright/test`) with a dedicated fixture
  (`e2e/fixtures/`) rendering every Stage 2 widget in multiple states and
  a snapshot regression test (`e2e/widgets.spec.ts`) comparing it against
  a committed baseline PNG — wired into CI (`npm run test:e2e`), which
  now blocks the build on a visual diff. Documented exactly what that
  baseline covers, and what it doesn't (no WASM/real-LVGL comparison
  exists yet), in `docs/FIDELITY_BASELINE.md`.
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
