import {
  Arc,
  Bar,
  ImageButton,
  Label,
  Led,
  Line,
  Scale,
  Spinner,
  createSimulator,
} from '@lvgl-simulator';

declare global {
  interface Window {
    __ready?: boolean;
  }
}

const container = document.querySelector<HTMLDivElement>('#app');
if (!container) {
  throw new Error('Missing #app container element in e2e/fixtures/w1.html.');
}

const simulator = createSimulator(container, { width: 360, height: 560, padding: 16 });

const LABEL_X = 16;
const WIDGET_X = 120;
const ROW_HEIGHT = 64;

function row(index: number): number {
  return index * ROW_HEIGHT;
}

function addLabel(index: number, text: string): void {
  simulator.screen.addChild(
    new Label({ x: LABEL_X, y: row(index) + 4, width: 96, height: 20, text }),
  );
}

// Row 0: Bar — normal, symmetrical, and vertical.
addLabel(0, 'Bar');
simulator.screen.addChild(new Bar({ x: WIDGET_X, y: row(0), width: 120, height: 12, value: 60 }));
simulator.screen.addChild(
  new Bar({
    x: WIDGET_X,
    y: row(0) + 24,
    width: 120,
    height: 12,
    min: -100,
    max: 100,
    value: 50,
    mode: 'symmetrical',
  }),
);
simulator.screen.addChild(
  new Bar({ x: WIDGET_X + 140, y: row(0), width: 12, height: 44, value: 70 }),
);

// Row 1: Arc — normal and symmetrical.
addLabel(1, 'Arc');
simulator.screen.addChild(new Arc({ x: WIDGET_X, y: row(1), width: 56, height: 56, value: 65 }));
simulator.screen.addChild(
  new Arc({
    x: WIDGET_X + 70,
    y: row(1),
    width: 56,
    height: 56,
    value: 25,
    mode: 'symmetrical',
    indicatorStyle: { base: { arcColor: '#4caf50' } },
    knobStyle: { base: { bgColor: '#4caf50' } },
  }),
);

// Row 2: Spinner (frozen at a fixed point of its revolution), LED on / dim / green.
addLabel(2, 'Spinner / LED');
const clock = { now: 0 };
simulator.screen.addChild(
  new Spinner({
    x: WIDGET_X,
    y: row(2),
    width: 44,
    height: 44,
    now: () => clock.now,
  }),
);
clock.now = 250;
simulator.screen.addChild(new Led({ x: WIDGET_X + 70, y: row(2) + 12, width: 20, height: 20 }));
simulator.screen.addChild(
  new Led({ x: WIDGET_X + 100, y: row(2) + 12, width: 20, height: 20, brightness: 0 }),
);
simulator.screen.addChild(
  new Led({
    x: WIDGET_X + 130,
    y: row(2) + 12,
    width: 20,
    height: 20,
    color: '#4caf50',
    brightness: 200,
  }),
);

// Row 3: Line.
addLabel(3, 'Line');
simulator.screen.addChild(
  new Line({
    x: WIDGET_X,
    y: row(3) + 4,
    points: [
      { x: 0, y: 30 },
      { x: 30, y: 0 },
      { x: 60, y: 30 },
      { x: 90, y: 5 },
      { x: 120, y: 30 },
    ],
  }),
);

// Rows 4-5: Scale — linear with a colored section, then a round dial.
addLabel(4, 'Scale');
simulator.screen.addChild(
  new Scale({
    x: WIDGET_X,
    y: row(4),
    width: 200,
    height: 44,
    sections: [
      {
        min: 70,
        max: 100,
        mainStyle: { lineColor: '#e53935', lineWidth: 3 },
        indicatorStyle: { lineColor: '#e53935' },
        itemsStyle: { lineColor: '#e53935' },
      },
    ],
  }),
);
simulator.screen.addChild(
  new Scale({
    x: WIDGET_X,
    y: row(5),
    width: 110,
    height: 110,
    mode: 'roundOuter',
    totalTickCount: 9,
    majorTickEvery: 4,
  }),
);

// Row 7: ImageButton — released and pressed, tiled from SVG caps.
function svgSource(markup: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`;
}

function capImages(color: string): { left: string; mid: string; right: string } {
  return {
    left: svgSource(
      `<svg xmlns='http://www.w3.org/2000/svg' width='16' height='32'><path d='M16 0A16 16 0 0 0 16 32Z' fill='${color}'/></svg>`,
    ),
    mid: svgSource(
      `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='32'><rect width='8' height='32' fill='${color}'/></svg>`,
    ),
    right: svgSource(
      `<svg xmlns='http://www.w3.org/2000/svg' width='16' height='32'><path d='M0 0A16 16 0 0 1 0 32Z' fill='${color}'/></svg>`,
    ),
  };
}

const EXPECTED_IMAGE_LOADS = 12;
let loadedImages = 0;
function onImageLoad(): void {
  loadedImages += 1;
  simulator.renderOnce();
  if (loadedImages === EXPECTED_IMAGE_LOADS) {
    window.__ready = true;
  }
}

const imageButtonImages = { released: capImages('#2196f3'), pressed: capImages('#1565c0') };
addLabel(7, 'ImageButton');
simulator.screen.addChild(
  new ImageButton({
    x: WIDGET_X,
    y: row(7),
    width: 90,
    height: 32,
    images: imageButtonImages,
    onLoad: onImageLoad,
  }),
);
simulator.screen.addChild(
  new ImageButton({
    x: WIDGET_X + 110,
    y: row(7),
    width: 120,
    height: 32,
    pressed: true,
    images: imageButtonImages,
    onLoad: onImageLoad,
  }),
);

simulator.renderOnce();
