import { describe, expect, it, vi } from 'vitest';
import { LvObject } from '../core/LvObject.js';
import { attachKeyboard, FocusGroup } from './FocusGroup.js';

function makeObjects(count: number): LvObject[] {
  return Array.from({ length: count }, () => new LvObject({ width: 10, height: 10 }));
}

describe('FocusGroup', () => {
  it('focuses the first added object and flips the focused state', () => {
    const [a, b] = makeObjects(2) as [LvObject, LvObject];
    const group = new FocusGroup();
    const focused = vi.fn();
    a.addEventListener('focused', focused);
    group.add(a);
    group.add(b);
    expect(group.focusedItem).toBe(a);
    expect(a.focused).toBe(true);
    expect(b.focused).toBe(false);
    expect(focused).toHaveBeenCalledTimes(1);
  });

  it('moves focus with defocused then focused events, wrapping by default', () => {
    const [a, b, c] = makeObjects(3) as [LvObject, LvObject, LvObject];
    const group = new FocusGroup();
    [a, b, c].forEach((o) => group.add(o));
    const order: string[] = [];
    a.addEventListener('defocused', () => order.push('a-defocused'));
    b.addEventListener('focused', () => order.push('b-focused'));

    group.focusNext();
    expect(order).toEqual(['a-defocused', 'b-focused']);
    group.focusNext();
    group.focusNext();
    expect(group.focusedItem).toBe(a);
    group.focusPrev();
    expect(group.focusedItem).toBe(c);
  });

  it('stops at the ends when wrap is off', () => {
    const [a, b] = makeObjects(2) as [LvObject, LvObject];
    const group = new FocusGroup({ wrap: false });
    group.add(a);
    group.add(b);
    expect(group.focusPrev()).toBe(false);
    expect(group.focusNext()).toBe(true);
    expect(group.focusNext()).toBe(false);
    expect(group.focusedItem).toBe(b);
  });

  it('skips disabled and hidden objects', () => {
    const [a, b, c, d] = makeObjects(4) as [LvObject, LvObject, LvObject, LvObject];
    const group = new FocusGroup();
    [a, b, c, d].forEach((o) => group.add(o));
    b.disabled = true;
    c.hidden = true;
    group.focusNext();
    expect(group.focusedItem).toBe(d);
  });

  it('moves focus off a removed object', () => {
    const [a, b] = makeObjects(2) as [LvObject, LvObject];
    const group = new FocusGroup();
    group.add(a);
    group.add(b);
    group.remove(a);
    expect(a.focused).toBe(false);
    expect(group.focusedItem).toBe(b);
  });

  it('keypad mode: Tab navigates, other keys and Enter reach the object', () => {
    const [a, b] = makeObjects(2) as [LvObject, LvObject];
    const group = new FocusGroup();
    group.add(a);
    group.add(b);
    const keys = vi.fn();
    const clicked = vi.fn();
    a.addEventListener('key', keys);
    a.addEventListener('clicked', clicked);

    expect(group.handleKey('ArrowRight')).toBe(true);
    expect(keys).toHaveBeenCalledWith({ key: 'ArrowRight', target: a });
    expect(group.focusedItem).toBe(a);

    group.handleKey('Enter');
    expect(clicked).toHaveBeenCalledTimes(1);

    group.handleKey('Tab');
    expect(group.focusedItem).toBe(b);
    group.handleKey('Tab', true);
    expect(group.focusedItem).toBe(a);
  });

  it('encoder mode: arrows navigate until Enter enters edit mode on an editable object', () => {
    const a = new LvObject({ width: 10, height: 10, editable: true });
    const b = new LvObject({ width: 10, height: 10 });
    const group = new FocusGroup({ mode: 'encoder' });
    group.add(a);
    group.add(b);
    const keys = vi.fn();
    a.addEventListener('key', keys);

    group.handleKey('Enter');
    expect(group.editing).toBe(true);
    group.handleKey('ArrowRight');
    expect(keys).toHaveBeenCalledWith({ key: 'ArrowRight', target: a });
    expect(group.focusedItem).toBe(a);

    group.handleKey('Escape');
    expect(group.editing).toBe(false);
    group.handleKey('ArrowRight');
    expect(group.focusedItem).toBe(b);
  });

  it('returns false for keys when nothing is focused', () => {
    expect(new FocusGroup().handleKey('a')).toBe(false);
  });
});

describe('attachKeyboard', () => {
  function fakeTarget(): {
    target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
    fire(event: Partial<KeyboardEvent>): void;
    removed: () => boolean;
  } {
    let handler: ((event: Event) => void) | null = null;
    return {
      target: {
        addEventListener: (_type: string, listener: unknown) => {
          handler = listener as (event: Event) => void;
        },
        removeEventListener: () => {
          handler = null;
        },
      },
      fire: (event) => handler?.(event as Event),
      removed: () => handler === null,
    };
  }

  it('routes keydown into the group, preventing default and rendering when consumed', () => {
    const [a, b] = makeObjects(2) as [LvObject, LvObject];
    const group = new FocusGroup();
    group.add(a);
    group.add(b);
    const { target, fire, removed } = fakeTarget();
    const render = vi.fn();
    const preventDefault = vi.fn();
    const keyboard = attachKeyboard(target, group, render);

    fire({ key: 'Tab', shiftKey: false, preventDefault });
    expect(group.focusedItem).toBe(b);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);

    fire({ key: 'Tab', ctrlKey: true, preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);

    keyboard.dispose();
    expect(removed()).toBe(true);
  });
});
