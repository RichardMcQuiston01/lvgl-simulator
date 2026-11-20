import { describe, expect, it } from 'vitest';
import {
  constrainPosition,
  positionAfterDrag,
  selectedAt,
  settleTarget,
  visibleSlots,
  wrapIndex,
} from './rollerMath.js';

describe('wrapIndex', () => {
  it('wraps both ways', () => {
    expect(wrapIndex(0, 5)).toBe(0);
    expect(wrapIndex(5, 5)).toBe(0);
    expect(wrapIndex(7, 5)).toBe(2);
    expect(wrapIndex(-1, 5)).toBe(4);
    expect(wrapIndex(-11, 5)).toBe(4);
  });

  it('returns 0 for no options', () => {
    expect(wrapIndex(3, 0)).toBe(0);
  });
});

describe('constrainPosition', () => {
  it('clamps to the options unless infinite', () => {
    expect(constrainPosition(-2, 5, false)).toBe(0);
    expect(constrainPosition(9, 5, false)).toBe(4);
    expect(constrainPosition(2.5, 5, false)).toBe(2.5);
    expect(constrainPosition(-2, 5, true)).toBe(-2);
    expect(constrainPosition(9, 0, false)).toBe(0);
  });
});

describe('selectedAt', () => {
  it('picks the nearest option', () => {
    expect(selectedAt(1.4, 5, false)).toBe(1);
    expect(selectedAt(1.6, 5, false)).toBe(2);
    expect(selectedAt(-0.4, 5, false)).toBe(0);
    expect(selectedAt(7.2, 5, false)).toBe(4);
  });

  it('wraps when infinite', () => {
    expect(selectedAt(5.2, 5, true)).toBe(0);
    expect(selectedAt(-0.8, 5, true)).toBe(4);
  });
});

describe('positionAfterDrag', () => {
  it('moves up through the options as the pointer drags up', () => {
    expect(positionAfterDrag(2, -60, 30, 10, false)).toBe(4);
    expect(positionAfterDrag(2, 30, 30, 10, false)).toBe(1);
  });

  it('stops at the ends unless infinite', () => {
    expect(positionAfterDrag(0, 90, 30, 10, false)).toBe(0);
    expect(positionAfterDrag(9, -90, 30, 10, false)).toBe(9);
    expect(positionAfterDrag(0, 90, 30, 10, true)).toBe(-3);
  });

  it('ignores a zero row height', () => {
    expect(positionAfterDrag(3, 50, 0, 10, false)).toBe(3);
  });
});

describe('settleTarget', () => {
  it('snaps to the nearest row without velocity', () => {
    expect(settleTarget(2.4, 0, 250, 10, false)).toBe(2);
    expect(settleTarget(2.6, 0, 250, 10, false)).toBe(3);
  });

  it('coasts in the direction of the velocity, within the options', () => {
    expect(settleTarget(2, 0.004, 250, 10, false)).toBe(3);
    expect(settleTarget(2, -0.02, 250, 10, false)).toBe(0);
    expect(settleTarget(8, 0.02, 250, 10, false)).toBe(9);
  });

  it('may coast past the ends when infinite', () => {
    expect(settleTarget(8, 0.02, 250, 10, true)).toBe(13);
  });
});

describe('visibleSlots', () => {
  it('lists the rows around the position with one spare each side', () => {
    const slots = visibleSlots(3, 3, 10, false);
    expect(slots.map((slot) => slot.optionIndex)).toEqual([1, 2, 3, 4, 5]);
    expect(slots.map((slot) => slot.offset)).toEqual([-2, -1, 0, 1, 2]);
  });

  it('keeps fractional offsets while between rows', () => {
    const slots = visibleSlots(3.25, 3, 10, false);
    expect(slots.find((slot) => slot.optionIndex === 3)?.offset).toBeCloseTo(-0.25);
  });

  it('leaves out rows beyond the ends unless infinite', () => {
    expect(visibleSlots(0, 3, 10, false).map((slot) => slot.optionIndex)).toEqual([0, 1, 2]);
    expect(visibleSlots(0, 3, 10, true).map((slot) => slot.optionIndex)).toEqual([8, 9, 0, 1, 2]);
  });

  it('wraps option indices around a short list when infinite', () => {
    expect(visibleSlots(0, 3, 2, true).map((slot) => slot.optionIndex)).toEqual([0, 1, 0, 1, 0]);
  });

  it('has nothing to show without options', () => {
    expect(visibleSlots(0, 3, 0, true)).toEqual([]);
  });
});
