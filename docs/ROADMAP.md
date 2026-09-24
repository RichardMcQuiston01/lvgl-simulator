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
