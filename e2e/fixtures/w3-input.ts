import {
  Button,
  ButtonMatrix,
  Checkbox,
  CheckboxGroup,
  Dropdown,
  List,
  Roller,
  createSimulator,
} from '@lvgl-simulator';

interface W3State {
  dropdown: Dropdown;
  covered: Button;
  roller: Roller;
  matrix: ButtonMatrix;
  list: List;
  radios: Checkbox[];
  coveredClicks: number;
  dropdownChanges: number;
  rollerChanges: number;
  listClicks: string[];
}

declare global {
  interface Window {
    __w3?: W3State;
  }
}

const container = document.querySelector<HTMLDivElement>('#app');
if (!container) {
  throw new Error('Missing #app container element in e2e/fixtures/w3-input.html.');
}

const simulator = createSimulator(container, { width: 400, height: 420 });

const dropdown = new Dropdown({
  x: 10,
  y: 10,
  width: 160,
  height: 36,
  options: ['Apple', 'Banana', 'Cherry', 'Date'],
});
// Added after the dropdown, and under its open list.
const covered = new Button({ x: 20, y: 80, width: 100, height: 40, text: 'Covered' });
const roller = new Roller({
  x: 200,
  y: 10,
  width: 90,
  height: 90,
  options: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
});
const matrix = new ButtonMatrix({
  x: 10,
  y: 180,
  width: 200,
  height: 60,
  map: ['A', 'B', 'C'],
  oneChecked: true,
  controls: [{ checkable: true }, { checkable: true }, { checkable: true }],
});
const list = new List({ x: 10, y: 260, width: 180, height: 100, itemHeight: 30 });
['One', 'Two', 'Three', 'Four', 'Five', 'Six'].forEach((text) => list.addButton(text));

const group = new CheckboxGroup();
const radios = ['Red', 'Green', 'Blue'].map(
  (text, index) =>
    new Checkbox({ x: 240, y: 200 + index * 32, width: 100, height: 24, text, group }),
);

[dropdown, covered, roller, matrix, list, ...radios].forEach((object) =>
  simulator.screen.addChild(object),
);
simulator.focusGroup.add(dropdown);

const state: W3State = {
  dropdown,
  covered,
  roller,
  matrix,
  list,
  radios,
  coveredClicks: 0,
  dropdownChanges: 0,
  rollerChanges: 0,
  listClicks: [],
};
covered.addEventListener('clicked', () => {
  state.coveredClicks += 1;
});
dropdown.addEventListener('valueChanged', () => {
  state.dropdownChanges += 1;
});
roller.addEventListener('valueChanged', () => {
  state.rollerChanges += 1;
});
list.onItemClicked((item) => state.listClicks.push(item.text));
window.__w3 = state;

simulator.renderOnce();
