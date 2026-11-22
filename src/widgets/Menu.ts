import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import { paintBackgroundAndBorder } from '../rendering/box.js';
import { mergeStyle, type StyleSet } from '../style/Style.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import { Button } from './Button.js';
import { Container } from './Container.js';
import { Label } from './Label.js';
import { ListItem } from './List.js';

const DEFAULT_HEADER_HEIGHT = 40;
const DEFAULT_SIDEBAR_WIDTH = 120;
const DEFAULT_ITEM_HEIGHT = 40;
const SECTION_TITLE_HEIGHT = 28;
const SEPARATOR_HEIGHT = 8;
const PAGE_PADDING = 8;
const PAGE_GAP = 8;
const CHEVRON_INSET = 12;

/** Options for {@link MenuColumn.addItem}. */
export interface MenuItemOptions {
  /** A glyph or short string drawn before the text. */
  readonly icon?: string;
  /** The page to open when the item is clicked: pushed in the main area, or made the root page from a sidebar. */
  readonly page?: MenuPage;
}

/** A row of a menu page or section, which can open another page and then shows a chevron. */
export class MenuItem extends ListItem {
  /** The page this item opens, if any. */
  target: MenuPage | undefined;

  /** Creates a pressable row; use {@link MenuColumn.addItem} rather than calling this directly. */
  constructor(text: string, height: number, options: MenuItemOptions = {}) {
    super({ kind: 'button', text, icon: options.icon, width: 0, height });
    this.target = options.page;
  }

  /** Paints the row, then a chevron at its right edge when it opens a page. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    super.paintSelf(context);
    if (this.target) {
      const style = this.resolvedStyle;
      const { x, y } = this.getAbsolutePosition();
      context.fillStyle = style.textColor ?? defaultTheme.textColor;
      context.font = `${style.textFontSize ?? defaultTheme.fontSize}px ${style.textFontFamily ?? defaultTheme.fontFamily}`;
      context.textAlign = 'right';
      context.textBaseline = 'middle';
      context.fillText('›', x + this.width - CHEVRON_INSET, y + this.height / 2);
    }
  }
}

/**
 * A vertical stack of rows that are as wide as it is: the base of
 * {@link MenuPage} and {@link MenuSection}. Items, section headings and
 * separators are added in order.
 */
export class MenuColumn extends Container {
  itemHeight: number;

  protected readonly rows: LvObject[] = [];
  protected readonly open: ((from: MenuColumn, to: MenuPage) => void) | undefined;

  /** Creates an empty column; `open` is called with the page an item opens when it is clicked. */
  constructor(
    options: ConstructorParameters<typeof Container>[0] & {
      readonly itemHeight?: number;
      readonly open?: (from: MenuColumn, to: MenuPage) => void;
    },
  ) {
    super({ ...options, layout: options.layout ?? { type: 'flex', direction: 'column' } });
    this.itemHeight = options.itemHeight ?? DEFAULT_ITEM_HEIGHT;
    this.open = options.open;
  }

  /** The rows in order: items, section headings and separators. */
  get entries(): readonly LvObject[] {
    return this.rows;
  }

  /** Appends a pressable row and returns it. Mirrors `lv_menu_cont_create` with a label. */
  addItem(text: string, options: MenuItemOptions = {}): MenuItem {
    const item = new MenuItem(text, this.itemHeight, options);
    const target = options.page;
    if (target) {
      item.addEventListener('clicked', () => this.open?.(this, target));
    }
    return this.append(item);
  }

  /** Appends a non-pressable heading row and returns it. */
  addHeading(text: string): ListItem {
    return this.append(
      new ListItem({ kind: 'text', text, width: 0, height: SECTION_TITLE_HEIGHT }),
    );
  }

  /** Appends a thin divider and returns it. Mirrors `lv_menu_separator_create`. */
  addSeparator(): ListItem {
    return this.append(
      new ListItem({ kind: 'text', text: '', width: 0, height: SEPARATOR_HEIGHT }),
    );
  }

  /** Adds `row` to the column and re-sizes anything that depends on its rows. */
  protected append<T extends LvObject>(row: T): T {
    this.rows.push(row);
    this.addChild(row);
    this.rowsChanged();
    return row;
  }

  /** Called after a row is added; sections use it to resize themselves. */
  protected rowsChanged(): void {}

  /** Makes every row as wide as the column's content area before laying them out. */
  protected override updateLayout(): void {
    const style = this.resolvedStyle;
    const width = Math.max(0, this.width - (style.padLeft ?? 0) - (style.padRight ?? 0));
    for (const row of this.rows) {
      row.width = width;
    }
    super.updateLayout();
  }
}

/** A titled group of rows with a frame around it, inside a {@link MenuPage}. Mirrors `lv_menu_section_create`. */
export class MenuSection extends MenuColumn {
  /** Creates an empty section; its height follows its rows. */
  constructor(
    open: ((from: MenuColumn, to: MenuPage) => void) | undefined,
    itemHeight: number,
    title?: string,
  ) {
    super({
      width: 0,
      height: 0,
      scrollable: false,
      itemHeight,
      open,
      style: {
        base: {
          bgColor: defaultTheme.backgroundColor,
          borderColor: defaultTheme.borderColor,
          borderWidth: 1,
          radius: defaultTheme.radius,
          clipCorner: true,
        },
      },
    });
    if (title !== undefined) {
      this.addHeading(title);
    }
  }

