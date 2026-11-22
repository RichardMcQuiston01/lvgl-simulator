import { Label, Menu, Msgbox, Tabview, Tileview, Win, createSimulator } from '@lvgl-simulator';

declare global {
  interface Window {
    __ready?: boolean;
  }
}

const container = document.querySelector<HTMLDivElement>('#app');
if (!container) {
  throw new Error('Missing #app container element in e2e/fixtures/w4.html.');
}

const simulator = createSimulator(container, { width: 360, height: 700 });

// Win: a header with a title and two buttons over a content area.
const win = new Win({ x: 12, y: 12, width: 336, height: 110, title: 'Window' });
win.addButton('+');
win.addButton('×');
win.content.addChild(new Label({ x: 12, y: 12, width: 200, height: 20, text: 'Content area' }));
simulator.screen.addChild(win);

// Tabview: three tabs, the middle one active.
const tabs = new Tabview({
  x: 12,
  y: 134,
  width: 336,
  height: 120,
  tabs: ['Home', 'Chat', 'Info'],
});
tabs.pages[0]?.addChild(new Label({ x: 12, y: 12, width: 200, height: 20, text: 'Home page' }));
tabs.pages[1]?.addChild(new Label({ x: 12, y: 12, width: 200, height: 20, text: 'Chat page' }));
simulator.screen.addChild(tabs);
tabs.setActive(1);

// Tileview: two tiles side by side, the first showing.
const tiles = new Tileview({ x: 12, y: 266, width: 160, height: 90 });
tiles
  .addTile(0, 0)
  .addChild(new Label({ x: 12, y: 12, width: 120, height: 20, text: 'Tile 0, 0' }));
tiles
  .addTile(1, 0)
  .addChild(new Label({ x: 12, y: 12, width: 120, height: 20, text: 'Tile 1, 0' }));
simulator.screen.addChild(tiles);

// Msgbox: a title, wrapped text, a close button and two footer buttons.
const alert = new Msgbox({
  x: 184,
  y: 266,
  width: 164,
  title: 'Alert',
  text: 'Save your changes before leaving?',
  closeButton: true,
  buttons: ['No', 'Yes'],
});
simulator.screen.addChild(alert);

// Menu: a sidebar and a main page that opens another page, with a section and separator.
const menu = new Menu({ x: 12, y: 440, width: 336, height: 248, sidebarWidth: 110 });
const settings = menu.createPage('Settings');
const display = menu.createPage('Display');
settings.addItem('Display', { page: display, icon: '*' });
settings.addSeparator();
const more = settings.addSection('More');
more.addItem('Sound');
more.addItem('About');
display.addItem('Brightness');
const nav = menu.createPage('Menu');
nav.addItem('Settings', { page: settings });
nav.addItem('Display', { page: display });
menu.setPage(settings);
menu.setSidebarPage(nav);
simulator.screen.addChild(menu);

// The first frame measures text with an estimate; the second uses the real font.
simulator.renderOnce();
simulator.renderOnce();
window.__ready = true;
