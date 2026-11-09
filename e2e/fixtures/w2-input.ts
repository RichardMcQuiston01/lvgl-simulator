import { Keyboard, Textarea, createSimulator } from '@lvgl-simulator';

declare global {
  interface Window {
    __w2?: { textarea: Textarea; keyboard: Keyboard; readyCount: number; changeCount: number };
  }
}

const container = document.querySelector<HTMLDivElement>('#app');
if (!container) {
  throw new Error('Missing #app container element in e2e/fixtures/w2-input.html.');
}

const simulator = createSimulator(container, { width: 360, height: 260 });

const textarea = new Textarea({ x: 10, y: 10, width: 220, height: 36, oneLine: true });
const keyboard = new Keyboard({ x: 10, y: 60, width: 340, height: 160, target: textarea });
simulator.screen.addChild(textarea);
simulator.screen.addChild(keyboard);
simulator.focusGroup.add(textarea);

const state = { textarea, keyboard, readyCount: 0, changeCount: 0 };
textarea.addEventListener('valueChanged', () => {
  state.changeCount += 1;
});
textarea.addEventListener('ready', () => {
  state.readyCount += 1;
});
window.__w2 = state;

simulator.renderOnce();
