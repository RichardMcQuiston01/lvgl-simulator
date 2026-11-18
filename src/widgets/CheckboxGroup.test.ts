import { describe, expect, it, vi } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { Checkbox } from './Checkbox.js';
import { CheckboxGroup } from './CheckboxGroup.js';

function radios(
  count: number,
  options: { allowUncheck?: boolean } = {},
): {
  group: CheckboxGroup;
  boxes: Checkbox[];
} {
  const group = new CheckboxGroup(options);
  const boxes = Array.from(
    { length: count },
    (_, index) => new Checkbox({ width: 100, height: 20, text: `Option ${index}`, group }),
  );
  return { group, boxes };
}

describe('CheckboxGroup', () => {
  it('tracks its members and the checked one', () => {
    const { group, boxes } = radios(3);
    expect(group.checkboxes).toEqual(boxes);
    expect(group.checked).toBeUndefined();
    boxes[1]?.setChecked(true);
    expect(group.checked).toBe(boxes[1]);
  });

  it('unchecks the others when one is clicked, reporting each change', () => {
    const { boxes } = radios(3);
    const listeners = boxes.map((box) => {
      const listener = vi.fn();
      box.addEventListener('valueChanged', listener);
      return listener;
    });
    boxes[0]?.dispatchEvent('clicked');
    boxes[2]?.dispatchEvent('clicked');
    expect(boxes.map((box) => box.checked)).toEqual([false, false, true]);
    expect(listeners.map((listener) => listener.mock.calls.length)).toEqual([2, 0, 1]);
  });

  it('keeps a clicked checked radio checked, without an event', () => {
    const { boxes } = radios(2);
    boxes[0]?.dispatchEvent('clicked');
    const listener = vi.fn();
    boxes[0]?.addEventListener('valueChanged', listener);
    boxes[0]?.dispatchEvent('clicked');
    expect(boxes[0]?.checked).toBe(true);
    expect(listener).not.toHaveBeenCalled();
  });

  it('lets the checked radio be unchecked with allowUncheck', () => {
    const { group, boxes } = radios(2, { allowUncheck: true });
    boxes[0]?.dispatchEvent('clicked');
    boxes[0]?.dispatchEvent('clicked');
    expect(group.checked).toBeUndefined();
  });

  it('enforces exclusivity for setChecked too', () => {
    const { boxes } = radios(2);
    boxes[0]?.setChecked(true);
    expect(boxes[1]?.setChecked(true)).toBe(true);
    expect(boxes.map((box) => box.checked)).toEqual([false, true]);
    expect(boxes[1]?.setChecked(false)).toBe(false);
    expect(boxes[1]?.setChecked(true)).toBe(false);
  });

  it('moves a checkbox from its old group when added to another', () => {
    const first = new CheckboxGroup();
    const second = new CheckboxGroup();
    const box = new Checkbox({ width: 100, height: 20, group: first });
    second.add(box);
    expect(first.has(box)).toBe(false);
    expect(second.has(box)).toBe(true);
    expect(box.group).toBe(second);
    second.add(box);
    expect(second.checkboxes).toEqual([box]);
  });

  it('unchecks a checked newcomer when the group already has a checked member', () => {
    const { group, boxes } = radios(1);
    boxes[0]?.setChecked(true);
    const late = new Checkbox({ width: 100, height: 20, checked: true });
    group.add(late);
    expect(late.checked).toBe(false);
    expect(group.checked).toBe(boxes[0]);
  });

  it('removes a member, leaving it an ordinary checkbox', () => {
    const { group, boxes } = radios(2);
    const first = boxes[0];
    if (!first) {
      throw new Error('missing checkbox');
    }
    group.remove(first);
    group.remove(first);
    expect(first.group).toBeUndefined();
    first.dispatchEvent('clicked');
    first.dispatchEvent('clicked');
    expect(first.checked).toBe(false);
  });

  it('draws a round indicator, with a filled dot when checked', () => {
    const { boxes } = radios(1);
    const unchecked = createFakeCanvasContext();
    boxes[0]?.render(unchecked);
    expect(unchecked.arc).toHaveBeenCalledTimes(1);
    expect(unchecked.fill).not.toHaveBeenCalled();

    boxes[0]?.setChecked(true);
    const checked = createFakeCanvasContext();
    boxes[0]?.render(checked);
    expect(checked.arc).toHaveBeenCalledTimes(2);
    expect(checked.fill).toHaveBeenCalledTimes(1);
  });
});
