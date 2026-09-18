import { describe, expect, it, vi } from 'vitest';
import { LvObject } from './LvObject';

function createFakeContext(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    fillRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('LvObject', () => {
  it('tracks parent/child relationships', () => {
    const parent = new LvObject({ width: 100, height: 100 });
    const child = new LvObject({ width: 10, height: 10 });

    parent.addChild(child);

    expect(child.parent).toBe(parent);
    expect(parent.children).toEqual([child]);
  });

  it('detaches from a previous parent when re-added elsewhere', () => {
    const parentA = new LvObject({ width: 100, height: 100 });
    const parentB = new LvObject({ width: 100, height: 100 });
    const child = new LvObject({ width: 10, height: 10 });

    parentA.addChild(child);
    parentB.addChild(child);

    expect(parentA.children).toEqual([]);
    expect(parentB.children).toEqual([child]);
    expect(child.parent).toBe(parentB);
  });

  it('removeChild is a no-op for a non-child', () => {
    const parent = new LvObject({ width: 100, height: 100 });
    const stranger = new LvObject({ width: 10, height: 10 });

    expect(() => parent.removeChild(stranger)).not.toThrow();
    expect(parent.children).toEqual([]);
  });

  it('sums ancestor offsets for the absolute position', () => {
    const root = new LvObject({ x: 10, y: 20, width: 100, height: 100 });
    const child = new LvObject({ x: 5, y: 6, width: 10, height: 10 });
    const grandchild = new LvObject({ x: 1, y: 2, width: 4, height: 4 });

    root.addChild(child);
    child.addChild(grandchild);

    expect(grandchild.getAbsolutePosition()).toEqual({ x: 16, y: 28 });
  });

  it('fills its background at its absolute position', () => {
    const context = createFakeContext();
    const root = new LvObject({ x: 10, y: 20, width: 100, height: 50, backgroundColor: '#abcdef' });

    root.render(context);

    expect(context.fillStyle).toBe('#abcdef');
    expect(context.fillRect).toHaveBeenCalledWith(10, 20, 100, 50);
  });

  it('skips filling when no background color is set', () => {
    const context = createFakeContext();
    const root = new LvObject({ width: 100, height: 50 });

    root.render(context);

    expect(context.fillRect).not.toHaveBeenCalled();
  });

  it('renders children after itself, in insertion order', () => {
    const context = createFakeContext();
    const calls: string[] = [];
    (context.fillRect as ReturnType<typeof vi.fn>).mockImplementation(() => {
      calls.push(context.fillStyle as string);
    });

    const root = new LvObject({ width: 100, height: 100, backgroundColor: 'root' });
    const first = new LvObject({ width: 10, height: 10, backgroundColor: 'first' });
    const second = new LvObject({ width: 10, height: 10, backgroundColor: 'second' });
    root.addChild(first);
    root.addChild(second);

    root.render(context);

    expect(calls).toEqual(['root', 'first', 'second']);
  });

  it('runs updateLayout, then paintSelf, then children, on every render (subclass hook order)', () => {
    const context = createFakeContext();
    const calls: string[] = [];

    class RecordingObject extends LvObject {
      protected override updateLayout(): void {
        calls.push('updateLayout');
      }
      protected override paintSelf(): void {
        calls.push('paintSelf');
      }
    }

    const root = new RecordingObject({ width: 10, height: 10 });
    const child = new LvObject({ width: 1, height: 1 });
    root.addChild(child);

    root.render(context);

    expect(calls).toEqual(['updateLayout', 'paintSelf']);
  });

  it('carries optional flex/grid layout hints as plain fields', () => {
    const child = new LvObject({
      width: 10,
      height: 10,
      flexGrow: 2,
      gridColumn: 1,
      gridRow: 2,
      gridColumnSpan: 3,
      gridRowSpan: 4,
    });

    expect(child.flexGrow).toBe(2);
    expect(child.gridColumn).toBe(1);
    expect(child.gridRow).toBe(2);
    expect(child.gridColumnSpan).toBe(3);
    expect(child.gridRowSpan).toBe(4);
  });
});
