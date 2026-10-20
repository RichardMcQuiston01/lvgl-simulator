import {
  Button,
  Checkbox,
  Container,
  createNavigator,
  createSimulator,
  Label,
  loadScreen,
  Slider,
  Switch,
  type Scene,
} from '@lvgl-simulator';

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 240;
const VIEW_PADDING = 12;
const VIEW_ROW_GAP = 12;

function readResolutionFromQuery(): { width: number; height: number } {
  const params = new URLSearchParams(window.location.search);
  const width = Number(params.get('width'));
  const height = Number(params.get('height'));

  return {
    width: Number.isFinite(width) && width > 0 ? width : DEFAULT_WIDTH,
    height: Number.isFinite(height) && height > 0 ? height : DEFAULT_HEIGHT,
  };
}

const appContainer = document.querySelector<HTMLDivElement>('#app');
if (!appContainer) {
  throw new Error('Missing #app container element in playground/index.html.');
}

const { width, height } = readResolutionFromQuery();
const contentWidth = width - VIEW_PADDING * 2;

// Override the resolution via query params, e.g. ?width=480&height=320
const simulator = createSimulator(appContainer, { width, height });

/**
 * A full-screen page mounted one at a time by the `Navigator` below —
 * `simulator.screen` itself stays a plain, unstyled frame; each view owns
 * its own layout/padding, matching LVGL's "one active screen" model
 * (`lv_screen_load`) plus a back-stack for the demo's Back buttons.
 */
function createView(): Container {
  return new Container({
    width,
    height,
    padding: VIEW_PADDING,
    layout: { type: 'flex', direction: 'column', rowGap: VIEW_ROW_GAP, crossAlign: 'start' },
  });
}

function createRow(rowHeight: number): Container {
  return new Container({
    width: contentWidth,
    height: rowHeight,
    layout: { type: 'flex', direction: 'row', columnGap: 12, crossAlign: 'center' },
  });
}

// --- View 1: Home --------------------------------------------------------

const homeView = createView();
homeView.addChild(new Label({ width: contentWidth, height: 20, text: 'Home' }));

const counterLabel = new Label({ width: 150, height: 20, text: 'Clicks: 0' });
const counterButton = new Button({ width: 120, height: 32, text: 'Click me' });
let clickCount = 0;
counterButton.addEventListener('clicked', () => {
  clickCount += 1;
  counterLabel.text = `Clicks: ${clickCount}`;
});

const counterRow = createRow(32);
counterRow.addChild(counterButton);
counterRow.addChild(counterLabel);
homeView.addChild(counterRow);

const settingsButton = new Button({ width: 140, height: 32, text: 'Settings' });
homeView.addChild(settingsButton);

// The section below comes entirely from a hand-written JSON scene via
// loadScreen() — no `new Button()`/`new Label()`/`addChild()` calls for any
// of it. Only the click handler (added after loading, since JSON can't
// carry a function) is wired up in code.
const fixtureScene: Scene = {
  version: 1,
  width: contentWidth,
  height: 56,
  layout: { type: 'flex', direction: 'column', rowGap: 8 },
  children: [
    { type: 'label', width: contentWidth, height: 16, text: 'Loaded from JSON:' },
    {
      type: 'container',
      width: contentWidth,
      height: 32,
      layout: { type: 'flex', columnGap: 8, crossAlign: 'center' },
      children: [
        {
          type: 'button',
          width: 90,
          height: 32,
          text: 'Scene OK',
          style: { base: {}, states: { pressed: { bgColor: '#00897b' } } },
        },
        { type: 'label', width: 150, height: 16, text: 'not clicked' },
      ],
    },
  ],
};

const fixtureRoot = loadScreen(fixtureScene);
const [, fixtureRow] = fixtureRoot.children;
const [fixtureButton, fixtureStatusLabel] = fixtureRow?.children ?? [];
let fixtureClicks = 0;
fixtureButton?.addEventListener('clicked', () => {
  fixtureClicks += 1;
  if (fixtureStatusLabel instanceof Label) {
    fixtureStatusLabel.text = `clicked ${fixtureClicks}x`;
  }
});
homeView.addChild(fixtureRoot);

// --- View 2: Settings (depth 1) ------------------------------------------

const settingsView = createView();
settingsView.addChild(new Label({ width: contentWidth, height: 20, text: 'Settings' }));

const darkModeLabel = new Label({ width: 200, height: 20, text: 'Dark mode: off' });
const darkModeSwitch = new Switch({ width: 44, height: 24 });
darkModeSwitch.addEventListener('valueChanged', () => {
  darkModeLabel.text = `Dark mode: ${darkModeSwitch.checked ? 'on' : 'off'}`;
});
const darkModeRow = createRow(24);
darkModeRow.addChild(darkModeSwitch);
darkModeRow.addChild(darkModeLabel);
settingsView.addChild(darkModeRow);

const volumeLabel = new Label({ width: 80, height: 20, text: 'Volume: 60' });
const volumeSlider = new Slider({ width: 160, height: 20, value: 60 });
volumeSlider.addEventListener('valueChanged', () => {
  volumeLabel.text = `Volume: ${Math.round(volumeSlider.value)}`;
});
const volumeRow = createRow(20);
volumeRow.addChild(volumeSlider);
volumeRow.addChild(volumeLabel);
settingsView.addChild(volumeRow);

const advancedButton = new Button({ width: 140, height: 32, text: 'Advanced' });
const settingsBackButton = new Button({ width: 140, height: 32, text: 'Back' });
settingsView.addChild(advancedButton);
settingsView.addChild(settingsBackButton);

// --- View 3: Advanced (depth 2 — the demo's max navigation depth) --------

const advancedView = createView();
advancedView.addChild(new Label({ width: contentWidth, height: 20, text: 'Advanced' }));
advancedView.addChild(
  new Label({ width: contentWidth, height: 20, text: 'Depth 2 — as deep as this demo goes.' }),
);

const debugLoggingCheckbox = new Checkbox({ width: 200, height: 20, text: 'Debug logging' });
const advancedBackButton = new Button({ width: 140, height: 32, text: 'Back' });
advancedView.addChild(debugLoggingCheckbox);
advancedView.addChild(advancedBackButton);

// --- Navigation wiring -----------------------------------------------------

const navigator = createNavigator(simulator.screen, homeView, simulator.renderOnce, {
  maxDepth: 2,
});

settingsButton.addEventListener('clicked', () => navigator.push(settingsView));
advancedButton.addEventListener('clicked', () => navigator.push(advancedView));
settingsBackButton.addEventListener('clicked', () => navigator.pop());
advancedBackButton.addEventListener('clicked', () => navigator.pop());

simulator.renderOnce();
