import {
  Button,
  ButtonMatrix,
  Checkbox,
  CheckboxGroup,
  Dropdown,
  Label,
  List,
  Roller,
  createSimulator,
} from '@lvgl-simulator';

declare global {
  interface Window {
    __ready?: boolean;
  }
}

const container = document.querySelector<HTMLDivElement>('#app');
if (!container) {
  throw new Error('Missing #app container element in e2e/fixtures/w3.html.');
}

const simulator = createSimulator(container, { width: 360, height: 600 });

const LABEL_X = 16;
const WIDGET_X = 120;

function addLabel(y: number, text: string): void {
  simulator.screen.addChild(new Label({ x: LABEL_X, y: y + 8, width: 96, height: 20, text }));
}

const FRUIT = ['Apple', 'Banana', 'Cherry', 'Date'];

// Dropdown, closed.
addLabel(12, 'Dropdown');
simulator.screen.addChild(
  new Dropdown({ x: WIDGET_X, y: 12, width: 200, height: 36, options: FRUIT, selected: 1 }),
);

// Dropdown, open: its list floats above the button under it, which is added later in the tree.
addLabel(64, 'Open');
const open = new Dropdown({
  x: WIDGET_X,
  y: 64,
  width: 200,
  height: 36,
  options: FRUIT,
  selected: 2,
});
simulator.screen.addChild(open);
simulator.screen.addChild(new Button({ x: 140, y: 150, width: 100, height: 40, text: 'Covered' }));
open.open();

// ButtonMatrix: a checked checkable button, a disabled one, a hidden one and wider buttons.
addLabel(268, 'ButtonMatrix');
simulator.screen.addChild(
  new ButtonMatrix({
    x: WIDGET_X,
    y: 260,
    width: 220,
    height: 84,
    map: ['Home', 'Play', 'Stop', '\n', 'Prev', 'Next', ''],
    controls: [
      { checkable: true, checked: true },
      undefined,
      { disabled: true },
      undefined,
      { width: 2 },
      { hidden: true },
    ],
  }),
);

// List: a heading and buttons with icons, scrolled by its own overflow.
addLabel(368, 'List');
const list = new List({ x: WIDGET_X, y: 360, width: 220, height: 110, itemHeight: 34 });
list.addText('Files');
list.addButton('New', '+');
list.addButton('Open', '>');
list.addButton('Save');
simulator.screen.addChild(list);

// Roller and radio buttons.
addLabel(494, 'Roller');
simulator.screen.addChild(
  new Roller({
    x: WIDGET_X,
    y: 486,
    width: 100,
    height: 96,
    options: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    selected: 3,
  }),
);
const sizes = new CheckboxGroup();
['Small', 'Medium', 'Large'].forEach((text, index) => {
  simulator.screen.addChild(
    new Checkbox({
      x: 240,
      y: 490 + index * 30,
      width: 110,
      height: 24,
      text,
      checked: index === 1,
      group: sizes,
    }),
  );
});

simulator.renderOnce();
window.__ready = true;
