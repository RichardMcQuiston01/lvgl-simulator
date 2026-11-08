/**
 * Key layouts and geometry for the `Keyboard` widget, kept free of drawing
 * so they are exactly testable. Mirrors the layouts of LVGL's `lv_keyboard`.
 */

/** Which key set a keyboard shows, mirroring `lv_keyboard_mode_t`. */
export type KeyboardMode = 'textLower' | 'textUpper' | 'special' | 'number';

/** What pressing a key does. */
export type KeyAction =
  | 'char'
  | 'backspace'
  | 'enter'
  | 'close'
  | 'ok'
  | 'left'
  | 'right'
  | 'lower'
  | 'upper'
  | 'special'
  | 'toggleSign';

/** One key: its label and how much of its row's width it takes relative to a normal key (1). */
export interface KeyDefinition {
  readonly label: string;
  readonly weight: number;
}

/** The action of the key labelled `label`; anything not a control label types itself. */
const ACTIONS: Readonly<Record<string, KeyAction>> = {
  '\u232b': 'backspace',
  '\u21b5': 'enter',
  '\u2328': 'close',
  '\u2713': 'ok',
  '\u25c0': 'left',
  '\u25b6': 'right',
  abc: 'lower',
  ABC: 'upper',
  '1#': 'special',
  '+/-': 'toggleSign',
};

/** What pressing the key labelled `label` does; any label that is not a control label types itself. */
export function keyAction(label: string): KeyAction {
  return ACTIONS[label] ?? 'char';
}

/** Whether `label` is a control key rather than a character. */
export function isControlKey(label: string): boolean {
  return keyAction(label) !== 'char' || label === ' ';
}

function key(label: string, weight = 1): KeyDefinition {
  return { label, weight };
}

function characters(labels: string): KeyDefinition[] {
  return [...labels].map((label) => key(label));
}

const BOTTOM_ROW: readonly KeyDefinition[] = [
  key('\u2328', 1.5),
  key('\u25c0', 1.5),
  key(' ', 5),
  key('\u25b6', 1.5),
  key('\u2713', 1.5),
];

/** The rows of keys for each {@link KeyboardMode}. */
export const KEYBOARD_LAYOUTS: Readonly<
  Record<KeyboardMode, readonly (readonly KeyDefinition[])[]>
> = {
  textLower: [
    [key('1#', 1.5), ...characters('qwertyuiop'), key('\u232b', 1.5)],
    [key('ABC', 2), ...characters('asdfghjkl'), key('\u21b5', 2)],
    characters('_-zxcvbnm.,:'),
    BOTTOM_ROW,
  ],
  textUpper: [
    [key('1#', 1.5), ...characters('QWERTYUIOP'), key('\u232b', 1.5)],
    [key('abc', 2), ...characters('ASDFGHJKL'), key('\u21b5', 2)],
    characters('_-ZXCVBNM.,:'),
    BOTTOM_ROW,
  ],
  special: [
    [...characters('1234567890'), key('\u232b', 1.5)],
    [key('abc', 1.5), ...characters('+-/*=%!?#<>')],
    characters('\\@$(){}[];"\''),
    BOTTOM_ROW,
  ],
  number: [
    [...characters('123'), key('\u2328')],
    [...characters('456'), key('\u2713')],
    [...characters('789'), key('\u232b')],
    [key('+/-'), key('0'), key('.'), key('\u25c0'), key('\u25b6')],
  ],
};

/** A key's rectangle, relative to the keyboard's top-left corner. */
export interface KeyRect {
  readonly row: number;
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly definition: KeyDefinition;
}

/**
 * Lays `rows` out inside a `width` by `height` box inset by `padding`, with
 * `gap` between keys. Rows share the height equally; within a row, keys
 * share the width in proportion to their weights.
 */
export function layoutKeys(
  rows: readonly (readonly KeyDefinition[])[],
  width: number,
  height: number,
  gap: number,
  padding: number,
): readonly KeyRect[] {
  const rects: KeyRect[] = [];
  const innerWidth = Math.max(0, width - padding * 2);
  const innerHeight = Math.max(0, height - padding * 2);
  const rowHeight = rows.length === 0 ? 0 : (innerHeight - gap * (rows.length - 1)) / rows.length;

  rows.forEach((row, rowIndex) => {
    const totalWeight = row.reduce((sum, definition) => sum + definition.weight, 0);
    const available = innerWidth - gap * (row.length - 1);
    let x = padding;
    row.forEach((definition, index) => {
      const keyWidth = totalWeight === 0 ? 0 : (available * definition.weight) / totalWeight;
      rects.push({
        row: rowIndex,
        index,
        x,
        y: padding + rowIndex * (rowHeight + gap),
        width: keyWidth,
        height: rowHeight,
        definition,
      });
      x += keyWidth + gap;
    });
  });
  return rects;
}

/** The key whose rectangle contains `(x, y)`, or `undefined` when the point is in a gap or the margin. */
export function keyAtPoint(rects: readonly KeyRect[], x: number, y: number): KeyRect | undefined {
  return rects.find(
    (rect) => x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height,
  );
}
