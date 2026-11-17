import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import type { Popup } from '../interaction/Popup.js';
import { paintBackgroundAndBorder } from '../rendering/box.js';
import { mergeStyle, type StyleSet } from '../style/Style.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import { List, type ListItem } from './List.js';

const FACE_PADDING = 12;
const DEFAULT_ITEM_HEIGHT = 36;
/** Keeps the list from reaching the very edge of the screen. */
const SCREEN_MARGIN = 4;

/** Which side of the dropdown its list opens on, mirroring `lv_dir_t` for `lv_dropdown_set_dir`. */
export type DropdownDirection = 'down' | 'up' | 'left' | 'right';

const DEFAULT_SYMBOLS: Readonly<Record<DropdownDirection, string>> = {
  down: '▼',
  up: '▲',
  left: '◀',
  right: '▶',
};

export interface DropdownOptions extends LvObjectOptions {
  /** The choices, top to bottom. Mirrors `lv_dropdown_set_options`. */
  readonly options?: readonly string[];
  /** Index of the initially selected option (default 0). */
  readonly selected?: number;
  /** Which side the list opens on (default `'down'`). */
  readonly direction?: DropdownDirection;
  /** Text shown on the closed dropdown instead of the selected option, like a placeholder. Mirrors `lv_dropdown_set_text`. */
  readonly text?: string;
  /** The glyph at the dropdown's edge; defaults to an arrow for `direction`. Pass `''` for none. Mirrors `lv_dropdown_set_symbol`. */
  readonly symbol?: string;
  /** Height of one option row in px (default 36). */
  readonly itemHeight?: number;
  /** Tallest the list may be (default: whatever fits on the screen). The list scrolls beyond it. */
  readonly maxListHeight?: number;
  /** Highlight the selected option in the open list (default `true`). Mirrors `lv_dropdown_set_selected_highlight`. */
  readonly selectedHighlight?: boolean;
  /** Style for the open list's option rows — LVGL's `LV_PART_ITEMS`. */
  readonly itemsStyle?: StyleSet;
}

/**
 * A list of option rows that floats above the rest of the screen and scrolls
 * when long. {@link Dropdown} owns one; it reveals the selected row when it
 * opens, so a long list does not open at the top with the selection out of
 * sight.
 */
class DropdownList extends List {
  /** The row to scroll into view the next time the list is laid out, or `undefined`. */
  revealIndex: number | undefined;

  /** Lays the rows out, then scrolls to `revealIndex` (rows have no position until they are laid out). */
  protected override updateLayout(): void {
    super.updateLayout();
    if (this.revealIndex === undefined) {
      return;
    }
    const row = this.buttons[this.revealIndex];
    this.revealIndex = undefined;
    if (row) {
      this.scrollToView(row);
    }
  }
}

/**
 * A closed box showing the selected option that opens a list to choose from,
 * mirroring LVGL's `lv_dropdown`. Click it to open the list and click an
 * option to choose it; a press anywhere else closes it. With the keyboard,
 * Up/Down change the selection (and move the highlight when open), Enter or
 * Space opens it and then picks the highlighted option, Escape closes it.
 * Fires `valueChanged` when the selection changes.
 */
export class Dropdown extends LvObject implements Popup {
  direction: DropdownDirection;
  /** Text shown instead of the selected option while set. */
  text: string | undefined;
  symbol: string | undefined;
  itemHeight: number;
  maxListHeight: number | undefined;
  selectedHighlight: boolean;
  /** Style for the open list's option rows — LVGL's `LV_PART_ITEMS`. */
  itemsStyle: StyleSet;

  private choices: readonly string[] = [];
  private selection = 0;
  private highlight = 0;
  private readonly list: DropdownList;

