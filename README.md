# LVGL Simulator

[**Live Demo**](https://lvgl-simulator-demo.vercel.app/)

[![npm version](https://img.shields.io/npm/v/@richardmcquiston01/lvgl-simulator.svg)](https://www.npmjs.com/package/@richardmcquiston01/lvgl-simulator)
[![CI](https://github.com/RichardMcQuiston01/lvgl-simulator/actions/workflows/ci.yml/badge.svg)](https://github.com/RichardMcQuiston01/lvgl-simulator/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)

Render LVGL-style embedded UIs to an HTML5 `<canvas>` — in pure TypeScript.

The simulator re-implements LVGL's widget, layout, and style behavior
directly (no WASM or Emscripten build of LVGL), making it a fast live preview
for web-based UI editors, docs, and tooling. It ships as native ESM with zero
runtime dependencies.

## Features

- **Widgets:** `Container`, `Label`, `Button`, `Checkbox`, `Switch`, `Slider`,
  and `ImageWidget`.
- **Layout:** flex (direction, wrap, main/cross alignment, gaps, `flexGrow`)
  and grid (explicit tracks, spans, gaps).
- **Styling:** LVGL-style part/state model with `pressed`, `checked`,
  `focused`, and `disabled` overrides.
- **Interaction:** pointer and touch input with `pressed`, `released`,
  `clicked`, and `valueChanged` events.
- **JSON scenes:** build a UI from a versioned JSON schema via `loadScreen()`.
- **Sharp rendering:** HiDPI-aware canvas; coordinates are always logical pixels.

## Installation

```bash
npm install @richardmcquiston01/lvgl-simulator
```

## Quick Start

```ts
import { createSimulator, Button, Label } from '@richardmcquiston01/lvgl-simulator';

const simulator = createSimulator(document.getElementById('app')!, {
  width: 320,
  height: 240,
  padding: 16,
  layout: { type: 'flex', direction: 'column', rowGap: 16 },
});

const label = new Label({ width: 200, height: 20, text: 'Clicks: 0' });
const button = new Button({ width: 120, height: 36, text: 'Click me' });

let clicks = 0;
button.addEventListener('clicked', () => {
  label.text = `Clicks: ${++clicks}`;
  simulator.renderOnce();
});

simulator.screen.addChild(button);
simulator.screen.addChild(label);
simulator.renderOnce();
```

Call `simulator.renderOnce()` after changing the tree, or `simulator.start()`
to repaint every animation frame. Call `simulator.destroy()` when unmounting.

> The simulator needs a real browser canvas. In server-rendered frameworks,
> only call `createSimulator` on the client.

## Documentation

- [Getting Started](./docs/GETTING_STARTED.md) — full guide to every widget,
  styling, layout, events, and framework integration
- [Scene Schema](./docs/SCENE_SCHEMA.md) — the JSON scene format
- [Fidelity Baseline](./docs/FIDELITY_BASELINE.md) — what the visual
  regression suite covers
- [Plan](./docs/PLAN.md) and [Roadmap](./docs/ROADMAP.md) — architecture and
  project status
- [Changelog](./CHANGELOG.md)

## Development

```bash
npm install
npm run dev        # playground at http://localhost:5173
npm test           # unit tests (Vitest)
npm run test:e2e   # visual regression tests (Playwright)
npm run typecheck
npm run lint
npm run format
npm run build
```

## Buy Me a Coffee

If this app, code, or repository has helped you or someone you know, please consider donating. I appreciate any help to offset the costs of development and/or AI Credits.

[**Donate via Stripe**](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800), or scan:

[![Donate via Stripe](./donate.svg)](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800)

## License

[Apache License 2.0](./LICENSE)

## Copyright

(c)2026 Richard McQuiston. All rights reserved.
