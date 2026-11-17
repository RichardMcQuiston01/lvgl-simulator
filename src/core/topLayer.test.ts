import { describe, expect, it } from 'vitest';
import { hitTest } from '../interaction/hitTest.js';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { LvObject, type LvObjectOptions } from './LvObject.js';

/** Records its name into `log` whenever it paints. */
class Recorder extends LvObject {
  constructor(
    private readonly name: string,
    private readonly log: string[],
    options: LvObjectOptions,
  ) {
    super(options);
  }

  protected override paintSelf(): void {
    this.log.push(this.name);
  }
}

describe('topLayer', () => {
  it('paints a top-layer child after every other object, even later siblings', () => {
    const log: string[] = [];
    const root = new Recorder('root', log, { width: 200, height: 200 });
    const first = new Recorder('first', log, { width: 50, height: 50 });
    const popup = new Recorder('popup', log, { width: 50, height: 50, topLayer: true });
    const later = new Recorder('later', log, { x: 60, width: 50, height: 50 });
    first.addChild(popup);
    root.addChild(first);
    root.addChild(later);

    root.render(createFakeCanvasContext());

    expect(log).toEqual(['root', 'first', 'later', 'popup']);
  });

  it('paints normally when rendered on its own', () => {
    const log: string[] = [];
    const popup = new Recorder('popup', log, { width: 50, height: 50, topLayer: true });

    popup.render(createFakeCanvasContext());

    expect(log).toEqual(['popup']);
  });

  it('paints nested top-layer objects in tree order', () => {
    const log: string[] = [];
    const root = new Recorder('root', log, { width: 200, height: 200 });
    const outer = new Recorder('outer', log, { width: 50, height: 50, topLayer: true });
    const inner = new Recorder('inner', log, { width: 20, height: 20, topLayer: true });
    outer.addChild(inner);
    root.addChild(outer);

    root.render(createFakeCanvasContext());

    expect(log).toEqual(['root', 'outer', 'inner']);
  });

  it('does not paint a hidden top-layer object', () => {
    const log: string[] = [];
    const root = new Recorder('root', log, { width: 200, height: 200 });
    root.addChild(
      new Recorder('popup', log, { width: 50, height: 50, topLayer: true, hidden: true }),
    );

    root.render(createFakeCanvasContext());

    expect(log).toEqual(['root']);
  });

  it('is hit-tested before later siblings that overlap it', () => {
    const root = new LvObject({ width: 200, height: 200 });
    const owner = new LvObject({ width: 50, height: 50 });
    const popup = new LvObject({ x: 0, y: 50, width: 50, height: 80, topLayer: true });
    const later = new LvObject({ x: 0, y: 60, width: 100, height: 100 });
    owner.addChild(popup);
    root.addChild(owner);
    root.addChild(later);

    expect(hitTest(root, 10, 70)).toBe(popup);
    expect(hitTest(root, 80, 70)).toBe(later);
  });
});
