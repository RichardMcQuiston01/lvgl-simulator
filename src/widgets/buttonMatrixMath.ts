/**
 * Button map parsing and keypad navigation for the `ButtonMatrix` widget,
 * kept free of drawing so they are exactly testable. Mirrors LVGL's
 * `lv_buttonmatrix` map format: a flat list of labels in which `'\n'` starts
 * a new row.
 */

/** The per-button flags, mirroring `lv_buttonmatrix_ctrl_t` (`LV_BUTTONMATRIX_CTRL_*`). */
export interface ButtonControl {
  /** Share of the row width relative to a normal button (default 1). Mirrors the 1–15 width bits. */
  readonly width?: number;
  /** Takes up its space but is neither painted nor pressable. */
  readonly hidden?: boolean;
  /** Painted dimmed and not pressable. */
  readonly disabled?: boolean;
  /** Toggles between checked and unchecked when clicked. */
  readonly checkable?: boolean;
  /** Starts checked. */
  readonly checked?: boolean;
}

/** One button of a parsed map. */
export interface ButtonDefinition {
  /** Position in the flat button order, counting across rows. Newline entries are not counted. */
  readonly id: number;
  readonly row: number;
  readonly label: string;
  readonly width: number;
}

/** The newline entry that starts a new row. */
export const BUTTON_MATRIX_NEWLINE = '\n';

/** The widest a button can be relative to a normal one, as in LVGL's 4-bit width. */
const MAX_BUTTON_WIDTH = 15;

/** Splits `map` into rows of buttons, numbering the buttons in order across rows. Empty rows are dropped. */
export function parseButtonMap(
  map: readonly string[],
  controls: readonly (ButtonControl | undefined)[] = [],
): readonly (readonly ButtonDefinition[])[] {
  const rows: ButtonDefinition[][] = [[]];
  let id = 0;
  for (const entry of map) {
    if (entry === BUTTON_MATRIX_NEWLINE) {
      if (rows[rows.length - 1]?.length) {
        rows.push([]);
      }
      continue;
    }
    const width = clampWidth(controls[id]?.width);
    rows[rows.length - 1]?.push({ id, row: rows.length - 1, label: entry, width });
    id += 1;
  }
  return rows.filter((row) => row.length > 0);
}

/** Clamps a relative width to 1–15, falling back to 1 for anything that is not a number. */
function clampWidth(width: number | undefined): number {
  if (width === undefined || !Number.isFinite(width)) {
    return 1;
  }
  return Math.min(MAX_BUTTON_WIDTH, Math.max(1, Math.round(width)));
}

/** How many buttons `map` defines. */
export function countButtons(map: readonly string[]): number {
  return map.filter((entry) => entry !== BUTTON_MATRIX_NEWLINE).length;
}

/** The direction a key moves the keypad selection. */
export type ButtonMove = 'left' | 'right' | 'up' | 'down';

/** A button's centre column, so a vertical move can pick the nearest button in the next row. */
export interface ButtonCentre {
  readonly id: number;
  readonly row: number;
  readonly centreX: number;
}

/**
 * The button reached by moving `direction` from `fromId`, skipping any for
 * which `isSelectable` is false, or `undefined` when nothing is selectable
 * that way. Left/right walk the flat order (and so wrap onto the next row);
 * up/down go to the selectable button in the nearest row whose centre is
 * closest across.
 */
export function moveSelection(
  buttons: readonly ButtonCentre[],
  fromId: number,
  direction: ButtonMove,
  isSelectable: (id: number) => boolean,
): number | undefined {
  const from = buttons.find((button) => button.id === fromId);
  if (!from) {
    return buttons.find((button) => isSelectable(button.id))?.id;
  }
  if (direction === 'left' || direction === 'right') {
    const step = direction === 'right' ? 1 : -1;
    for (let id = fromId + step; id >= 0 && id < buttons.length; id += step) {
      if (isSelectable(id)) {
        return id;
      }
    }
    return undefined;
  }
  const rowStep = direction === 'down' ? 1 : -1;
  const lastRow = Math.max(...buttons.map((button) => button.row));
  for (let row = from.row + rowStep; row >= 0 && row <= lastRow; row += rowStep) {
    const candidates = buttons.filter((button) => button.row === row && isSelectable(button.id));
    if (candidates.length === 0) {
      continue;
    }
    return candidates.reduce((best, candidate) =>
      Math.abs(candidate.centreX - from.centreX) < Math.abs(best.centreX - from.centreX)
        ? candidate
        : best,
    ).id;
  }
  return undefined;
}
