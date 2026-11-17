import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import type { PointerDraggable } from '../interaction/PointerDraggable.js';
import { paintBackgroundAndBorder } from '../rendering/box.js';
import { mergeStyle, resolveStyle, type LvState, type StyleSet } from '../style/Style.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import {
  moveSelection,
  parseButtonMap,
  type ButtonControl,
  type ButtonDefinition,
  type ButtonMove,
} from './buttonMatrixMath.js';
import { keyAtPoint, layoutKeys, type KeyRect } from './keyboardLayout.js';

const DEFAULT_GAP = 4;
const DEFAULT_PADDING = 4;

/** The mutable per-button flags the widget tracks, mirroring the `LV_BUTTONMATRIX_CTRL_*` bits it supports. */
interface ButtonFlags {
  hidden: boolean;
  disabled: boolean;
  checkable: boolean;
  checked: boolean;
}

export interface ButtonMatrixOptions extends LvObjectOptions {
  /** Button labels in order; a `'\n'` entry starts a new row. Mirrors `lv_buttonmatrix_set_map`. */
  readonly map?: readonly string[];
  /** Flags per button, by position in the flat button order. Mirrors `lv_buttonmatrix_set_ctrl_map`. */
  readonly controls?: readonly (ButtonControl | undefined)[];
  /** Keep exactly one checkable button checked at a time, like radio buttons. Mirrors `lv_buttonmatrix_set_one_checked`. */
  readonly oneChecked?: boolean;
  /** Space between buttons (default 4). */
  readonly gap?: number;
  /** Space between the buttons and the matrix's edge (default 4). */
  readonly padding?: number;
  /** Style for the buttons — LVGL's `LV_PART_ITEMS`. Its `states` style pressed, checked and disabled buttons. */
  readonly itemsStyle?: StyleSet;
}

/**
 * A grid of buttons in one object, mirroring LVGL's `lv_buttonmatrix`. The
 * `map` lists the labels (with `'\n'` starting a new row) and each button's
 * relative width, and whether it is hidden, disabled, or checkable, come
 * from `controls`. A click fires `valueChanged` with the button in
 * `selectedIndex`; checkable buttons toggle (with `oneChecked`, one is always
 * checked, like radio buttons). When focused, the arrow keys move
 * `focusedIndex` and Enter or Space presses that button.
 */
export class ButtonMatrix extends LvObject implements PointerDraggable {
  gap: number;
  padding: number;
  oneChecked: boolean;
  /** Style for the buttons — LVGL's `LV_PART_ITEMS`. */
  itemsStyle: StyleSet;
  /** The button most recently clicked or activated, or `undefined` before any. Mirrors `lv_buttonmatrix_get_selected_button`. */
  selectedIndex: number | undefined;
  /** The button the arrow keys have moved to while this matrix has focus, or `undefined`. */
  focusedIndex: number | undefined;

  private mapEntries: readonly string[] = [];
  private rows: readonly (readonly ButtonDefinition[])[] = [];
  private flags: ButtonFlags[] = [];
  private pressedIndex: number | undefined;
  private releasedIndex: number | undefined;

