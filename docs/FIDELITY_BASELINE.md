# Fidelity baseline — Stage 2 widget set

This documents what the Stage 6 visual-regression check
(`e2e/widgets.spec.ts`) actually locks down, and what it deliberately
doesn't, per `docs/PLAN.md`'s Stage 6 exit criteria: _"a documented
fidelity baseline exists for the Stage 2 widget set."_

## What's covered

`e2e/fixtures/main.ts` mounts one `createSimulator()` screen containing
every Stage 2 widget, each in at least two states, at fixed positions (no
flex/grid — layout math already has its own Vitest coverage in
`src/layout/*.test.ts`, so this fixture isolates paint output):

| Widget        | States shown                                       |
| ------------- | -------------------------------------------------- |
| `Container`   | bordered box with a nested `Label`                 |
| `Label`       | default text                                       |
| `Button`      | default, `pressed: true`                           |
| `Checkbox`    | unchecked, checked                                 |
| `Switch`      | off, on                                            |
| `Slider`      | mid-value (65/100), showing track/indicator/knob   |
| `ImageWidget` | loaded (inline SVG data URI), unloaded placeholder |

`e2e/widgets.spec.ts` (Playwright, real Chromium — not jsdom) waits for
the image to finish loading, then screenshots the canvas and compares it
against the committed baseline at
`e2e/widgets.spec.ts-snapshots/stage2-widgets-chromium-linux.png` with a
2% max-diff-pixel-ratio tolerance (`playwright.config.ts`) to absorb
anti-aliasing noise across Chromium builds without masking a real
regression. CI installs the matching Chromium via
`npx playwright install --with-deps chromium` and fails the build on any
diff over that tolerance — this is what "CI blocks on visual-regression
diffs" means in practice.

## What this baseline is not

- **Not pixel parity with real LVGL.** There is no WASM/native LVGL build
  in this repo to compare against yet (`docs/PLAN.md`'s Stage 6 notes
  this fidelity harness as optional pending that path existing). This
  baseline instead locks down _this simulator's own_ rendering so a
  future change can't silently drift — regressions are caught, but
  "matches real LVGL's default theme" is not independently verified here.
- **Not exhaustive per-widget coverage.** It doesn't enumerate every
  `Style`/`StyleSet` permutation (custom colors, radii, opacity) — those
  are covered by the Vitest unit suite instead
  (`src/widgets/*.test.ts`, `src/style/Style.test.ts`), which asserts on
  resolved style values and paint calls rather than pixels. This fixture
  exists to catch _unintentional_ visual drift in the default theme, not
  to be a style-matrix test.
- **Font rendering may still vary** across OS/Chromium builds beyond the
  tolerance in rare cases — if CI fails on a diff that looks like pure
  anti-aliasing noise rather than a real change, re-run once before
  investigating further, per the guidance in `playwright.config.ts`.

## Updating the baseline

When a change intentionally alters a Stage 2 widget's default appearance,
regenerate the screenshot rather than hand-editing it:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
  npm run test:e2e:update
```

(Omit the env vars if Playwright's own browser install is already on
`PATH` — they only matter in this project's sandboxed dev environment.)
Review the diff in the resulting PNG like any other reviewed change
before committing it.
