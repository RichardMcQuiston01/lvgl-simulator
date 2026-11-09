import { describe, expect, it } from 'vitest';
import { Arc } from '../widgets/Arc.js';
import { ArcLabel } from '../widgets/ArcLabel.js';
import { Bar } from '../widgets/Bar.js';
import { Button } from '../widgets/Button.js';
import { Checkbox } from '../widgets/Checkbox.js';
import { Container } from '../widgets/Container.js';
import { ImageButton } from '../widgets/ImageButton.js';
import { ImageWidget } from '../widgets/ImageWidget.js';
import { Keyboard } from '../widgets/Keyboard.js';
import { Led } from '../widgets/Led.js';
import { Line } from '../widgets/Line.js';
import { Label } from '../widgets/Label.js';
import { Scale } from '../widgets/Scale.js';
import { Slider } from '../widgets/Slider.js';
import { Span } from '../widgets/Span.js';
import { Spinbox } from '../widgets/Spinbox.js';
import { Spinner } from '../widgets/Spinner.js';
import { Textarea } from '../widgets/Textarea.js';
import { Switch } from '../widgets/Switch.js';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { loadScreen } from './loadScreen.js';
import { SCENE_SCHEMA_VERSION, type Scene, type SceneNode } from './SceneSchema.js';

