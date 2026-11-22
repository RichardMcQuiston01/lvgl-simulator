import type { AnimationEngine, AnimationHandle } from '../animation/Animation.js';
import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import type { PointerDraggable } from '../interaction/PointerDraggable.js';
import { paintBackgroundAndBorder } from '../rendering/box.js';
import { paintRoundedRect } from '../rendering/shapes.js';
import { mergeStyle, resolveStyle, type LvState, type StyleSet } from '../style/Style.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import { Container } from './Container.js';
import {
  activeIndexAt,
  tabButtonRects,
  tabIndicatorRect,
  tabviewLayout,
  type TabPosition,
  type TabRect,
} from './tabviewMath.js';

const DEFAULT_BAR_SIZE = 40;
const DEFAULT_SIDE_BAR_SIZE = 90;
const DEFAULT_INDICATOR_THICKNESS = 3;

export interface TabviewOptions extends LvObjectOptions {
  /** Which edge the tab bar sits on (default `'top'`). Mirrors `lv_tabview_set_tab_bar_position`. */
  readonly tabPosition?: TabPosition;
  /** Thickness of the tab bar: its height for `'top'`/`'bottom'`, its width for `'left'`/`'right'` (default 40 or 90). Mirrors `lv_tabview_set_tab_bar_size`. */
  readonly tabBarSize?: number;
  /** Names of tabs to add up front; each makes an empty page. */
  readonly tabs?: readonly string[];
  /** Style for the tab bar. */
  readonly barStyle?: StyleSet;
  /** Style for the tab buttons — LVGL's `LV_PART_ITEMS`. Its `states.checked` styles the active tab and `states.pressed` a pressed one. */
  readonly tabStyle?: StyleSet;
  /** Color of the line under the active tab (default the theme's primary color). */
  readonly indicatorColor?: string;
  /** Thickness of that line (default 3). */
  readonly indicatorThickness?: number;
  /** Animates switching tabs when given; without it a tab switch jumps straight to the page. */
  readonly animations?: AnimationEngine;
}

/**
 * Pages you switch between with a bar of tabs, mirroring LVGL's
 * `lv_tabview`. Add pages with {@link addTab} (each a {@link Container} you
 * fill) and click a tab or swipe sideways to change page; the pages sit side
 * by side in a scrolling area that snaps to a whole page, so a swipe, a throw
 * and the wheel all behave like any other scroll. A page that is taller than
 * the view scrolls vertically on its own. The bar can sit on any edge.
 * Fires `valueChanged` when the active tab changes.
 */
export class Tabview extends LvObject implements PointerDraggable {
  tabPosition: TabPosition;
  tabBarSize: number;
  indicatorColor: string;
  indicatorThickness: number;
  /** Style for the tab bar. */
  barStyle: StyleSet;
  /** Style for the tab buttons — LVGL's `LV_PART_ITEMS`. */
  tabStyle: StyleSet;

  /** The scrolling area that holds the pages side by side. */
  private readonly scroller: LvObject;
  private readonly tabNames: string[] = [];
  private readonly pageList: Container[] = [];
  private committedIndex = 0;
  private pressedTab: number | undefined;
  private releasedTab: number | undefined;
  private readonly animations: AnimationEngine | undefined;
  private switching: AnimationHandle | undefined;
  private snapping = false;