  /** Sizes the section to its rows plus its border. */
  protected override rowsChanged(): void {
    const rowsHeight = this.rows.reduce((sum, row) => sum + row.height, 0);
    this.height = rowsHeight + 2;
  }
}

/**
 * One screen of a {@link Menu}: a scrolling column of items, sections and
 * separators with a title. Create it with {@link Menu.createPage}. Mirrors
 * `lv_menu_page_create`.
 */
export class MenuPage extends MenuColumn {
  title: string | undefined;

  /** Creates an empty page with an optional title for the menu header. */
  constructor(
    title: string | undefined,
    open: ((from: MenuColumn, to: MenuPage) => void) | undefined,
    itemHeight: number,
  ) {
    super({
      width: 0,
      height: 0,
      scrollDirection: 'vertical',
      itemHeight,
      open,
      layout: { type: 'flex', direction: 'column', rowGap: PAGE_GAP },
      padding: PAGE_PADDING,
    });
    this.title = title;
  }

  /** Appends a framed group of rows, optionally with a heading, and returns it to fill. */
  addSection(title?: string): MenuSection {
    return this.append(new MenuSection(this.open, this.itemHeight, title));
  }
}

export interface MenuOptions extends LvObjectOptions {
  /** Height of the header bar holding the back button and page title (default 40). */
  readonly headerHeight?: number;
  /** Width of the sidebar when a sidebar page is set (default 120). */
  readonly sidebarWidth?: number;
  /** Height of an item row (default 40). */
  readonly itemHeight?: number;
  /** Show the back button even on the root page, for hosts that handle going back themselves. */
  readonly alwaysShowBack?: boolean;
  /** Style for the header bar. */
  readonly headerStyle?: StyleSet;
}

/**
 * A page-based settings-style menu, mirroring LVGL's `lv_menu`. Pages are made
 * with {@link createPage} and filled with items, sections and separators; an
 * item can open another page, which is pushed onto a history so the header's
 * back button returns to the previous one. A sidebar page, when set, stays on
 * the left, and its items replace the main page instead of stacking. Fires
 * `valueChanged` whenever the page on show changes.
 */
export class Menu extends LvObject {
  headerHeight: number;
  sidebarWidth: number;
  itemHeight: number;
  alwaysShowBack: boolean;

  /** The header bar over the main area. */
  readonly header: Container;
  /** The back button in the header. */
  readonly backButton: Button;
  private readonly titleLabel: Label;
  private readonly mainArea: Container;
  private readonly sidebarArea: Container;
  private readonly pageList: MenuPage[] = [];
  private readonly stack: MenuPage[] = [];
  private sidebar: MenuPage | undefined;

  /** Creates an empty menu; add pages with {@link createPage} and show one with {@link setPage}. */
  constructor(options: MenuOptions) {
    super({
      ...options,
      scrollable: false,
      style: {
        base: mergeStyle(
          {
            bgColor: defaultTheme.backgroundColor,
            borderColor: defaultTheme.borderColor,
            borderWidth: 1,
          },
          options.style?.base,
        ),
        states: options.style?.states,
      },
    });
    this.headerHeight = options.headerHeight ?? DEFAULT_HEADER_HEIGHT;
    this.sidebarWidth = options.sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH;
    this.itemHeight = options.itemHeight ?? DEFAULT_ITEM_HEIGHT;
    this.alwaysShowBack = options.alwaysShowBack ?? false;

    this.sidebarArea = new Container({
      width: 0,
      height: 0,
      scrollable: false,
      hidden: true,
      style: { base: { bgColor: '#f5f5f5' } },
    });
    this.header = new Container({
      width: 0,
      height: this.headerHeight,
      scrollable: false,
      layout: { type: 'flex', direction: 'row', crossAlign: 'center', columnGap: 4 },
      style: {
        base: mergeStyle(
          { bgColor: '#eceff1', padLeft: 4, padRight: 8 },
          options.headerStyle?.base,
        ),
        states: options.headerStyle?.states,
      },
    });
    this.backButton = new Button({
      width: this.headerHeight - 8,
      height: this.headerHeight - 8,
      text: '‹',
    });
    this.backButton.addEventListener('clicked', () => {
      this.back();
    });
    this.titleLabel = new Label({ width: 0, height: this.headerHeight - 8, text: '', flexGrow: 1 });
    this.header.addChild(this.backButton);
    this.header.addChild(this.titleLabel);
    this.mainArea = new Container({ width: 0, height: 0, scrollable: false });
    super.addChild(this.sidebarArea);
    super.addChild(this.header);
    super.addChild(this.mainArea);
    this.refreshHeader();
  }

  /** Every page created, in order. */
  get pages(): readonly MenuPage[] {
    return this.pageList;
  }