describe('loadScreen', () => {
  it('throws a descriptive error for an unsupported schema version', () => {
    const scene = { version: 999, width: 10, height: 10 } as unknown as Scene;

    expect(() => loadScreen(scene)).toThrow(/version/i);
    expect(() => loadScreen(scene)).toThrow(/999/);
  });

  it('throws a descriptive error for an unknown node type', () => {
    const scene: Scene = {
      version: SCENE_SCHEMA_VERSION,
      width: 100,
      height: 100,
      children: [{ type: 'not-a-real-widget', width: 10, height: 10 } as unknown as SceneNode],
    };

    expect(() => loadScreen(scene)).toThrow(/Unknown scene node type "not-a-real-widget"/);
  });

  it('builds a Container root sized and styled per the scene', () => {
    const scene: Scene = {
      version: SCENE_SCHEMA_VERSION,
      width: 320,
      height: 240,
      style: { base: { bgColor: '#ff0000' } },
      padding: 10,
    };

    const root = loadScreen(scene);

    expect(root).toBeInstanceOf(Container);
    expect(root.width).toBe(320);
    expect(root.height).toBe(240);
    expect(root.resolvedStyle.bgColor).toBe('#ff0000');
  });

  it('applies the root layout to its direct children', () => {
    const scene: Scene = {
      version: SCENE_SCHEMA_VERSION,
      width: 100,
      height: 20,
      layout: { type: 'flex', columnGap: 5 },
      children: [
        { type: 'label', width: 10, height: 10, text: 'A' },
        { type: 'label', width: 10, height: 10, text: 'B' },
      ],
    };

    const root = loadScreen(scene);
    const context = createFakeCanvasContext();
    root.render(context);

    const [first, second] = root.children as readonly Label[];
    expect(first?.x).toBe(0);
    expect(second?.x).toBe(15);
  });

  it('builds nested containers with their own layout and children, in order', () => {
    const scene: Scene = {
      version: SCENE_SCHEMA_VERSION,
      width: 200,
      height: 100,
      children: [
        {
          type: 'container',
          width: 100,
          height: 50,
          layout: { type: 'flex', direction: 'column', rowGap: 2 },
          children: [
            { type: 'label', width: 10, height: 10, text: 'first' },
            { type: 'label', width: 10, height: 10, text: 'second' },
          ],
        },
      ],
    };

    const root = loadScreen(scene);
    const nested = root.children[0];
    expect(nested).toBeInstanceOf(Container);

    const context = createFakeCanvasContext();
    root.render(context);

    const [first, second] = nested?.children as readonly Label[];
    expect(first?.text).toBe('first');
    expect(second?.y).toBe(12);
  });

  it('builds each widget type with its own fields', () => {
    const scene: Scene = {
      version: SCENE_SCHEMA_VERSION,
      width: 300,
      height: 300,
      children: [
        { type: 'label', width: 10, height: 10, text: 'hello' },
        { type: 'button', width: 10, height: 10, text: 'click', backgroundColor: '#111111' },
        { type: 'checkbox', width: 10, height: 10, checked: true, text: 'check' },
        { type: 'switch', width: 10, height: 10, checked: true },
        { type: 'slider', width: 10, height: 10, min: 0, max: 200, value: 50 },
        { type: 'image', width: 10, height: 10, src: 'icon.png' },
      ],
    };

    const root = loadScreen(scene);
    const [label, button, checkbox, toggle, slider, image] = root.children;

    expect(label).toBeInstanceOf(Label);
    expect((label as Label).text).toBe('hello');

    expect(button).toBeInstanceOf(Button);
    expect((button as Button).text).toBe('click');
    expect((button as Button).resolvedStyle.bgColor).toBe('#111111');

    expect(checkbox).toBeInstanceOf(Checkbox);
    expect((checkbox as Checkbox).checked).toBe(true);
    expect((checkbox as Checkbox).text).toBe('check');

    expect(toggle).toBeInstanceOf(Switch);
    expect((toggle as Switch).checked).toBe(true);

    expect(slider).toBeInstanceOf(Slider);
    expect((slider as Slider).min).toBe(0);
    expect((slider as Slider).max).toBe(200);
    expect((slider as Slider).value).toBe(50);

    expect(image).toBeInstanceOf(ImageWidget);
  });

  it('passes through flexGrow and grid placement hints to child widgets', () => {
    const scene: Scene = {
      version: SCENE_SCHEMA_VERSION,
      width: 100,
      height: 20,
      children: [{ type: 'label', width: 10, height: 10, text: 'x', flexGrow: 2, gridColumn: 1 }],
    };

    const root = loadScreen(scene);
    const [label] = root.children;

    expect(label?.flexGrow).toBe(2);
    expect(label?.gridColumn).toBe(1);
  });

  it('renders a hand-written fixture scene end to end with no manual widget wiring', () => {
    // Everything below comes from one loadScreen() call — no `new Button()`,
    // `new Label()`, or `addChild()` calls anywhere in this test.
    const fixtureScene: Scene = {
      version: SCENE_SCHEMA_VERSION,
      width: 240,
      height: 80,
      padding: 8,
      layout: { type: 'flex', direction: 'column', rowGap: 8 },
      children: [
        { type: 'label', width: 200, height: 16, text: 'Fixture screen' },
        {
          type: 'container',
          width: 200,
          height: 32,
          layout: { type: 'flex', columnGap: 8 },
          children: [
            { type: 'button', width: 80, height: 32, text: 'OK' },
            { type: 'checkbox', width: 100, height: 20, text: 'Agree', checked: false },
          ],
        },
      ],
    };

    const root = loadScreen(fixtureScene);
    const context = createFakeCanvasContext();

    root.render(context);

    expect(context.fillText).toHaveBeenCalledWith(
      'Fixture screen',
      expect.any(Number),
      expect.any(Number),
    );
    expect(context.fillText).toHaveBeenCalledWith('OK', expect.any(Number), expect.any(Number));
    expect(context.fillText).toHaveBeenCalledWith('Agree', expect.any(Number), expect.any(Number));
    expect(context.fill).toHaveBeenCalled(); // the button's rounded rect
  });
});

