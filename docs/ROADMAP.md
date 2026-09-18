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

## Stage 7: Packaging, docs, platform integration — publish-ready

- [x] README complete (prerequisites/install/usage/examples, plus a
      "Releasing" section for maintainers)
- [x] npm publish workflow — `.github/workflows/release.yml`, triggered by
      a `vX.Y.Z` tag push: lints/typechecks/tests/builds, verifies the tag
      matches `package.json`'s version, then `npm publish --provenance`.
      Filled in the previously-empty `LICENSE` (Apache License 2.0,
      matching what `package.json`/`README.md` already declared) and
      `package.json`'s `repository`/`homepage`/`bugs`/`keywords`/`author`/
      `publishConfig` — required for a clean npm listing. Cut the
      accumulated `CHANGELOG.md` entries as `0.1.0`.
      **Not done in this repo:** actually pushing the first release tag
      and provisioning the `NPM_TOKEN` secret — those are one-way,
      account-owning actions for a human to trigger, not something to
      do unprompted.
- [ ] Spike integration into `html2lvgl-platform`'s `apps/web` — per
      `docs/PLAN.md`, this is explicitly a follow-up in that other repo,
      not this one ("separate PR, separate repo"), and only possible once
      `0.1.0` is actually published to npm.

## Open items

- Stage 7: the repository is publish-ready, but `0.1.0` has not actually
  been published yet — that needs an `NPM_TOKEN` secret with publish
  rights on the `@richardmcquiston01` npm scope, and the first
  `git tag v0.1.0 && git push origin v0.1.0`. See the README's
  "Releasing" section.
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
