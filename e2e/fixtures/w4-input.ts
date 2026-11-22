import {
  Button,
  Container,
  Label,
  Menu,
  MenuPage,
  Msgbox,
  Tabview,
  Tileview,
  Win,
  createSimulator,
  type LvObject,
} from '@lvgl-simulator';

interface W4State {
  tabs: Tabview;
  tiles: Tileview;
  win: Win;
  winButton: Button;
  menu: Menu;
  root: MenuPage;
  displayPage: MenuPage;
  behind: Button;
  modal: Msgbox;
  screen: Container;
  behindClicks: number;
  winClicks: number;
  tabChanges: number;
  tileChanges: number;
  modalEvents: string[];
  /** The centre of `object` in canvas coordinates. */
  centre(object: LvObject): { x: number; y: number };
  /** Paints a frame, so layout is up to date before a test reads positions. */
  render(): void;
}

declare global {
  interface Window {
    __w4?: W4State;
  }
}

const container = document.querySelector<HTMLDivElement>('#app');
if (!container) {
  throw new Error('Missing #app container element in e2e/fixtures/w4-input.html.');
}

const simulator = createSimulator(container, { width: 400, height: 560 });
const screen = simulator.screen;

const tabs = new Tabview({ x: 10, y: 10, width: 380, height: 120, tabs: ['One', 'Two', 'Three'] });
tabs.pages.forEach((page, index) => {
  page.addChild(new Label({ x: 12, y: 12, width: 200, height: 20, text: `Page ${index + 1}` }));
});

const tiles = new Tileview({ x: 10, y: 140, width: 180, height: 80 });
tiles.addTile(0, 0).addChild(new Label({ x: 8, y: 8, width: 120, height: 20, text: 'Tile A' }));
tiles.addTile(1, 0).addChild(new Label({ x: 8, y: 8, width: 120, height: 20, text: 'Tile B' }));
tiles.addTile(2, 0).addChild(new Label({ x: 8, y: 8, width: 120, height: 20, text: 'Tile C' }));

const win = new Win({ x: 210, y: 140, width: 180, height: 90, title: 'Win' });
const winButton = win.addButton('+');

const menu = new Menu({ x: 10, y: 240, width: 380, height: 150 });
const root = menu.createPage('Settings');
const displayPage = menu.createPage('Display');
root.addItem('Display', { page: displayPage });
displayPage.addItem('Brightness');
menu.setPage(root);

const behind = new Button({ x: 150, y: 420, width: 100, height: 40, text: 'Behind' });
const modal = new Msgbox({
  x: 0,
  y: 0,
  width: 400,
  height: 560,
  modal: true,
  boxWidth: 260,
  title: 'Modal',
  text: 'Press a button.',
  closeButton: true,
  buttons: ['Cancel', 'OK'],
  hidden: true,
});

[tabs, tiles, win, menu, behind, modal].forEach((object) => screen.addChild(object));

const state: W4State = {
  tabs,
  tiles,
  win,
  winButton,
  menu,
  root,
  displayPage,
  behind,
  modal,
  screen,
  behindClicks: 0,
  winClicks: 0,
  tabChanges: 0,
  tileChanges: 0,
  modalEvents: [],
  centre(object: LvObject): { x: number; y: number } {
    const { x, y } = object.getAbsolutePosition();
    return { x: x + object.width / 2, y: y + object.height / 2 };
  },
  render(): void {
    simulator.renderOnce();
  },
};
behind.addEventListener('clicked', () => {
  state.behindClicks += 1;
});
winButton.addEventListener('clicked', () => {
  state.winClicks += 1;
});
tabs.addEventListener('valueChanged', () => {
  state.tabChanges += 1;
});
tiles.addEventListener('valueChanged', () => {
  state.tileChanges += 1;
});
modal.addEventListener('valueChanged', () => {
  state.modalEvents.push(`button:${modal.lastButtonText}`);
});
modal.addEventListener('cancel', () => {
  state.modalEvents.push('cancel');
});
window.__w4 = state;

simulator.renderOnce();
simulator.renderOnce();