  /** The page on show in the main area, or `undefined` before one is set. */
  get currentPage(): MenuPage | undefined {
    return this.stack[this.stack.length - 1];
  }

  /** The page shown in the sidebar, or `undefined`. */
  get sidebarPage(): MenuPage | undefined {
    return this.sidebar;
  }

  /** How many pages are stacked behind the current one, so how many times back can be pressed. */
  get historyDepth(): number {
    return Math.max(0, this.stack.length - 1);
  }

  /** Whether {@link back} has a page to return to. */
  get canGoBack(): boolean {
    return this.stack.length > 1;
  }

  /** Creates a page with an optional `title` for the header. Mirrors `lv_menu_page_create`. */
  createPage(title?: string): MenuPage {
    const page = new MenuPage(title, (from, to) => this.openFrom(from, to), this.itemHeight);
    page.hidden = true;
    this.pageList.push(page);
    this.mainArea.addChild(page);
    return page;
  }

  /** Shows `page` as the root of the main area, clearing the history. Mirrors `lv_menu_set_page`. */
  setPage(page: MenuPage): void {
    this.stack.length = 0;
    this.stack.push(page);
    this.showCurrent();
  }

  /** Shows `page` on top of the current one, so back returns to it. */
  push(page: MenuPage): void {
    if (this.currentPage === page) {
      return;
    }
    this.stack.push(page);
    this.showCurrent();
  }

  /** Returns to the previous page. Returns whether there was one. Mirrors the menu's back button. */
  back(): boolean {
    if (this.stack.length <= 1) {
      return false;
    }
    this.stack.pop();
    this.showCurrent();
    return true;
  }

  /** Shows `page` in the sidebar (or removes it with `undefined`). Mirrors `lv_menu_set_sidebar_page`. */
  setSidebarPage(page: MenuPage | undefined): void {
    if (this.sidebar && this.sidebar !== page) {
      this.sidebar.hidden = true;
      this.mainArea.addChild(this.sidebar);
    }
    this.sidebar = page;
    this.sidebarArea.hidden = page === undefined;
    if (page) {
      this.sidebarArea.addChild(page);
      page.hidden = false;
    }
  }

  /** Opens `to` for a click on an item of `from`: sidebar items replace the root page, others stack. */
  private openFrom(from: MenuColumn, to: MenuPage): void {
    if (this.sidebar && isWithin(from, this.sidebar)) {
      this.setPage(to);
    } else {
      this.push(to);
    }
  }

  /** Makes the top of the stack the only visible page in the main area and updates the header. */
  private showCurrent(): void {
    const current = this.currentPage;
    for (const page of this.pageList) {
      if (page !== this.sidebar) {
        page.hidden = page !== current;
        if (page === current && page.parent !== this.mainArea) {
          this.mainArea.addChild(page);
        }
      }
    }
    this.refreshHeader();
    this.dispatchEvent('valueChanged');
  }

  /** Sets the header's title and shows the back button when it can be used. */
  private refreshHeader(): void {
    this.titleLabel.text = this.currentPage?.title ?? '';
    this.backButton.hidden = !(this.canGoBack || this.alwaysShowBack);
  }

  /** Whether the header takes up room: it has a back button or a title to show. */
  private get headerShown(): boolean {
    return !this.backButton.hidden || this.titleLabel.text !== '';
  }

  /** Places the sidebar, header and main area, and sizes the visible pages to fit. */
  protected override updateLayout(): void {
    this.refreshHeader();
    const sidebarWidth = this.sidebar ? Math.min(this.sidebarWidth, this.width) : 0;
    this.sidebarArea.x = 0;
    this.sidebarArea.y = 0;
    this.sidebarArea.width = sidebarWidth;
    this.sidebarArea.height = this.height;
    const mainWidth = this.width - sidebarWidth;
    const headerHeight = this.headerShown ? this.headerHeight : 0;
    this.header.hidden = headerHeight === 0;
    this.header.x = sidebarWidth;
    this.header.y = 0;
    this.header.width = mainWidth;
    this.header.height = this.headerHeight;
    this.mainArea.x = sidebarWidth;
    this.mainArea.y = headerHeight;
    this.mainArea.width = mainWidth;
    this.mainArea.height = Math.max(0, this.height - headerHeight);
    if (this.sidebar) {
      this.sidebar.x = 0;
      this.sidebar.y = 0;
      this.sidebar.width = sidebarWidth;
      this.sidebar.height = this.height;
    }
    const current = this.currentPage;
    if (current) {
      current.x = 0;
      current.y = 0;
      current.width = mainWidth;
      current.height = this.mainArea.height;
    }
  }

  /** Paints the menu's frame; the header, sidebar and pages are children. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const { x, y } = this.getAbsolutePosition();
    paintBackgroundAndBorder(context, x, y, this.width, this.height, this.resolvedStyle);
  }
}

/** Whether `node` is `ancestor` or sits somewhere inside it. */
function isWithin(node: LvObject, ancestor: LvObject): boolean {
  for (let current: LvObject | null = node; current; current = current.parent) {
    if (current === ancestor) {
      return true;
    }
  }
  return false;
}
