import { describe, expect, it } from 'vitest';
import { Button } from '../widgets/Button.js';
import { Checkbox } from '../widgets/Checkbox.js';
import { Container } from '../widgets/Container.js';
import { ImageWidget } from '../widgets/ImageWidget.js';
import { Label } from '../widgets/Label.js';
import { Slider } from '../widgets/Slider.js';
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
