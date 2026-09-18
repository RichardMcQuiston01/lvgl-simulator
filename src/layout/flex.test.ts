import { describe, expect, it } from 'vitest';
import { LvObject } from '../core/LvObject';
import { applyFlexLayout } from './flex';

function box(width: number, height: number, flexGrow?: number): LvObject {
  return new LvObject({ width, height, flexGrow });
}

describe('applyFlexLayout', () => {
  it('lays out a row left-to-right with a column gap', () => {
    const a = box(10, 10);
    const b = box(20, 10);

    applyFlexLayout([a, b], 100, 50, { type: 'flex', columnGap: 5 });

    expect(a.x).toBe(0);
    expect(b.x).toBe(15);
    expect(a.y).toBe(0);
    expect(b.y).toBe(0);
  });

  it('lays out a column top-to-bottom with a row gap', () => {
    const a = box(10, 10);
    const b = box(10, 20);

    applyFlexLayout([a, b], 50, 100, { type: 'flex', direction: 'column', rowGap: 5 });

    expect(a.y).toBe(0);
    expect(b.y).toBe(15);
    expect(a.x).toBe(0);
    expect(b.x).toBe(0);
  });

  it('wraps onto a new line when children exceed the content main size', () => {
    const a = box(60, 10);
    const b = box(60, 10);

    applyFlexLayout([a, b], 100, 100, { type: 'flex', wrap: 'wrap', rowGap: 4 });

    expect(a.y).toBe(0);
    expect(b.y).toBe(14);
    expect(b.x).toBe(0);
  });

  it('does not wrap when wrap is nowrap, even if children overflow', () => {
    const a = box(60, 10);
    const b = box(60, 10);

    applyFlexLayout([a, b], 100, 100, { type: 'flex' });

    expect(a.y).toBe(0);
    expect(b.y).toBe(0);
    expect(b.x).toBe(60);
  });

  it('centers children on the main axis', () => {
    const a = box(10, 10);
    const b = box(10, 10);

    applyFlexLayout([a, b], 100, 10, { type: 'flex', mainAlign: 'center' });

    expect(a.x).toBe(40);
    expect(b.x).toBe(50);
  });

  it('pushes children to the end of the main axis', () => {
    const a = box(10, 10);

    applyFlexLayout([a], 100, 10, { type: 'flex', mainAlign: 'end' });

    expect(a.x).toBe(90);
  });

  it('distributes space-between along the main axis', () => {
    const a = box(10, 10);
    const b = box(10, 10);
    const c = box(10, 10);

    applyFlexLayout([a, b, c], 100, 10, { type: 'flex', mainAlign: 'space_between' });

    expect(a.x).toBe(0);
    expect(b.x).toBe(45);
    expect(c.x).toBe(90);
  });

  it('aligns a child to the center of the cross axis', () => {
    const a = box(10, 10);

    applyFlexLayout([a], 100, 50, { type: 'flex', crossAlign: 'center' });

    expect(a.y).toBe(20);
  });

  it('aligns a child to the end of the cross axis', () => {
    const a = box(10, 10);

    applyFlexLayout([a], 100, 50, { type: 'flex', crossAlign: 'end' });

    expect(a.y).toBe(40);
  });

  it('grows children by flexGrow to fill remaining main-axis space', () => {
    const a = box(10, 10, 1);
    const b = box(10, 10, 3);

    applyFlexLayout([a, b], 100, 10, { type: 'flex' });

    expect(a.width).toBe(30);
    expect(b.width).toBe(70);
    expect(a.x).toBe(0);
    expect(b.x).toBe(30);
  });

  it('grows the cross-axis dimension when the direction is column', () => {
    const a = box(10, 10, 1);

    applyFlexLayout([a], 10, 100, { type: 'flex', direction: 'column' });

    expect(a.height).toBe(100);
  });

  it('leaves children unchanged when there is no free space to distribute', () => {
    const a = box(50, 10, 1);
    const b = box(60, 10);

    applyFlexLayout([a, b], 100, 10, { type: 'flex' });

    expect(a.width).toBe(50);
    expect(b.width).toBe(60);
  });
});
