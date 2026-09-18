# CHANGELOG

## Unreleased

- Stage 1 core rendering engine: `LvObject` object tree, `createDisplayDriver`
  (devicePixelRatio-scaled canvas backing store), `createRenderLoop`
  (full-repaint `requestAnimationFrame` loop). `createSimulator()` now
  renders a real static screen instead of Stage 0's placeholder fill.
- Stage 0 scaffolding: `package.json`/`tsconfig`, ESLint + Prettier, Vitest,
  a Vite-based `playground/` app, and CI (lint/format/typecheck/test/build).
  See `docs/PLAN.md` and `docs/ROADMAP.md`.