  /** Creates a button matrix from `options.map` (empty by default). */
  constructor(options: ButtonMatrixOptions) {
    super({
      ...options,
      style: {
        base: mergeStyle(
          {
            bgColor: defaultTheme.backgroundColor,
            borderColor: defaultTheme.borderColor,
            borderWidth: 1,
            radius: defaultTheme.radius,
          },
          options.style?.base,
        ),
        states: options.style?.states,
      },
    });
    this.gap = options.gap ?? DEFAULT_GAP;
    this.padding = options.padding ?? DEFAULT_PADDING;
    this.oneChecked = options.oneChecked ?? false;
    this.itemsStyle = {
      base: mergeStyle(
        {
          bgColor: defaultTheme.backgroundColor,
          borderColor: defaultTheme.borderColor,
          borderWidth: 1,
          radius: 4,
          textColor: defaultTheme.textColor,
          textFontSize: defaultTheme.fontSize,
          textFontFamily: defaultTheme.fontFamily,
        },
        options.itemsStyle?.base,
      ),
      states: {
        pressed: { bgColor: '#e3f2fd' },
        checked: {
          bgColor: defaultTheme.primaryColor,
          borderColor: defaultTheme.primaryColor,
          textColor: defaultTheme.textColorOnPrimary,
        },
        focused: { borderColor: defaultTheme.focusOutlineColor, borderWidth: 2 },
        disabled: { bgColor: defaultTheme.disabledColor, textColor: '#9e9e9e' },
        ...options.itemsStyle?.states,
      },
    };
    this.setMap(options.map ?? [], options.controls);

    this.addEventListener('pressed', () => {
      this.releasedIndex = undefined;
    });
    this.addEventListener('released', () => {
      this.releasedIndex = this.pressedIndex;
      this.pressedIndex = undefined;
    });
    this.addEventListener('clicked', () => {
      const index = this.releasedIndex;
      this.releasedIndex = undefined;
      if (index !== undefined) {
        this.activate(index);
      }
    });
    this.addEventListener('key', (event) => this.handleKey(event.key));
    this.addEventListener('defocused', () => {
      this.focusedIndex = undefined;
    });
  }

  /**
   * Replaces the buttons. `controls` set each button's flags by position;
   * without them every button is plain. With `oneChecked`, the first checked
   * button (or else the first checkable one) ends up checked.
   */
  setMap(map: readonly string[], controls?: readonly (ButtonControl | undefined)[]): void {
    this.mapEntries = [...map];
    this.rows = parseButtonMap(map, controls);
    this.flags = this.rows.flat().map((button) => {
      const control = controls?.[button.id];
      return {
        hidden: control?.hidden ?? false,
        disabled: control?.disabled ?? false,
        checkable: control?.checkable ?? false,
        checked: control?.checked ?? false,
      };
    });
    this.pressedIndex = undefined;
    this.releasedIndex = undefined;
    this.selectedIndex = undefined;
    this.focusedIndex = undefined;
    this.normalizeChecked();
  }

  /** The button labels as given to {@link setMap}, newline entries included. */
  get map(): readonly string[] {
    return this.mapEntries;
  }

  /** How many buttons there are. */
  get buttonCount(): number {
    return this.flags.length;
  }

  /** The label of button `index`, or `undefined` when there is no such button. */
  buttonText(index: number): string | undefined {
    return this.rows.flat()[index]?.label;
  }

  /** The label of the selected button, or `undefined`. Mirrors `lv_buttonmatrix_get_button_text`. */
  get selectedText(): string | undefined {
    return this.selectedIndex === undefined ? undefined : this.buttonText(this.selectedIndex);
  }

  /** Whether button `index` is checked. */
  isChecked(index: number): boolean {
    return this.flags[index]?.checked ?? false;
  }

  /** The index of the first checked button, or `undefined`. */
  get checkedIndex(): number | undefined {
    const index = this.flags.findIndex((flag) => flag.checked);
    return index === -1 ? undefined : index;
  }

  /** Checks or unchecks a checkable button, firing no event. With `oneChecked`, checking one unchecks the rest. Returns whether the state changed. */
  setChecked(index: number, checked: boolean): boolean {
    const flag = this.flags[index];
    if (!flag?.checkable || flag.checked === checked) {
      return false;
    }
    if (this.oneChecked && !checked) {
      return false;
    }
    flag.checked = checked;
    if (this.oneChecked && checked) {
      this.flags.forEach((other, otherIndex) => {
        if (otherIndex !== index) {
          other.checked = false;
        }
      });
    }
    return true;
  }

  /** Sets or clears flags on button `index`. Mirrors `lv_buttonmatrix_set_button_ctrl` / `clear_button_ctrl`. */
  setButtonControl(index: number, control: Omit<ButtonControl, 'width'>): void {
    const flag = this.flags[index];
    if (!flag) {
      return;
    }
    flag.hidden = control.hidden ?? flag.hidden;
    flag.disabled = control.disabled ?? flag.disabled;
    flag.checkable = control.checkable ?? flag.checkable;
    flag.checked = control.checked ?? flag.checked;
    this.normalizeChecked();
  }

