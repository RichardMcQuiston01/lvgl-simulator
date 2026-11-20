import { describe, expect, it } from 'vitest';
import {
  BUTTON_MATRIX_NEWLINE,
  countButtons,
  moveSelection,
  parseButtonMap,
  type ButtonCentre,
} from './buttonMatrixMath.js';

describe('parseButtonMap', () => {
  it('splits rows at newline entries and numbers buttons across rows', () => {
    const rows = parseButtonMap(['1', '2', '\n', '3', '4', '5']);
    expect(rows.map((row) => row.map((button) => button.label))).toEqual([
      ['1', '2'],
      ['3', '4', '5'],
    ]);
    expect(rows.flat().map((button) => button.id)).toEqual([0, 1, 2, 3, 4]);
    expect(rows[1]?.[0]?.row).toBe(1);
  });

  it('drops empty rows from leading, doubled and trailing newlines', () => {
    const rows = parseButtonMap(['\n', 'a', '\n', '\n', 'b', '\n']);
    expect(rows.map((row) => row.map((button) => button.label))).toEqual([['a'], ['b']]);
  });

  it('gives an empty map no rows', () => {
    expect(parseButtonMap([])).toEqual([]);
  });

  it('applies relative widths, clamped to 1–15, from the controls by button id', () => {
    const rows = parseButtonMap(['a', 'b', '\n', 'c'], [{ width: 3 }, undefined, { width: 99 }]);
    expect(rows.flat().map((button) => button.width)).toEqual([3, 1, 15]);
    expect(parseButtonMap(['a'], [{ width: 0 }])[0]?.[0]?.width).toBe(1);
    expect(parseButtonMap(['a'], [{ width: Number.NaN }])[0]?.[0]?.width).toBe(1);
  });
});

describe('countButtons', () => {
  it('counts labels but not newlines', () => {
    expect(countButtons(['a', BUTTON_MATRIX_NEWLINE, 'b', 'c'])).toBe(3);
    expect(countButtons([])).toBe(0);
  });
});

describe('moveSelection', () => {
  // Row 0: ids 0-2 (centres 10, 30, 50); row 1: ids 3-4 (centres 20, 40).
  const buttons: ButtonCentre[] = [
    { id: 0, row: 0, centreX: 10 },
    { id: 1, row: 0, centreX: 30 },
    { id: 2, row: 0, centreX: 50 },
    { id: 3, row: 1, centreX: 20 },
    { id: 4, row: 1, centreX: 40 },
  ];
  const all = (): boolean => true;

  it('moves left and right through the flat order, across rows', () => {
    expect(moveSelection(buttons, 1, 'right', all)).toBe(2);
    expect(moveSelection(buttons, 2, 'right', all)).toBe(3);
    expect(moveSelection(buttons, 3, 'left', all)).toBe(2);
  });

  it('stops at the ends instead of wrapping', () => {
    expect(moveSelection(buttons, 0, 'left', all)).toBeUndefined();
    expect(moveSelection(buttons, 4, 'right', all)).toBeUndefined();
  });

  it('skips buttons that are not selectable', () => {
    expect(moveSelection(buttons, 0, 'right', (id) => id !== 1)).toBe(2);
    expect(moveSelection(buttons, 2, 'left', (id) => id === 0)).toBe(0);
    expect(moveSelection(buttons, 0, 'right', (id) => id === 0)).toBeUndefined();
  });

  it('moves up and down to the button nearest across in the adjacent row', () => {
    expect(moveSelection(buttons, 0, 'down', all)).toBe(3);
    expect(moveSelection(buttons, 2, 'down', all)).toBe(4);
    // Button 4 (centre 40) is as near to button 1 (30) as to button 2 (50): the left one wins.
    expect(moveSelection(buttons, 4, 'up', all)).toBe(1);
    expect(moveSelection(buttons, 3, 'up', all)).toBe(0);
  });

  it('skips a row with nothing selectable and stops at the edges', () => {
    const threeRows: ButtonCentre[] = [
      { id: 0, row: 0, centreX: 10 },
      { id: 1, row: 1, centreX: 10 },
      { id: 2, row: 2, centreX: 10 },
    ];
    expect(moveSelection(threeRows, 0, 'down', (id) => id !== 1)).toBe(2);
    expect(moveSelection(threeRows, 0, 'up', all)).toBeUndefined();
    expect(moveSelection(threeRows, 2, 'down', all)).toBeUndefined();
  });

  it('starts from the first selectable button when there is no current one', () => {
    expect(moveSelection(buttons, -1, 'right', (id) => id >= 2)).toBe(2);
  });
});
