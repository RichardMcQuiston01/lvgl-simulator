# LVGL Simulator

## Overview

TypeScript LVGL simulator for running in the browser. Designed to be as package for incorporation into other repositories.

Renders LVGL-style UIs to an HTML5 `<canvas>` by re-implementing widget,
layout, and style behavior in pure TypeScript (no WASM/Emscripten build of
LVGL itself). Intended for future consumption by
[`html2lvgl-platform`](https://github.com/RichardMcQuiston01/html2lvgl-platform)'s
web editor as a fast, low-fidelity-tradeoff live preview.

See [`docs/PLAN.md`](./docs/PLAN.md) for the architecture rationale and the
multi-agent, multi-stage development plan, and
[`docs/ROADMAP.md`](./docs/ROADMAP.md) for current stage status.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) >= 22
- npm (ships with Node)

### Installation

```bash
git clone https://github.com/RichardMcQuiston01/lvgl-simulator.git
cd lvgl-simulator
npm install
```

### Usage

```bash
npm run dev        # launch the Vite playground at http://localhost:5173
npm run build       # type-check and emit the library to dist/
npm test            # run the Vitest suite
npm run lint         # ESLint
npm run format       # Prettier check
```

### Examples

```ts
import {
  Button,
  Checkbox,
  createSimulator,
  Label,
  Slider,
  Switch,
} from '@richardmcquiston01/lvgl-simulator';

const simulator = createSimulator(document.getElementById('app')!, {
  width: 320,
  height: 240,
  padding: 16,
  layout: { type: 'flex', direction: 'column', rowGap: 16 },
});

simulator.screen.addChild(new Label({ width: 200, height: 20, text: 'Widget gallery' }));
simulator.screen.addChild(new Button({ width: 120, height: 36, text: 'Press me' }));
simulator.screen.addChild(new Checkbox({ width: 160, height: 20, text: 'Checked', checked: true }));
simulator.screen.addChild(new Switch({ width: 44, height: 24, checked: true }));
simulator.screen.addChild(new Slider({ width: 200, height: 20, value: 60 }));

// Every widget's paint properties are a StyleSet (a base plus per-state
// overrides), mirroring LVGL's own part/state model — override any of it:
simulator.screen.addChild(
  new Button({
    width: 160,
    height: 36,
    text: 'Custom pressed color',
    pressed: true,
    style: { base: {}, states: { pressed: { bgColor: '#8e24aa' } } },
  }),
);

simulator.start(); // repaints `simulator.screen` on every animation frame
```

The `playground/` app runs this exact gallery — `npm run dev`, then visit
the printed URL (resolution configurable via `?width=`/`?height=` query
params). It will grow further as interaction lands — see
[`docs/ROADMAP.md`](./docs/ROADMAP.md).

## Buy Me a Coffee

If this app, code, or repository has helped you or someone you know, please consider donating. I appreciate any help to offset the costs of development and/or AI Credits.

[**Donate via Stripe**](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800), or scan:

[![Donate via Stripe](./donate.svg)](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800)

## License

Apache 2

## Copyright

(c)2026 Richard McQuiston. All rights reserved.