  /** Whether button `index` can be pressed: it exists and is neither hidden nor disabled. */
  isPressable(index: number): boolean {
    const flag = this.flags[index];
    return flag !== undefined && !flag.hidden && !flag.disabled;
  }

  /** Every button's rectangle, relative to the matrix's top-left. Indexed by button position. */
  get buttonRects(): readonly KeyRect[] {
    const definitions = this.rows.map((row) =>
      row.map((button) => ({ label: button.label, weight: button.width })),
    );
    return layoutKeys(definitions, this.width, this.height, this.gap, this.padding);
  }

  /** Tracks the button under the pointer while pressed (see {@link PointerDraggable}), so a release on one clicks it. */
  handlePointerPosition(localX: number, localY = 0): void {
    const rects = this.buttonRects;
    const hit = keyAtPoint(rects, localX, localY);
    const index = hit ? rects.indexOf(hit) : -1;
    this.pressedIndex = index !== -1 && this.isPressable(index) ? index : undefined;
  }

  /** Presses button `index` as if it had been clicked. Returns whether it was pressable. */
  pressButton(index: number): boolean {
    if (!this.isPressable(index)) {
      return false;
    }
    this.activate(index);
    return true;
  }

  /** Selects `index`, toggles it when checkable, then fires `valueChanged`. */
  private activate(index: number): void {
    const flag = this.flags[index];
    if (!flag || !this.isPressable(index)) {
      return;
    }
    this.selectedIndex = index;
    if (flag.checkable) {
      this.setChecked(index, !flag.checked);
    }
    this.dispatchEvent('valueChanged');
  }

  /** Moves the keypad selection with the arrow keys and presses it with Enter or Space. */
  private handleKey(key: string): void {
    const moves: Readonly<Record<string, ButtonMove>> = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
    };
    const move = moves[key];
    if (move) {
      const rects = this.buttonRects;
      const centres = rects.map((rect, id) => ({
        id,
        row: rect.row,
        centreX: rect.x + rect.width / 2,
      }));
      const next = moveSelection(centres, this.focusedIndex ?? -1, move, (id) =>
        this.isPressable(id),
      );
      if (next !== undefined) {
        this.focusedIndex = next;
      }
      return;
    }
    if ((key === 'Enter' || key === ' ') && this.focusedIndex !== undefined) {
      this.activate(this.focusedIndex);
    }
  }

  /** With `oneChecked`, leaves exactly one checkable button checked: the first checked, else the first checkable. */
  private normalizeChecked(): void {
    if (!this.oneChecked) {
      return;
    }
    let keep = this.flags.findIndex((flag) => flag.checkable && flag.checked);
    if (keep === -1) {
      keep = this.flags.findIndex((flag) => flag.checkable);
    }
    this.flags.forEach((flag, index) => {
      flag.checked = flag.checkable && index === keep;
    });
  }

  /** Paints the matrix's background, then each visible button with its label. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const { x, y } = this.getAbsolutePosition();
    paintBackgroundAndBorder(context, x, y, this.width, this.height, this.resolvedStyle);

    this.buttonRects.forEach((rect, index) => {
      const flag = this.flags[index];
      if (!flag || flag.hidden) {
        return;
      }
      const states = new Set<LvState>();
      if (flag.checked) {
        states.add('checked');
      }
      if (this.pressedIndex === index) {
        states.add('pressed');
      }
      if (flag.disabled) {
        states.add('disabled');
      }
      if (this.focused && this.focusedIndex === index) {
        states.add('focused');
      }
      const style = resolveStyle(this.itemsStyle, states);
      paintBackgroundAndBorder(context, x + rect.x, y + rect.y, rect.width, rect.height, style);
      if (rect.definition.label === '') {
        return;
      }
      context.fillStyle = style.textColor ?? defaultTheme.textColor;
      context.font = `${style.textFontSize ?? defaultTheme.fontSize}px ${style.textFontFamily ?? defaultTheme.fontFamily}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(
        rect.definition.label,
        x + rect.x + rect.width / 2,
        y + rect.y + rect.height / 2,
      );
    });
  }
}
