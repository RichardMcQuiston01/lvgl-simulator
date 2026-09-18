import { describe, expect, it, vi } from 'vitest';
import { LvObject } from './LvObject';

function createFakeContext(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    globalAlpha: 1,
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
    const root = new LvObject({
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      style: { base: { bgColor: '#abcdef' } },
    });

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

    const root = new LvObject({ width: 100, height: 100, style: { base: { bgColor: 'root' } } });
    const first = new LvObject({ width: 10, height: 10, style: { base: { bgColor: 'first' } } });
    const second = new LvObject({ width: 10, height: 10, style: { base: { bgColor: 'second' } } });
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

  it('defaults pressed/disabled/focused to false', () => {
    const object = new LvObject({ width: 10, height: 10 });

    expect(object.pressed).toBe(false);
    expect(object.disabled).toBe(false);
    expect(object.focused).toBe(false);
  });

  it('resolves its style against its own active states', () => {
    const object = new LvObject({
      width: 10,
      height: 10,
      pressed: true,
      style: { base: { bgColor: '#111111' }, states: { pressed: { bgColor: '#222222' } } },
    });

    expect(object.resolvedStyle.bgColor).toBe('#222222');
  });

  it('applies its resolved opacity via globalAlpha only around its own paint', () => {
    const context = createFakeContext();
    const root = new LvObject({
      width: 10,
      height: 10,
      style: { base: { bgColor: '#fff', opa: 128 } },
    });
    const child = new LvObject({ width: 1, height: 1 });
    root.addChild(child);

    root.render(context);

    expect(context.save).toHaveBeenCalledTimes(1);
    expect(context.restore).toHaveBeenCalledTimes(1);
  });

  it('skips the globalAlpha save/restore when fully opaque', () => {
    const context = createFakeContext();
    const root = new LvObject({ width: 10, height: 10 });

    root.render(context);

    expect(context.save).not.toHaveBeenCalled();
    expect(context.restore).not.toHaveBeenCalled();
  });

  it('dispatchEvent() calls listeners subscribed via addEventListener with { target: this }', () => {
    const object = new LvObject({ width: 10, height: 10 });
    const listener = vi.fn();

    object.addEventListener('clicked', listener);
    object.dispatchEvent('clicked');

    expect(listener).toHaveBeenCalledWith({ target: object });
  });

  it('removeEventListener() unsubscribes a listener', () => {
    const object = new LvObject({ width: 10, height: 10 });
    const listener = vi.fn();

    object.addEventListener('clicked', listener);
    object.removeEventListener('clicked', listener);
    object.dispatchEvent('clicked');

    expect(listener).not.toHaveBeenCalled();
  });

  it('only calls listeners subscribed to the dispatched event type', () => {
    const object = new LvObject({ width: 10, height: 10 });
    const clicked = vi.fn();
    const pressed = vi.fn();

    object.addEventListener('clicked', clicked);
    object.addEventListener('pressed', pressed);
    object.dispatchEvent('clicked');

    expect(clicked).toHaveBeenCalledTimes(1);
    expect(pressed).not.toHaveBeenCalled();
  });
});
