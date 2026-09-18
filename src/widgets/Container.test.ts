import { describe, expect, it } from 'vitest';
import { LvObject } from '../core/LvObject';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext';
import { Container } from './Container';

describe('Container', () => {
  it('leaves children at their manually-set position when no layout is given', () => {
    const context = createFakeCanvasContext();
    const container = new Container({ width: 100, height: 100 });
    const child = new LvObject({ x: 5, y: 6, width: 10, height: 10 });
    container.addChild(child);

    container.render(context);

    expect(child.x).toBe(5);
    expect(child.y).toBe(6);
  });

  it('applies a flex layout to its children', () => {
    const context = createFakeCanvasContext();
    const container = new Container({
      width: 100,
      height: 20,
      layout: { type: 'flex', columnGap: 5 },
    });
    const a = new LvObject({ width: 10, height: 10 });
    const b = new LvObject({ width: 10, height: 10 });
    container.addChild(a);
    container.addChild(b);

    container.render(context);

    expect(a.x).toBe(0);
    expect(b.x).toBe(15);
  });

  it('applies a grid layout to its children', () => {
    const context = createFakeCanvasContext();
    const container = new Container({
      width: 100,
      height: 20,
      layout: { type: 'grid', columns: [40, 60], rows: [20] },
    });
    const a = new LvObject({ width: 0, height: 0 });
    const b = new LvObject({ width: 0, height: 0 });
    container.addChild(a);
    container.addChild(b);

    container.render(context);

    expect(a.x).toBe(0);
    expect(b.x).toBe(40);
    expect(b.width).toBe(60);
  });

  it('insets the content area by padding before running layout', () => {
    const context = createFakeCanvasContext();
    const container = new Container({
      width: 100,
      height: 20,
      padding: 10,
      layout: { type: 'flex' },
    });
    const a = new LvObject({ width: 10, height: 10 });
    container.addChild(a);

    container.render(context);

    expect(a.x).toBe(10);
    expect(a.y).toBe(10);
  });

  it('supports per-side padding via style.base', () => {
    const context = createFakeCanvasContext();
    const container = new Container({
      width: 100,
      height: 100,
      style: { base: { padTop: 1, padRight: 2, padBottom: 3, padLeft: 4 } },
      layout: { type: 'flex' },
    });
    const a = new LvObject({ width: 10, height: 10 });
    container.addChild(a);

    container.render(context);

    expect(a.x).toBe(4);
    expect(a.y).toBe(1);
  });

  it('prefers explicit per-side style padding over the padding convenience option', () => {
    const context = createFakeCanvasContext();
    const container = new Container({
      width: 100,
      height: 100,
      padding: 20,
      style: { base: { padTop: 1, padRight: 1, padBottom: 1, padLeft: 1 } },
      layout: { type: 'flex' },
    });
    const a = new LvObject({ width: 10, height: 10 });
    container.addChild(a);

    container.render(context);

    expect(a.x).toBe(1);
    expect(a.y).toBe(1);
  });
});
