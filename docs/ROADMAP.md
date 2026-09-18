# ROADMAP

Ordered by dependency, not by date. Mirrors the stage numbering in
`docs/PLAN.md`; update the status line as each stage completes.

## Stage 0: Scaffolding — not started
- [ ] `package.json` / `tsconfig.json` (strict, ES2022)
- [ ] ESLint + Prettier config
- [ ] Vitest set up
- [ ] `playground/` Vite app (empty canvas)
- [ ] CI workflow: install, lint, typecheck, test, build

## Stage 1: Core rendering engine — not started
- [ ] Object-tree model
- [ ] Display driver abstraction (resolution, color format, DPI)
- [ ] Render loop + repaint strategy
- [ ] Renders a static single-container screen

## Stage 2: Widget library — not started
- [ ] Container (flex + grid layout)
- [ ] Label, Button, Image
- [ ] Checkbox/Switch, Slider

## Stage 3: Style & theme system — not started
- [ ] Core style property set (bg/border/radius/padding/font/opacity)
- [ ] Part/state model (default/pressed/checked/disabled/focused)

## Stage 4: Input & interaction — not started
- [ ] Pointer/touch hit-testing
- [ ] LVGL-style event model (CLICKED, VALUE_CHANGED, PRESSED/RELEASED)

## Stage 5: Scene import adapter — not started
- [ ] Versioned JSON scene-description schema (documented)
- [ ] `loadScreen()` entry point

## Stage 6: Testing & fidelity validation — not started
- [ ] Vitest unit coverage (layout math, style resolution)
- [ ] Playwright canvas snapshot regression tests
- [ ] Fidelity baseline report for the Stage 2 widget set

## Stage 7: Packaging, docs, platform integration — not started
- [ ] README complete (prerequisites/install/usage/examples)
- [ ] npm publish workflow
- [ ] Spike integration into `html2lvgl-platform`'s `apps/web`

## Open items
- Final scene-description schema: standalone vs. adapted from
  `html-to-lvgl`'s internal AST — decide in Stage 5, not before.
- Whether Stage 6's fidelity harness needs the WASM/real-LVGL path to exist
  first, or can ship its own hand-authored reference screenshots instead.
- No target dates yet.
