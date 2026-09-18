# LVGL Simulator

[![npm version](https://img.shields.io/npm/v/@richardmcquiston01/lvgl-simulator.svg)](https://www.npmjs.com/package/@richardmcquiston01/lvgl-simulator)
[![CI](https://github.com/RichardMcQuiston01/lvgl-simulator/actions/workflows/ci.yml/badge.svg)](https://github.com/RichardMcQuiston01/lvgl-simulator/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)

## Overview

TypeScript LVGL simulator for running in the browser, designed to be used as
a package for incorporation into other repositories.

Renders LVGL-style UIs to an HTML5 `<canvas>` by re-implementing widget,
layout, and style behavior in pure TypeScript (no WASM/Emscripten build of
LVGL itself) — designed as a fast, low-fidelity-tradeoff live preview for a
web-based UI editor.

See [`docs/GETTING_STARTED.md`](./docs/GETTING_STARTED.md) for a full
walkthrough (widgets, styling, layout, events, scenes, framework
integration, troubleshooting).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) >= 22
- npm (ships with Node)

### Installation

To use the published package in your own project:

```bash
npm install @richardmcquiston01/lvgl-simulator
```

To work on this repository itself:

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
npm run test:e2e     # run the Playwright visual-regression suite
npm run lint         # ESLint
npm run format       # Prettier check
```

`test:e2e` compares a canvas render of the Stage 2 widget set against a
committed baseline screenshot — see
[`docs/FIDELITY_BASELINE.md`](./docs/FIDELITY_BASELINE.md) for what it
covers and how to update the baseline after an intentional visual change.

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

const counterLabel = new Label({ width: 200, height: 20, text: 'Clicks: 0' });
const button = new Button({ width: 120, height: 36, text: 'Click me' });
let clicks = 0;
button.addEventListener('clicked', () => {
  counterLabel.text = `Clicks: ${++clicks}`;
});

simulator.screen.addChild(button);
simulator.screen.addChild(counterLabel);
simulator.screen.addChild(new Checkbox({ width: 160, height: 20, text: 'Toggle me' }));
simulator.screen.addChild(new Switch({ width: 44, height: 24 }));
simulator.screen.addChild(new Slider({ width: 200, height: 20, value: 60 })); // drag it — it's live

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

// Pointer input is wired up automatically: clicking toggles
// Checkbox/Switch (firing `valueChanged`), and dragging a Slider updates
// its value — canvas listeners are attached the moment createSimulator()
// runs, no separate setup required.
```

A whole subtree can also come from plain JSON via `loadScreen()` — see
[`docs/SCENE_SCHEMA.md`](./docs/SCENE_SCHEMA.md) for the full format:

```ts
import { loadScreen, type Scene } from '@richardmcquiston01/lvgl-simulator';

const scene: Scene = {
  version: 1,
  width: 200,
  height: 40,
  layout: { type: 'flex', columnGap: 8 },
  children: [{ type: 'button', width: 90, height: 32, text: 'OK' }],
};

simulator.screen.addChild(loadScreen(scene)); // no manual widget construction
```

The `playground/` app runs a fuller version of this gallery, including a
disabled button, a live slider-value readout, and a section loaded
entirely from a hand-written JSON scene — `npm run dev`, then visit the
printed URL (resolution configurable via `?width=`/`?height=` query
params). See [`docs/ROADMAP.md`](./docs/ROADMAP.md) for what's next.

For the full widget/styling/layout/events reference, a step-by-step
tutorial, framework integration snippets, and troubleshooting, see
[`docs/GETTING_STARTED.md`](./docs/GETTING_STARTED.md).

## Releasing

Publishing to npm is tag-triggered (`.github/workflows/release.yml`):

1. Bump `version` in `package.json` (following semver) and add a matching
   entry at the top of [`CHANGELOG.md`](./CHANGELOG.md), above `Unreleased`.
2. Commit, merge to `main`, then tag the merge commit and push the tag:
   ```bash
   git tag v<version>
   git push origin v<version>
   ```
3. CI lints/typechecks/tests/builds, verifies the tag matches
   `package.json`'s version, then runs `npm publish --provenance`. This
   requires an `NPM_TOKEN` repository secret with publish rights on the
   `@richardmcquiston01` npm scope.

## Buy Me a Coffee

If this app, code, or repository has helped you or someone you know, please consider donating. I appreciate any help to offset the costs of development and/or AI Credits.

[**Donate via Stripe**](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800), or scan:

[![Donate via Stripe](./donate.svg)](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800)

## License

[Apache License 2.0](./LICENSE)

## Copyright

(c)2026 Richard McQuiston. All rights reserved.
