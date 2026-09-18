# PLAN

## What this is

A standalone TypeScript library that renders LVGL-style UIs to an HTML5
`<canvas>` by re-implementing LVGL's widget/layout/style behavior in pure
JS/TS — it does not compile or embed LVGL's C engine. Consumers hand it a
scene description (an object tree with styles, layout, and state) and it
draws and drives interaction for that scene in the browser.

## Why a pure-TS simulator (vs. the WASM approach)

A different, complementary approach exists: compiling LVGL's actual C
source to WebAssembly via Emscripten for pixel-perfect fidelity. Both
approaches are expected to coexist long-term; this repo intentionally
takes the other tradeoff:

|                 | This simulator (Canvas + TS)                       | WASM (Emscripten + real LVGL C)                  |
| --------------- | -------------------------------------------------- | ------------------------------------------------ |
| Fidelity        | Approximate — re-implemented layout/paint rules    | Pixel-perfect — native engine                    |
| Bundle size     | Small (no compiled binary)                         | +1–2 MB `.wasm`                                  |
| Toolchain       | `tsc`/`vite` only                                  | Emscripten build pipeline                        |
| Iteration speed | Fast — plain TS, hot reload                        | Slower — native rebuild step                     |
| Best for        | Live editor preview while a user is composing a UI | Final fidelity check / hardware-accurate preview |

Non-goal for v1: matching LVGL's C renderer pixel-for-pixel. The target is
"close enough, fast enough" for an in-editor live preview; a later fidelity
pass (Stage 6) can narrow the gap and measure it quantitatively, the same
way the converter engine (`html-to-lvgl`) tracks a fidelity percentage.

## Intended integration

- **Done:** published standalone to npm as
  [`@richardmcquiston01/lvgl-simulator`](https://www.npmjs.com/package/@richardmcquiston01/lvgl-simulator)
  — a separate, independently-versioned package rather than folded into a
  larger monorepo.
- **Done:** input contract — a versioned JSON scene description
  (`docs/SCENE_SCHEMA.md`), standalone rather than adopting
  `html-to-lvgl`'s internal AST directly (see Stage 5 below and
  `docs/ROADMAP.md`'s "Open items" for why). If `html-to-lvgl`'s output
  needs to feed this library, that project gets a thin adapter mapping
  its AST to this schema, keeping the two decoupled.
- **Future work, not this repo's job:** consumed by a separate web-based
  UI editor project as a normal npm dependency, to drive its
  live-preview pane — integration happens as a separate PR in that other
  project, once it adds this package as a dependency.
- This repo has no dependency on `html-to-lvgl` or any other consumer
  project and must build/test/run standalone; that remains true after
  publishing.

## Conventions (matching the sibling repos)

- TypeScript, `strict: true`, Google TypeScript Style Guide.
- Package manager / build: plain `tsc` (or `tsup`) for the library build;
  a Vite-based playground app for local visual development and manual
  testing (per-project preference for Vite on single-page apps).
- Prettier + ESLint (`typescript-eslint`) matching the sibling repos'
  root config where reasonable.
- Tables/DB are not applicable here (no backend); this is a client-side
  rendering library only.

## Multi-agent, multi-stage development plan

Each stage below is scoped as an independent unit of work with its own
inputs, deliverables, and exit criteria, so it can be handed to a separate
agent/contributor. Stages 2, 3, and the test-harness portion of Stage 6 can
run concurrently once Stage 1's interfaces are stable; everything else is
sequential. See `docs/ROADMAP.md` for status tracking.

### Stage 0 — Scaffolding

**Agent role:** Scaffold Agent

- `package.json` (`type: module`, `exports` map, no runtime deps yet),
  `tsconfig.json` (strict, ES2022, matching the sibling repos' shared
  `tsconfig.base.json` shape), ESLint + Prettier config, Vitest.
- `playground/` — a minimal Vite app that imports the library and mounts a
  canvas, used as the manual test bed for every later stage.
- GitHub Actions CI: install, lint, typecheck, test, build.
- **Exit criteria:** `build` emits `dist/`; `dev` launches the Vite
  playground rendering an empty canvas at a configurable resolution.

### Stage 1 — Core rendering engine

**Agent role:** Rendering Engine Agent · depends on Stage 0

- Object-tree model (parent/child, mirrors `lv_obj_t` hierarchy), a
  display driver abstraction (width/height/color format, matching LVGL's
  `lv_disp_drv_t` concept), a render loop (`requestAnimationFrame`), and a
  repaint strategy (dirty-rect or full-frame — pick the simpler one first).
- **Exit criteria:** Renders a static screen (one container, one
  background color) at a given resolution with correct DPI scaling.

### Stage 2 — Widget library

**Agent role:** Widget Agent · depends on Stage 1

- Widgets prioritized by what `html-to-lvgl` actually emits today, not by
  LVGL's full widget catalog: container (flex + grid layout), label,
  button, image, checkbox/switch, slider.
- **Exit criteria:** Each widget renders recognizably against LVGL's
  default theme; flex/grid containers lay out children per LVGL's flex/grid
  semantics for the common cases (row/column, wrap, gap, align).

### Stage 3 — Style & theme system

**Agent role:** Styling Agent · depends on Stage 1, parallel with Stage 2

- Style properties mirroring LVGL's core set (`bg_color`, `border_*`,
  `radius`, `padding_*`, `text_font`, `text_color`, opacity) with LVGL's
  part/state model (default/pressed/checked/disabled/focused).
- **Exit criteria:** Style struct is close enough to LVGL's that a future
  AST importer (Stage 5) can map 1:1 without a lossy translation layer.

### Stage 4 — Input & interaction

**Agent role:** Interaction Agent · depends on Stage 2, Stage 3

- Pointer/touch → canvas hit-testing against the object tree; an event
  model mirroring LVGL events (`CLICKED`, `VALUE_CHANGED`,
  `PRESSED`/`RELEASED`); state transitions driven by input.
- **Exit criteria:** Clicking a rendered button flips its pressed state and
  fires a `CLICKED` event observable by the host application.

### Stage 5 — Scene import adapter

**Agent role:** Integration Agent · depends on Stage 2, Stage 3

- Define and version a JSON scene-description schema; document it
  independently of any specific producer. If/when compared against
  `html-to-lvgl`'s internal AST, add a thin adapter rather than adopting
  that AST as this library's public contract (keeps the two repos
  decoupled, per the "engine stays standalone" precedent).
- **Exit criteria:** `loadScreen(sceneJson)` renders a hand-written fixture
  scene with no manual wiring.

### Stage 6 — Testing & fidelity validation

**Agent role:** QA Agent · test-harness work can start alongside Stage 2–4

- Vitest for layout/style-resolution unit tests; Playwright-driven canvas
  snapshot tests for visual regression; an optional fidelity harness that
  renders the same fixture through this simulator and through the WASM/real
  LVGL path (once that exists) and reports a similarity score.
- **Exit criteria:** CI blocks on visual-regression diffs; a documented
  fidelity baseline exists for the Stage 2 widget set.

### Stage 7 — Packaging, docs, and platform integration

**Agent role:** Release/Docs Agent · depends on all prior stages

- Finish `README.md` (prerequisites, installation, usage, examples),
  `CHANGELOG.md` entries per release, an npm publish workflow (tag/branch
  triggered, matching `html-to-lvgl`'s release pattern).
- Follow-up (separate PR, separate repo): wire the published package into
  a consumer web editor's live-preview pane.
- **Exit criteria:** Package is published (or publish-ready) and consumed
  successfully from a spike branch of that consumer project.