describe('loadScreen W1 widgets', () => {
  function loadOne(node: SceneNode): unknown {
    const scene: Scene = {
      version: SCENE_SCHEMA_VERSION,
      width: 300,
      height: 300,
      children: [node],
    };
    return loadScreen(scene).children[0];
  }

  it('builds a Bar with its range, mode and orientation', () => {
    const bar = loadOne({
      type: 'bar',
      width: 100,
      height: 10,
      min: -50,
      max: 50,
      value: 20,
      mode: 'symmetrical',
      orientation: 'horizontal',
    });
    expect(bar).toBeInstanceOf(Bar);
    expect(bar).toMatchObject({ min: -50, max: 50, value: 20, mode: 'symmetrical' });
  });

  it('builds an Arc with its angles and rotation', () => {
    const arc = loadOne({
      type: 'arc',
      width: 100,
      height: 100,
      value: 30,
      bgStartAngle: 90,
      bgEndAngle: 360,
      rotation: 10,
    });
    expect(arc).toBeInstanceOf(Arc);
    expect(arc).toMatchObject({ value: 30, bgStartAngle: 90, bgEndAngle: 360, rotation: 10 });
  });

  it('builds a Spinner, a Led and a Scale', () => {
    expect(
      loadOne({ type: 'spinner', width: 40, height: 40, spinTimeMs: 500, arcLengthDegrees: 90 }),
    ).toMatchObject({ spinTimeMs: 500, arcLengthDegrees: 90 });
    expect(loadOne({ type: 'spinner', width: 40, height: 40 })).toBeInstanceOf(Spinner);

    const led = loadOne({ type: 'led', width: 16, height: 16, color: '#00ff00', brightness: 120 });
    expect(led).toBeInstanceOf(Led);
    expect(led).toMatchObject({ color: '#00ff00', brightness: 120 });

    const scale = loadOne({
      type: 'scale',
      width: 200,
      height: 40,
      mode: 'horizontalTop',
      min: 10,
      max: 20,
      totalTickCount: 6,
      labels: ['a', 'b'],
      sections: [{ min: 15, max: 20, mainStyle: { lineColor: '#ff0000' } }],
    });
    expect(scale).toBeInstanceOf(Scale);
    expect(scale).toMatchObject({ mode: 'horizontalTop', min: 10, max: 20, totalTickCount: 6 });
    expect((scale as Scale).sections).toHaveLength(1);
  });

  it('builds a Line that sizes itself to its points when no size is given', () => {
    const line = loadOne({
      type: 'line',
      points: [
        { x: 0, y: 0 },
        { x: 60, y: 30 },
      ],
      yInvert: true,
    });
    expect(line).toBeInstanceOf(Line);
    expect(line).toMatchObject({ width: 60, height: 30, yInvert: true });
  });

  it('builds an ImageButton with its flags', () => {
    const button = loadOne({
      type: 'imagebutton',
      width: 80,
      height: 30,
      checkable: true,
      checked: true,
      images: { released: { mid: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' } },
    });
    expect(button).toBeInstanceOf(ImageButton);
    expect(button).toMatchObject({ checkable: true, checked: true });
  });

  it('names the new types in the unknown-type error', () => {
    const scene: Scene = {
      version: SCENE_SCHEMA_VERSION,
      width: 10,
      height: 10,
      children: [{ type: 'nope', width: 1, height: 1 } as unknown as SceneNode],
    };
    expect(() => loadScreen(scene)).toThrow(/spinner, led, line, scale, imagebutton/);
  });

  it('renders every W1 widget without throwing', () => {
    const scene: Scene = {
      version: SCENE_SCHEMA_VERSION,
      width: 300,
      height: 300,
      children: [
        { type: 'bar', width: 100, height: 10, value: 40 },
        { type: 'arc', width: 80, height: 80, value: 40 },
        { type: 'spinner', width: 40, height: 40 },
        { type: 'led', width: 16, height: 16 },
        {
          type: 'line',
          points: [
            { x: 0, y: 0 },
            { x: 20, y: 20 },
          ],
        },
        { type: 'scale', width: 200, height: 40 },
        { type: 'imagebutton', width: 80, height: 30 },
      ],
    };
    expect(() => loadScreen(scene).render(createFakeCanvasContext())).not.toThrow();
  });
});

describe('loadScreen W2 widgets', () => {
  function loadOne(node: SceneNode): unknown {
    const scene: Scene = {
      version: SCENE_SCHEMA_VERSION,
      width: 400,
      height: 400,
      children: [node],
    };
    return loadScreen(scene).children[0];
  }

  it('builds a Textarea with its text and editing options', () => {
    const textarea = loadOne({
      type: 'textarea',
      width: 200,
      height: 40,
      text: 'hi',
      placeholder: 'Name',
      oneLine: true,
      passwordMode: true,
      maxLength: 8,
      acceptedChars: 'abc',
    });
    expect(textarea).toBeInstanceOf(Textarea);
    expect(textarea).toMatchObject({
      text: 'hi',
      placeholder: 'Name',
      oneLine: true,
      passwordMode: true,
    });
  });

  it('builds a Keyboard with no target, and one that can be given a target afterwards', () => {
    const keyboard = loadOne({
      type: 'keyboard',
      width: 320,
      height: 160,
      mode: 'number',
      gap: 2,
    });
    expect(keyboard).toBeInstanceOf(Keyboard);
    expect(keyboard).toMatchObject({ mode: 'number', gap: 2, target: undefined });
  });

  it('builds a Spinbox', () => {
    const spinbox = loadOne({
      type: 'spinbox',
      width: 120,
      height: 40,
      value: 250,
      min: 0,
      max: 500,
      digitCount: 4,
      decimalDigits: 1,
      step: 10,
      rollover: true,
    });
    expect(spinbox).toBeInstanceOf(Spinbox);
    expect(spinbox).toMatchObject({
      value: 250,
      max: 500,
      digitCount: 4,
      step: 10,
      rollover: true,
    });
    expect((spinbox as Spinbox).text).toBe('025.0');
  });

  it('builds a Span with its runs', () => {
    const span = loadOne({
      type: 'span',
      width: 200,
      height: 40,
      spans: [
        { text: 'a', style: { textColor: '#ff0000', textDecor: 'underline' } },
        { text: 'b' },
      ],
      mode: 'fixed',
      overflow: 'ellipsis',
      maxLines: 2,
    });
    expect(span).toBeInstanceOf(Span);
    expect(span).toMatchObject({ mode: 'fixed', overflow: 'ellipsis', maxLines: 2 });
    expect((span as Span).spans).toHaveLength(2);
    expect((span as Span).text).toBe('ab');
  });

  it('builds an ArcLabel', () => {
    const arcLabel = loadOne({
      type: 'arclabel',
      width: 200,
      height: 200,
      text: 'Hello',
      radius: 80,
      startAngle: 200,
      sweepAngle: 140,
      direction: 'counterClockwise',
      align: 'left',
      verticalAlign: 'inside',
    });
    expect(arcLabel).toBeInstanceOf(ArcLabel);
    expect(arcLabel).toMatchObject({
      text: 'Hello',
      radius: 80,
      startAngle: 200,
      direction: 'counterClockwise',
      verticalAlign: 'inside',
    });
  });

  it('names the new types in the unknown-type error', () => {
    const scene: Scene = {
      version: SCENE_SCHEMA_VERSION,
      width: 10,
      height: 10,
      children: [{ type: 'nope', width: 1, height: 1 } as unknown as SceneNode],
    };
    expect(() => loadScreen(scene)).toThrow(/textarea, keyboard, spinbox, span, arclabel/);
  });

  it('renders every W2 widget without throwing', () => {
    const scene: Scene = {
      version: SCENE_SCHEMA_VERSION,
      width: 400,
      height: 400,
      children: [
        { type: 'textarea', width: 200, height: 40, text: 'hello' },
        { type: 'keyboard', width: 320, height: 120 },
        { type: 'spinbox', width: 120, height: 40 },
        { type: 'span', width: 200, height: 40, spans: [{ text: 'rich text' }] },
        { type: 'arclabel', width: 200, height: 200, text: 'curved' },
      ],
    };
    expect(() => loadScreen(scene).render(createFakeCanvasContext())).not.toThrow();
  });
});
