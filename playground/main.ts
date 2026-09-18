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

simulator.screen.addChild(new Label({ width: 200, height: 20, text: 'Stage 2 widget gallery' }));
simulator.screen.addChild(new Button({ width: 120, height: 36, text: 'Press me' }));
simulator.screen.addChild(new Checkbox({ width: 160, height: 20, text: 'Checked', checked: true }));
simulator.screen.addChild(new Checkbox({ width: 160, height: 20, text: 'Unchecked' }));
simulator.screen.addChild(new Switch({ width: 44, height: 24, checked: true }));
simulator.screen.addChild(new Slider({ width: 200, height: 20, value: 60 }));

simulator.renderOnce();