  /** Creates a tab view, adding a page for each of `options.tabs`. */
  constructor(options: TabviewOptions) {
    super({
      ...options,
      scrollable: options.scrollable ?? false,
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
    this.tabPosition = options.tabPosition ?? 'top';
    const sideBar = this.tabPosition === 'left' || this.tabPosition === 'right';
    this.tabBarSize = options.tabBarSize ?? (sideBar ? DEFAULT_SIDE_BAR_SIZE : DEFAULT_BAR_SIZE);
    this.indicatorColor = options.indicatorColor ?? defaultTheme.primaryColor;
    this.indicatorThickness = options.indicatorThickness ?? DEFAULT_INDICATOR_THICKNESS;
    this.animations = options.animations;
    this.barStyle = {
      base: mergeStyle({ bgColor: '#eceff1' }, options.barStyle?.base),
      states: options.barStyle?.states,
    };
    this.tabStyle = {
      base: mergeStyle(
        {
          textColor: '#455a64',
          textFontSize: defaultTheme.fontSize,
          textFontFamily: defaultTheme.fontFamily,
        },
        options.tabStyle?.base,
      ),
      states: {
        checked: { textColor: defaultTheme.primaryColor },
        pressed: { bgColor: '#dde3e7' },
        ...options.tabStyle?.states,
      },
    };

    this.scroller = new LvObject({
      width: this.width,
      height: this.height,
      scrollDirection: 'horizontal',
      scrollbarMode: 'off',
      scrollSnapX: 'start',
      clickable: false,
    });
    super.addChild(this.scroller);
    this.scroller.addEventListener('scrollEnd', () => this.commit(this.displayedIndex));
    this.scroller.addEventListener('scroll', () => {
      // A scroll no drag is driving (a horizontal wheel) has no scrollEnd, so settle it here.
      if (!this.scroller.scrolling && !this.switching && !this.snapping) {
        this.snapToDisplayed();
      }
    });

    this.addEventListener('pressed', () => {
      this.releasedTab = undefined;
    });
    this.addEventListener('released', () => {
      this.releasedTab = this.pressedTab;
      this.pressedTab = undefined;
    });
    this.addEventListener('clicked', () => {
      const index = this.releasedTab;
      this.releasedTab = undefined;
      if (index !== undefined) {
        this.setActive(index, true);
      }
    });
    this.addEventListener('key', (event) => {
      if (event.key === 'ArrowLeft') {
        this.setActive(this.committedIndex - 1, true);
      } else if (event.key === 'ArrowRight') {
        this.setActive(this.committedIndex + 1, true);
      }
    });

    for (const name of options.tabs ?? []) {
      this.addTab(name);
    }
  }

  /** How many tabs there are. */
  get tabCount(): number {
    return this.pageList.length;
  }

  /** The tabs' names, in order. */
  get names(): readonly string[] {
    return this.tabNames;
  }

  /** The tabs' pages, in order. Mirrors `lv_tabview_get_content` (one page per tab). */
  get pages(): readonly Container[] {
    return this.pageList;
  }

  /** The index of the active tab: the page the view has settled on. Mirrors `lv_tabview_get_tab_active`. */
  get activeIndex(): number {
    return this.committedIndex;
  }

  /** The page nearest the view right now, which follows a swipe as it happens. */
  get displayedIndex(): number {
    return activeIndexAt(this.scroller.scrollX, this.pageWidth, this.pageList.length);
  }

  /** Adds a tab named `name` with an empty page, and returns the page to fill. Mirrors `lv_tabview_add_tab`. */
  addTab(name: string): Container {
    const page = new Container({
      width: this.pageWidth,
      height: this.pageHeight,
      scrollDirection: 'vertical',
      style: { base: { bgColor: defaultTheme.backgroundColor } },
    });
    this.tabNames.push(name);
    this.pageList.push(page);
    this.scroller.addChild(page);
    this.layoutPages();
    return page;
  }

  /**
   * Switches to tab `index` (kept within the tabs), easing there when the view
   * has an animation engine and `animate` is true. Fires `valueChanged` once
   * the page is reached if the tab changed. Mirrors `lv_tabview_set_active`.
   */
  setActive(index: number, animate = false): void {
    if (this.pageList.length === 0) {
      return;
    }
    this.cancelSwitching();
    const target = Math.min(this.pageList.length - 1, Math.max(0, Math.floor(index)));
    const destination = target * this.pageWidth;
    const from = this.scroller.scrollX;
    if (!animate || !this.animations || Math.abs(destination - from) < 1) {
      this.scroller.scrollTo(destination, 0);
      this.commit(target);
      return;
    }
    this.switching = this.animations.start({
      from,
      to: destination,
      durationMs: 250,
      easing: 'easeOut',
      onUpdate: (value) => {
        this.scroller.scrollTo(value, 0);
      },
      onComplete: () => {
        this.switching = undefined;
        this.scroller.scrollTo(destination, 0);
        this.commit(target);
      },
    });
  }

  /** Tracks which tab is under the pointer while pressed (see {@link PointerDraggable}). */
  handlePointerPosition(localX: number, localY = 0): void {
    const { bar } = this.regions();
    const rects = tabButtonRects(bar, this.tabPosition, this.pageList.length);
    const index = rects.findIndex(
      (rect) =>
        localX >= rect.x &&
        localX < rect.x + rect.width &&
        localY >= rect.y &&
        localY < rect.y + rect.height,
    );
    this.pressedTab = index === -1 ? undefined : index;
  }

  /** The tab bar's and page area's rectangles, inside the border. */
  private regions(): { readonly bar: TabRect; readonly content: TabRect } {
    return tabviewLayout(this.width, this.height, this.tabPosition, this.tabBarSize);
  }

  private get pageWidth(): number {
    return this.regions().content.width;
  }

  private get pageHeight(): number {
    return this.regions().content.height;
  }

  /** Places the scrolling area over the page region and each page in its slot, keeping the active page in view. */
  private layoutPages(): void {
    const { content } = this.regions();
    this.scroller.x = content.x;
    this.scroller.y = content.y;
    this.scroller.width = content.width;
    this.scroller.height = content.height;
    this.pageList.forEach((page, index) => {
      page.x = index * content.width;
      page.y = 0;
      page.width = content.width;
      page.height = content.height;
    });
    if (!this.scroller.scrolling && !this.switching) {
      this.scroller.scrollX = Math.min(
        Math.max(0, (this.pageList.length - 1) * content.width),
        this.committedIndex * content.width,
      );
    }
  }

  /** Snaps the pages onto the one nearest the scroll position and makes it the active tab. */
  private snapToDisplayed(): void {
    const index = this.displayedIndex;
    this.snapping = true;
    this.scroller.scrollTo(index * this.pageWidth, 0);
    this.snapping = false;
    this.commit(index);
  }

  /** Makes `index` the active tab, firing `valueChanged` if it changed. */
  private commit(index: number): void {
    if (index === this.committedIndex) {
      return;
    }
    this.committedIndex = index;
    this.dispatchEvent('valueChanged');
  }

  /** Stops a tab-switch animation where it is. */
  private cancelSwitching(): void {
    this.switching?.cancel();
    this.switching = undefined;
  }

  /** Follows the view's size: re-places the pages when it changes. */
  protected override updateLayout(): void {
    this.layoutPages();
  }

  /** Paints the border box, the tab bar with its buttons and the moving indicator. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const { x, y } = this.getAbsolutePosition();
    paintBackgroundAndBorder(context, x, y, this.width, this.height, this.resolvedStyle);

    const { bar } = this.regions();
    const barStyle = resolveStyle(this.barStyle, new Set());
    paintBackgroundAndBorder(context, x + bar.x, y + bar.y, bar.width, bar.height, barStyle);

    const rects = tabButtonRects(bar, this.tabPosition, this.pageList.length);
    const displayed = this.displayedIndex;
    rects.forEach((rect, index) => {
      const states = new Set<LvState>();
      if (index === displayed) {
        states.add('checked');
      }
      if (index === this.pressedTab) {
        states.add('pressed');
      }
      const style = resolveStyle(this.tabStyle, states);
      paintBackgroundAndBorder(context, x + rect.x, y + rect.y, rect.width, rect.height, style);
      context.fillStyle = style.textColor ?? defaultTheme.textColor;
      context.font = `${style.textFontSize ?? defaultTheme.fontSize}px ${style.textFontFamily ?? defaultTheme.fontFamily}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(
        this.tabNames[index] ?? '',
        x + rect.x + rect.width / 2,
        y + rect.y + rect.height / 2,
      );
    });

    const indicator = this.indicatorRect(rects);
    if (indicator) {
      paintRoundedRect(
        context,
        x + indicator.x,
        y + indicator.y,
        indicator.width,
        indicator.height,
        0,
        this.indicatorColor,
      );
    }
  }

  /** The active-tab marker's rectangle in the tab view's coordinates, sliding between two tabs' marks as the pages scroll between them; `undefined` without tabs. */
  get indicatorBounds(): TabRect | undefined {
    const rects = tabButtonRects(this.regions().bar, this.tabPosition, this.pageList.length);
    return this.indicatorRect(rects);
  }

  /** The indicator's rectangle for the current scroll position, given the tab buttons' rectangles. */
  private indicatorRect(rects: readonly TabRect[]): TabRect | undefined {
    if (rects.length === 0 || this.pageWidth <= 0) {
      return undefined;
    }
    const progress = Math.min(
      rects.length - 1,
      Math.max(0, this.scroller.scrollX / this.pageWidth),
    );
    const lower = Math.floor(progress);
    const upper = Math.min(rects.length - 1, lower + 1);
    const fraction = progress - lower;
    const from = tabIndicatorRect(
      rects[lower] as TabRect,
      this.tabPosition,
      this.indicatorThickness,
    );
    const to = tabIndicatorRect(rects[upper] as TabRect, this.tabPosition, this.indicatorThickness);
    return {
      x: from.x + (to.x - from.x) * fraction,
      y: from.y + (to.y - from.y) * fraction,
      width: from.width,
      height: from.height,
    };
  }
}
