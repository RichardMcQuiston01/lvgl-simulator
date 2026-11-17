import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import { paintBackgroundAndBorder } from '../rendering/box.js';
import { paintRoundedRect } from '../rendering/shapes.js';
import { mergeStyle, type StyleSet } from '../style/Style.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import { Container, type ContainerOptions } from './Container.js';

const DEFAULT_ITEM_HEIGHT = 40;
/** The list's border width, which its rows are inset by so they do not paint over it. */
export const LIST_BORDER_WIDTH = 1;
const TEXT_ITEM_HEIGHT = 28;
const ITEM_PADDING = 12;
const ICON_GAP = 10;
/** Width reserved for the icon column, so the labels of icon and non-icon items line up. */
const ICON_WIDTH = 20;

/** What a {@link ListItem} is: a pressable button row or a non-pressable section heading. */
export type ListItemKind = 'button' | 'text';

export interface ListItemOptions extends LvObjectOptions {
  readonly kind: ListItemKind;
  readonly text: string;
  /** A glyph or short string drawn before the text, like LVGL's `LV_SYMBOL_*` icons. Buttons only. */
  readonly icon?: string;
}

/** One row of a {@link List}: a button (with an optional icon) or a section heading. */
export class ListItem extends LvObject {
  readonly kind: ListItemKind;
  text: string;
  icon: string | undefined;

  /** Creates a row; a `'text'` row is not clickable. */
  constructor(options: ListItemOptions) {
    const isButton = options.kind === 'button';
    super({
      ...options,
      clickable: options.clickable ?? isButton,
      style: {
        base: mergeStyle(
          isButton
            ? { bgColor: defaultTheme.backgroundColor, textColor: defaultTheme.textColor }
            : { bgColor: '#f5f5f5', textColor: '#6b7280' },
          {
            textFontSize: isButton ? defaultTheme.fontSize : 12,
            textFontFamily: defaultTheme.fontFamily,
          },
          options.style?.base,
        ),
        states: {
          ...(isButton ? { pressed: { bgColor: '#e3f2fd' } } : {}),
          ...options.style?.states,
        },
      },
    });
    this.kind = options.kind;
    this.text = options.text;
    this.icon = options.icon;
  }

  /** Paints the row's background, a divider along its bottom edge, the icon and the text. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const style = this.resolvedStyle;
    const { x, y } = this.getAbsolutePosition();
    paintBackgroundAndBorder(context, x, y, this.width, this.height, style);
    paintRoundedRect(context, x, y + this.height - 1, this.width, 1, 0, defaultTheme.borderColor);

    context.fillStyle = style.textColor ?? defaultTheme.textColor;
    context.font = `${style.textFontSize ?? defaultTheme.fontSize}px ${style.textFontFamily ?? defaultTheme.fontFamily}`;
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    const centerY = y + this.height / 2;
    let textX = x + ITEM_PADDING;
    if (this.icon) {
      context.fillText(this.icon, textX, centerY);
    }
    if (this.kind === 'button' && this.icon !== undefined) {
      textX += ICON_WIDTH + ICON_GAP;
    }
    context.fillText(this.text, textX, centerY);
  }
}

export interface ListOptions extends Omit<ContainerOptions, 'layout' | 'padding'> {
  /** Height of a button row in px (default 40). */
  readonly itemHeight?: number;
}

/**
 * A scrollable vertical list of rows, mirroring LVGL's `lv_list`. Add
 * section headings with {@link addText} and pressable rows with
 * {@link addButton}; rows are as wide as the list and the list scrolls
 * when they overflow. Listen for `clicked` on a button row (or use
 * {@link onItemClicked}) to react to a selection.
 */
export class List extends Container {
  itemHeight: number;

  private readonly rows: ListItem[] = [];
  private readonly clickListeners = new Set<(item: ListItem) => void>();

  /** Creates an empty list. */
  constructor(options: ListOptions) {
    super({
      ...options,
      layout: { type: 'flex', direction: 'column' },
      scrollDirection: options.scrollDirection ?? 'vertical',
      style: {
        base: mergeStyle(
          {
            bgColor: defaultTheme.backgroundColor,
            borderColor: defaultTheme.borderColor,
            borderWidth: LIST_BORDER_WIDTH,
            padTop: LIST_BORDER_WIDTH,
            padRight: LIST_BORDER_WIDTH,
            padBottom: LIST_BORDER_WIDTH,
            padLeft: LIST_BORDER_WIDTH,
            radius: defaultTheme.radius,
            clipCorner: true,
          },
          options.style?.base,
        ),
        states: options.style?.states,
      },
    });
    this.itemHeight = options.itemHeight ?? DEFAULT_ITEM_HEIGHT;
  }

  /** Every row in order, headings and buttons both. */
  get items(): readonly ListItem[] {
    return this.rows;
  }

  /** Only the pressable rows, in order. */
  get buttons(): readonly ListItem[] {
    return this.rows.filter((row) => row.kind === 'button');
  }

  /** Appends a section heading. Mirrors `lv_list_add_text`. */
  addText(text: string): ListItem {
    return this.addItem({ kind: 'text', text, height: TEXT_ITEM_HEIGHT });
  }

  /** Appends a pressable row, with `icon` drawn before the text when given. Mirrors `lv_list_add_button`. */
  addButton(text: string, icon?: string, style?: StyleSet): ListItem {
    return this.addItem({ kind: 'button', text, icon, height: this.itemHeight, style });
  }

  /** Removes `item` from the list. Returns whether it was a row of this list. */
  removeItem(item: ListItem): boolean {
    const index = this.rows.indexOf(item);
    if (index === -1) {
      return false;
    }
    this.rows.splice(index, 1);
    this.removeChild(item);
    return true;
  }

  /** Calls `listener` with the row whenever a button row is clicked; returns a function that stops listening. */
  onItemClicked(listener: (item: ListItem) => void): () => void {
    this.clickListeners.add(listener);
    return (): void => {
      this.clickListeners.delete(listener);
    };
  }

  /** Creates a row sized to the list, appends it, and tracks it. */
  private addItem(options: Omit<ListItemOptions, 'width'>): ListItem {
    const item = new ListItem({ ...options, width: this.contentWidth });
    this.rows.push(item);
    this.addChild(item);
    if (item.kind === 'button') {
      item.addEventListener('clicked', () => {
        for (const listener of [...this.clickListeners]) {
          listener(item);
        }
      });
    }
    return item;
  }

  /** The width available to rows: the list's width less its border-box padding. */
  private get contentWidth(): number {
    const style = this.resolvedStyle;
    return Math.max(0, this.width - (style.padLeft ?? 0) - (style.padRight ?? 0));
  }

  /** Stretches every row to the list's current width, then lays them out in a column. */
  protected override updateLayout(): void {
    const width = this.contentWidth;
    for (const row of this.rows) {
      row.width = width;
    }
    super.updateLayout();
  }
}
