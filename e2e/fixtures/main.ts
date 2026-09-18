import {
  Button,
  Checkbox,
  Container,
  ImageWidget,
  Label,
  Switch,
  Slider,
  createSimulator,
} from '@lvgl-simulator';

declare global {
  interface Window {
    __ready?: boolean;
  }
}

// A tiny inline SVG, so the fixture never depends on network access.
const ICON_SRC =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'>" +
  "<rect width='32' height='32' fill='%23ff5722'/><circle cx='16' cy='16' r='10' fill='%23ffffff'/></svg>";

const container = document.querySelector<HTMLDivElement>('#app');
if (!container) {
  throw new Error('Missing #app container element in e2e/fixtures/index.html.');
}

const simulator = createSimulator(container, {
  width: 360,
  height: 460,
  padding: 16,
});

const LABEL_X = 16;
const WIDGET_X = 160;
const ROW_HEIGHT = 56;

function row(index: number): number {
  return index * ROW_HEIGHT;
}

simulator.screen.addChild(
  new Label({ x: LABEL_X, y: row(0), width: 130, height: 20, text: 'Container' }),
);
const box = new Container({
  x: WIDGET_X,
  y: row(0),
  width: 110,
  height: 36,
  style: { base: { bgColor: '#e3f2fd', borderColor: '#1976d2', borderWidth: 2, radius: 6 } },
});
box.addChild(new Label({ x: 10, y: 8, width: 90, height: 20, text: 'Box' }));
simulator.screen.addChild(box);

simulator.screen.addChild(
  new Label({ x: LABEL_X, y: row(1), width: 130, height: 20, text: 'Label' }),
);
simulator.screen.addChild(
  new Label({ x: WIDGET_X, y: row(1), width: 180, height: 20, text: 'Hello LVGL' }),
);

simulator.screen.addChild(
  new Label({ x: LABEL_X, y: row(2), width: 130, height: 20, text: 'Button' }),
);
simulator.screen.addChild(
  new Button({ x: WIDGET_X, y: row(2), width: 90, height: 32, text: 'Normal' }),
);
simulator.screen.addChild(
  new Button({
    x: WIDGET_X + 100,
    y: row(2),
    width: 90,
    height: 32,
    text: 'Pressed',
    pressed: true,
  }),
);

simulator.screen.addChild(
  new Label({ x: LABEL_X, y: row(3), width: 130, height: 20, text: 'Checkbox' }),
);
simulator.screen.addChild(
  new Checkbox({ x: WIDGET_X, y: row(3), width: 90, height: 20, text: 'Off', checked: false }),
);
simulator.screen.addChild(
  new Checkbox({ x: WIDGET_X + 100, y: row(3), width: 90, height: 20, text: 'On', checked: true }),
);

simulator.screen.addChild(
  new Label({ x: LABEL_X, y: row(4), width: 130, height: 20, text: 'Switch' }),
);
simulator.screen.addChild(new Switch({ x: WIDGET_X, y: row(4), width: 44, height: 24 }));
simulator.screen.addChild(
  new Switch({ x: WIDGET_X + 60, y: row(4), width: 44, height: 24, checked: true }),
);

simulator.screen.addChild(
  new Label({ x: LABEL_X, y: row(5), width: 130, height: 20, text: 'Slider' }),
);
simulator.screen.addChild(
  new Slider({ x: WIDGET_X, y: row(5), width: 160, height: 20, min: 0, max: 100, value: 65 }),
);

simulator.screen.addChild(
  new Label({ x: LABEL_X, y: row(6), width: 130, height: 20, text: 'Image' }),
);
const icon = new ImageWidget({
  x: WIDGET_X,
  y: row(6),
  width: 32,
  height: 32,
  src: ICON_SRC,
  onLoad: () => {
    simulator.renderOnce();
    window.__ready = true;
  },
});
simulator.screen.addChild(icon);
simulator.screen.addChild(new ImageWidget({ x: WIDGET_X + 60, y: row(6), width: 32, height: 32 }));

simulator.renderOnce();
