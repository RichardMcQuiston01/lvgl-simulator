import { describe, expect, it } from 'vitest';
import {
  KEYBOARD_LAYOUTS,
  isControlKey,
  keyAction,
  keyAtPoint,
  layoutKeys,
  type KeyboardMode,
} from './keyboardLayout.js';

describe('layouts', () => {
  it('has the expected number of keys per row in the text layouts', () => {
    expect(KEYBOARD_LAYOUTS.textLower.map((row) => row.length)).toEqual([12, 11, 12, 5]);
    expect(KEYBOARD_LAYOUTS.textUpper.map((row) => row.length)).toEqual([12, 11, 12, 5]);
  });

  it('upper case mirrors lower case in capitals, with a key to go back', () => {
    const lower = KEYBOARD_LAYOUTS.textLower[0]?.map((definition) => definition.label);
    const upper = KEYBOARD_LAYOUTS.textUpper[0]?.map((definition) => definition.label);
    expect(lower?.slice(1, 11).join('')).toBe('qwertyuiop');
    expect(upper?.slice(1, 11).join('')).toBe('QWERTYUIOP');
    expect(KEYBOARD_LAYOUTS.textUpper[1]?.[0]?.label).toBe('abc');
    expect(KEYBOARD_LAYOUTS.textLower[1]?.[0]?.label).toBe('ABC');
  });

  it.each(['textLower', 'textUpper', 'special', 'number'] as KeyboardMode[])(
    'every %s row has positive key weights',
    (mode) => {
      for (const row of KEYBOARD_LAYOUTS[mode]) {
        expect(row.every((definition) => definition.weight > 0)).toBe(true);
      }
    },
  );

  it('maps control labels to actions and everything else to typing', () => {
    expect(keyAction('\u232b')).toBe('backspace');
    expect(keyAction('\u21b5')).toBe('enter');
    expect(keyAction('\u2713')).toBe('ok');
    expect(keyAction('\u2328')).toBe('close');
    expect(keyAction('ABC')).toBe('upper');
    expect(keyAction('abc')).toBe('lower');
    expect(keyAction('1#')).toBe('special');
    expect(keyAction('+/-')).toBe('toggleSign');
    expect(keyAction('q')).toBe('char');
    expect(keyAction(' ')).toBe('char');
    expect(isControlKey('\u232b')).toBe(true);
    expect(isControlKey(' ')).toBe(true);
    expect(isControlKey('q')).toBe(false);
  });
});

describe('layoutKeys', () => {
  const rows = [
    [
      { label: 'a', weight: 1 },
      { label: 'b', weight: 3 },
    ],
    [{ label: 'c', weight: 1 }],
  ];

  it('shares the height between rows and the width by weight, with gaps and padding', () => {
    const rects = layoutKeys(rows, 108, 56, 4, 4);
    // Inner box 100 x 48; two rows with a 4px gap are 22px tall each.
    expect(rects[0]).toMatchObject({ x: 4, y: 4, width: 24, height: 22 });
    // Remaining 96px split 1:3 -> 24 and 72, starting after a 4px gap.
    expect(rects[1]).toMatchObject({ x: 32, y: 4, width: 72, height: 22 });
    expect(rects[2]).toMatchObject({ x: 4, y: 30, width: 100, height: 22 });
  });

  it('lays out an empty keyboard without error', () => {
    expect(layoutKeys([], 100, 50, 4, 4)).toEqual([]);
  });

  it('finds the key under a point, and none in a gap or margin', () => {
    const rects = layoutKeys(rows, 108, 56, 4, 4);
    expect(keyAtPoint(rects, 10, 10)?.definition.label).toBe('a');
    expect(keyAtPoint(rects, 60, 10)?.definition.label).toBe('b');
    expect(keyAtPoint(rects, 10, 40)?.definition.label).toBe('c');
    expect(keyAtPoint(rects, 29, 10)).toBeUndefined();
    expect(keyAtPoint(rects, 2, 2)).toBeUndefined();
  });
});
