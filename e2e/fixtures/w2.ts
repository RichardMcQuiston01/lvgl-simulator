import {
  ArcLabel,
  Keyboard,
  Label,
  Span,
  Spinbox,
  Textarea,
  createSimulator,
} from '@lvgl-simulator';

declare global {
  interface Window {
    __ready?: boolean;
  }
}

const container = document.querySelector<HTMLDivElement>('#app');
if (!container) {
  throw new Error('Missing #app container element in e2e/fixtures/w2.html.');
}

const simulator = createSimulator(container, { width: 360, height: 600, padding: 16 });

const LABEL_X = 16;
const WIDGET_X = 120;

function addLabel(y: number, text: string): void {
  simulator.screen.addChild(new Label({ x: LABEL_X, y: y + 8, width: 96, height: 20, text }));
}

// A frozen clock keeps the caret solid, so the capture is deterministic.
const frozen = (): number => 0;

// Textarea: text with a selection and a visible caret, a placeholder, and password masking.
addLabel(0, 'Textarea');
const filled = new Textarea({
  x: WIDGET_X,
  y: 0,
  width: 220,
  height: 36,
  text: 'Hello world',
  oneLine: true,
  focused: true,
  now: frozen,
});
filled.setCaret(0);
filled.setCaret(5, true);
simulator.screen.addChild(filled);
simulator.screen.addChild(
  new Textarea({
    x: WIDGET_X,
    y: 44,
    width: 220,
    height: 36,
    placeholder: 'Your name',
    oneLine: true,
    now: frozen,
  }),
);
simulator.screen.addChild(
  new Textarea({
    x: WIDGET_X,
    y: 88,
    width: 220,
    height: 36,
    text: 'secret',
    passwordMode: true,
    oneLine: true,
    now: frozen,
  }),
);

// Spinbox: two decimals, with the tens digit selected.
addLabel(136, 'Spinbox');
const price = new Spinbox({
  x: WIDGET_X,
  y: 136,
  width: 120,
  height: 36,
  min: 0,
  value: 12345,
  decimalDigits: 2,
  focused: true,
});
price.stepNext();
simulator.screen.addChild(price);

// Span: mixed colors, a larger run, and underline, wrapping at the box width.
addLabel(184, 'Span');
simulator.screen.addChild(
  new Span({
    x: WIDGET_X,
    y: 184,
    width: 220,
    height: 60,
    spans: [
      { text: 'Rich ', style: { textColor: '#e53935' } },
      { text: 'text', style: { textFontSize: 22, textColor: '#1e88e5' } },
      { text: ' with mixed styles that ' },
      { text: 'wrap', style: { textDecor: 'underline', textColor: '#43a047' } },
      { text: ' onto more lines.' },
    ],
  }),
);

// ArcLabel: clockwise over the top, counterclockwise along the bottom.
addLabel(272, 'ArcLabel');
simulator.screen.addChild(
  new ArcLabel({ x: WIDGET_X, y: 256, width: 150, height: 150, text: 'CURVED TEXT', radius: 55 }),
);
simulator.screen.addChild(
  new ArcLabel({
    x: WIDGET_X,
    y: 256,
    width: 150,
    height: 150,
    text: 'ALONG THE BOTTOM',
    radius: 55,
    startAngle: 180,
    sweepAngle: 180,
    direction: 'counterClockwise',
    verticalAlign: 'inside',
    style: { base: { textColor: '#1e88e5' } },
  }),
);

// Keyboard: the lower-case layout.
simulator.screen.addChild(new Keyboard({ x: 10, y: 424, width: 340, height: 166, gap: 3 }));

simulator.renderOnce();
window.__ready = true;
