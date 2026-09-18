import { Button, Checkbox, createSimulator, Label, Slider, Switch } from '@lvgl-simulator';

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 240;

function readResolutionFromQuery(): { width: number; height: number } {
  const params = new URLSearchParams(window.location.search);
  const width = Number(params.get('width'));
  const height = Number(params.get('height'));

  return {
    width: Number.isFinite(width) && width > 0 ? width : DEFAULT_WIDTH,
    height: Number.isFinite(height) && height > 0 ? height : DEFAULT_HEIGHT,
  };
}

const container = document.querySelector<HTMLDivElement>('#app');
if (!container) {
  throw new Error('Missing #app container element in playground/index.html.');
}

const { width, height } = readResolutionFromQuery();

// Override the resolution via query params, e.g. ?width=480&height=320
const simulator = createSimulator(container, {
  width,
  height,
  padding: 16,
  layout: { type: 'flex', direction: 'column', rowGap: 16, crossAlign: 'start' },
});

const counterLabel = new Label({ width: 200, height: 20, text: 'Clicks: 0' });
const counterButton = new Button({ width: 120, height: 36, text: 'Click me' });
let clickCount = 0;
counterButton.addEventListener('clicked', () => {
  clickCount += 1;
  counterLabel.text = `Clicks: ${clickCount}`;
});

const toggleLabel = new Label({ width: 200, height: 20, text: 'Enabled: true' });
const toggle = new Switch({ width: 44, height: 24, checked: true });
toggle.addEventListener('valueChanged', () => {
  toggleLabel.text = `Enabled: ${toggle.checked}`;
});

const sliderLabel = new Label({ width: 200, height: 20, text: 'Value: 60' });
const slider = new Slider({ width: 200, height: 20, value: 60 });
slider.addEventListener('valueChanged', () => {
  sliderLabel.text = `Value: ${Math.round(slider.value)}`;
});

simulator.screen.addChild(
  new Label({ width: 200, height: 20, text: 'Stage 4 input & interaction' }),
);
simulator.screen.addChild(counterButton);
simulator.screen.addChild(counterLabel);
simulator.screen.addChild(
  new Checkbox({ width: 160, height: 20, text: 'Toggle me', checked: false }),
);
simulator.screen.addChild(toggle);
simulator.screen.addChild(toggleLabel);
simulator.screen.addChild(slider);
simulator.screen.addChild(sliderLabel);
simulator.screen.addChild(
  new Button({
    width: 160,
    height: 36,
    text: 'Disabled',
    disabled: true,
    style: { base: { bgColor: '#9e9e9e' } },
  }),
);

simulator.renderOnce();