  /** Creates a closed dropdown over `options.options`, with `options.selected` chosen. */
  constructor(options: DropdownOptions) {
    super({
      ...options,
      editable: options.editable ?? true,
      style: {
        base: mergeStyle(
          {
            bgColor: defaultTheme.backgroundColor,
            borderColor: defaultTheme.borderColor,
            borderWidth: 1,
            radius: defaultTheme.radius,
            textColor: defaultTheme.textColor,
            textFontSize: defaultTheme.fontSize,
            textFontFamily: defaultTheme.fontFamily,
          },
          options.style?.base,
        ),
        states: options.style?.states,
      },
    });
    this.direction = options.direction ?? 'down';
    this.text = options.text;
    this.symbol = options.symbol;
    this.itemHeight = options.itemHeight ?? DEFAULT_ITEM_HEIGHT;
    this.maxListHeight = options.maxListHeight;
    this.selectedHighlight = options.selectedHighlight ?? true;
    this.itemsStyle = {
      base: mergeStyle(options.itemsStyle?.base),
      states: options.itemsStyle?.states,
    };
    this.list = new DropdownList({
      width: this.width,
      height: this.itemHeight,
      itemHeight: this.itemHeight,
      floating: true,
      topLayer: true,
      hidden: true,
    });
    this.addChild(this.list);
    this.list.onItemClicked((item) => this.choose(this.list.buttons.indexOf(item)));
    this.setOptions(options.options ?? [], options.selected);

    this.addEventListener('clicked', () => this.toggle());
    this.addEventListener('defocused', () => this.close());
    this.addEventListener('key', (event) => this.handleKey(event.key));
  }

  /** The choices, top to bottom. */
  get options(): readonly string[] {
    return this.choices;
  }

  /** The index of the selected option. Mirrors `lv_dropdown_get_selected`. */
  get selectedIndex(): number {
    return this.selection;
  }

  /** The text of the selected option, or `undefined` when there are none. Mirrors `lv_dropdown_get_selected_str`. */
  get selectedText(): string | undefined {
    return this.choices[this.selection];
  }

  /** Whether the list is showing. Mirrors `lv_dropdown_is_open`. */
  get isOpen(): boolean {
    return !this.list.hidden;
  }

  get popupOpen(): boolean {
    return this.isOpen;
  }

  /** The option row at `index` in the open list, for styling or inspection. */
  optionRow(index: number): ListItem | undefined {
    return this.list.buttons[index];
  }

  /** The floating list object, for hit-testing and geometry. */
  get listObject(): LvObject {
    return this.list;
  }

  /** Replaces the choices and selects `selected` (default: the first). Mirrors `lv_dropdown_set_options`. */
  setOptions(options: readonly string[], selected = 0): void {
    this.choices = [...options];
    this.selection = Math.min(Math.max(0, options.length - 1), Math.max(0, Math.floor(selected)));
    this.highlight = this.selection;
    for (const row of [...this.list.items]) {
      this.list.removeItem(row);
    }
    for (const option of options) {
      this.list.addButton(option);
    }
    this.applyRowStyles();
  }

  /** Chooses option `index`, firing `valueChanged` if it differs. Mirrors `lv_dropdown_set_selected`. */
  setSelected(index: number): void {
    if (this.choices.length === 0) {
      return;
    }
    const next = Math.min(this.choices.length - 1, Math.max(0, Math.floor(index)));
    this.highlight = next;
    if (next !== this.selection) {
      this.selection = next;
      this.applyRowStyles();
      this.dispatchEvent('valueChanged');
    } else {
      this.applyRowStyles();
    }
  }

  /** Opens the list, positioned on `direction`'s side and scrolled to the selected option. Mirrors `lv_dropdown_open`. */
  open(): void {
    if (this.isOpen || this.choices.length === 0 || this.disabled) {
      return;
    }
    this.highlight = this.selection;
    this.applyRowStyles();
    this.positionList();
    this.list.revealIndex = this.highlight;
    this.list.hidden = false;
  }

  /** Closes the list. Mirrors `lv_dropdown_close`. */
  close(): void {
    this.list.hidden = true;
  }

  closePopup(): void {
    this.close();
  }

  ownsPopupTarget(target: LvObject): boolean {
    for (let node: LvObject | null = target; node; node = node.parent) {
      if (node === this) {
        return true;
      }
    }
    return false;
  }

  /** Opens the list, or closes it when it is open. */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /** Picks option `index` from the list: selects it, then closes. */
  private choose(index: number): void {
    if (index < 0) {
      return;
    }
    this.setSelected(index);
    this.close();
  }

  /** Handles keys: Up/Down move the selection (highlight when open), Enter/Space open or confirm, Escape closes. */
  private handleKey(key: string): void {
    const step =
      key === 'ArrowDown' || key === 'ArrowRight'
        ? 1
        : key === 'ArrowUp' || key === 'ArrowLeft'
          ? -1
          : 0;
    if (step !== 0) {
      if (this.isOpen) {
        this.highlight = Math.min(this.choices.length - 1, Math.max(0, this.highlight + step));
        this.applyRowStyles();
        this.list.revealIndex = this.highlight;
      } else {
        this.setSelected(this.selection + step);
      }
      return;
    }
    if (key === 'Enter' || key === ' ') {
      if (this.isOpen) {
        this.choose(this.highlight);
      } else {
        this.open();
      }
    } else if (key === 'Escape') {
      this.close();
    }
  }

  /** Sizes the list and places it beside the dropdown on `direction`'s side, within the screen. */
  private positionList(): void {
    const rows = this.choices.length * this.itemHeight;
    const screen = this.screenBounds();
    const { x, y } = this.getAbsolutePosition();
    const horizontal = this.direction === 'left' || this.direction === 'right';
    const room =
      this.direction === 'down'
        ? screen.height - (y + this.height) - SCREEN_MARGIN
        : this.direction === 'up'
          ? y - SCREEN_MARGIN
          : screen.height - SCREEN_MARGIN * 2;
    const limit = Math.max(this.itemHeight, this.maxListHeight ?? room);
    this.list.itemHeight = this.itemHeight;
    this.list.width = this.width;
    this.list.height = Math.min(rows, Math.max(this.itemHeight, Math.min(limit, room)));
    this.list.scrollY = 0;

    if (this.direction === 'down') {
      this.list.x = 0;
      this.list.y = this.height;
    } else if (this.direction === 'up') {
      this.list.x = 0;
      this.list.y = -this.list.height;
    } else {
      this.list.x = this.direction === 'right' ? this.width : -this.list.width;
      // Align with the dropdown's top, but keep the list on the screen.
      const top = Math.min(y, screen.height - SCREEN_MARGIN - this.list.height);
      this.list.y = Math.max(SCREEN_MARGIN, top) - y;
    }
    if (!horizontal) {
      // Keep a wide dropdown near the edge on the screen too.
      const left = Math.min(x, screen.width - this.list.width);
      this.list.x = Math.max(0, left) - x;
    }
  }

  /** The size of the root of this dropdown's tree, taken as the screen. */
  private screenBounds(): { readonly width: number; readonly height: number } {
    let root: LvObject = this.parent ?? this;
    while (root.parent) {
      root = root.parent;
    }
    return { width: root.width, height: root.height };
  }

  /** Styles each option row, giving the highlighted one the selected look. */
  private applyRowStyles(): void {
    const normal: StyleSet = {
      base: mergeStyle(this.itemsStyle.base),
      states: this.itemsStyle.states,
    };
    this.list.buttons.forEach((row, index) => {
      const highlighted = this.selectedHighlight && index === this.highlight;
      row.style = highlighted
        ? {
            base: mergeStyle(normal.base, {
              bgColor: defaultTheme.primaryColor,
              textColor: defaultTheme.textColorOnPrimary,
            }),
            states: { pressed: { bgColor: defaultTheme.primaryColorPressed }, ...normal.states },
          }
        : {
            base: mergeStyle(
              {
                bgColor: defaultTheme.backgroundColor,
                textColor: defaultTheme.textColor,
                textFontSize: defaultTheme.fontSize,
                textFontFamily: defaultTheme.fontFamily,
              },
              normal.base,
            ),
            states: { pressed: { bgColor: '#e3f2fd' }, ...normal.states },
          };
    });
  }

  /** Paints the closed face: the selected option (or `text`) and the direction symbol. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const style = this.resolvedStyle;
    const { x, y } = this.getAbsolutePosition();
    paintBackgroundAndBorder(context, x, y, this.width, this.height, style);

    context.fillStyle = style.textColor ?? defaultTheme.textColor;
    context.font = `${style.textFontSize ?? defaultTheme.fontSize}px ${style.textFontFamily ?? defaultTheme.fontFamily}`;
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    const centreY = y + this.height / 2;
    const label = this.text ?? this.selectedText;
    if (label) {
      context.fillText(label, x + FACE_PADDING, centreY);
    }
    const symbol = this.symbol ?? DEFAULT_SYMBOLS[this.direction];
    if (symbol) {
      context.textAlign = 'right';
      context.fillText(symbol, x + this.width - FACE_PADDING, centreY);
    }
  }
}
