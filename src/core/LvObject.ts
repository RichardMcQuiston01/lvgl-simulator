import { EventEmitter } from '../events/EventEmitter.js';
import type { LvEventDetailArgs, LvEventMap } from '../events/LvEvent.js';
import { resolveStyle, type LvState, type Style, type StyleSet } from '../style/Style.js';
import { withOpacity } from '../style/color.js';
import { paintBackgroundAndBorder, paintOutline, paintShadow } from '../rendering/box.js';
import { paintRoundedRect, traceRoundedRect } from '../rendering/shapes.js';
import { applyTransform, resolveTransform } from '../rendering/transform.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import {
  computeScrollRange,
  type ScrollDirection,
  type ScrollRange,
  type ScrollSnap,
  type ScrollbarMode,
} from '../scroll/scrollMath.js';

/**
 * Constructor options for {@link LvObject}.
 */
export interface LvObjectOptions {
  readonly x?: number;
  readonly y?: number;
  readonly width: number;
  readonly height: number;
  readonly style?: StyleSet;
  /** Share of a flex container's free main-axis space this child grows into. Mirrors LVGL's `flex_grow`. */
  readonly flexGrow?: number;
  /** 0-based grid column track. Mirrors LVGL's `style_grid_cell_column_pos`. Omit to auto-place. */
  readonly gridColumn?: number;
  /** 0-based grid row track. Mirrors LVGL's `style_grid_cell_row_pos`. Omit to auto-place. */
  readonly gridRow?: number;
  readonly gridColumnSpan?: number;
  readonly gridRowSpan?: number;
  readonly pressed?: boolean;
  readonly disabled?: boolean;
  readonly focused?: boolean;
  /** Hides this object and its subtree: not painted, not laid out, not hit-testable. Mirrors `LV_OBJ_FLAG_HIDDEN`. */
  readonly hidden?: boolean;
  /** Whether pointer input can target this object (default `true`). Mirrors `LV_OBJ_FLAG_CLICKABLE`. */
  readonly clickable?: boolean;
  /** Whether this object scrolls when its content overflows (default `true`). Mirrors `LV_OBJ_FLAG_SCROLLABLE`. */
  readonly scrollable?: boolean;
  /** Keeps this object out of its parent's flex/grid layout and positioned by its own x/y. Mirrors `LV_OBJ_FLAG_FLOATING`. */
  readonly floating?: boolean;
  /** Excludes this object from its parent's flex/grid layout. Mirrors `LV_OBJ_FLAG_IGNORE_LAYOUT`. */
  readonly ignoreLayout?: boolean;
  /** Whether a focus group's Enter key puts this object into edit mode (encoder-style). Mirrors `lv_obj_class` `editable`. */
  readonly editable?: boolean;
  /** Axes this object scrolls on (default `'all'`). Mirrors `lv_obj_set_scroll_dir`. */
  readonly scrollDirection?: ScrollDirection;
  /** Scrollbar visibility (default `'auto'`). Mirrors `lv_obj_set_scrollbar_mode`. */
  readonly scrollbarMode?: ScrollbarMode;
  /** Horizontal snap alignment when a scroll settles. Mirrors `lv_obj_set_scroll_snap_x`. */
  readonly scrollSnapX?: ScrollSnap;
  /** Vertical snap alignment when a scroll settles. Mirrors `lv_obj_set_scroll_snap_y`. */
  readonly scrollSnapY?: ScrollSnap;
}

/**
 * A node in the simulator's object tree, mirroring LVGL's `lv_obj_t`
 * parent/child hierarchy. Position, size, and tree structure (Stage 1);
 * `updateLayout`/`paintSelf` hooks that {@link Container} and the widget
 * subclasses build on (Stage 2); a `StyleSet` resolved against this
 * object's active `LvState`s (Stage 3) — see `src/style/Style.ts`.
 */
export class LvObject {
  x: number;
  y: number;
  width: number;
  height: number;
  style: StyleSet;
  flexGrow: number | undefined;
  gridColumn: number | undefined;
  gridRow: number | undefined;
  gridColumnSpan: number | undefined;
  gridRowSpan: number | undefined;
  pressed: boolean;
  disabled: boolean;
  focused: boolean;
  hidden: boolean;
  clickable: boolean;
  scrollable: boolean;
  floating: boolean;
  ignoreLayout: boolean;
  editable: boolean;
  scrollDirection: ScrollDirection;
  scrollbarMode: ScrollbarMode;
  scrollSnapX: ScrollSnap;
  scrollSnapY: ScrollSnap;
  /** Horizontal scroll offset: how far the content is shifted left. Mirrors `lv_obj_get_scroll_x`. */
  scrollX = 0;
  /** Vertical scroll offset: how far the content is shifted up. Mirrors `lv_obj_get_scroll_y`. */
  scrollY = 0;
  /** True while a scroll gesture or throw is in progress; drives the `'active'` scrollbar mode. */
  scrolling = false;

  private parentObject: LvObject | null = null;
  private readonly childObjects: LvObject[] = [];
  private readonly eventEmitter = new EventEmitter<LvEventMap>();

  constructor(options: LvObjectOptions) {
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.width = options.width;
    this.height = options.height;
    this.style = options.style ?? { base: {} };
    this.flexGrow = options.flexGrow;
    this.gridColumn = options.gridColumn;
    this.gridRow = options.gridRow;
    this.gridColumnSpan = options.gridColumnSpan;
    this.gridRowSpan = options.gridRowSpan;
    this.pressed = options.pressed ?? false;
    this.disabled = options.disabled ?? false;
    this.focused = options.focused ?? false;
    this.hidden = options.hidden ?? false;
    this.clickable = options.clickable ?? true;
    this.scrollable = options.scrollable ?? true;
    this.floating = options.floating ?? false;
    this.ignoreLayout = options.ignoreLayout ?? false;
    this.editable = options.editable ?? false;
    this.scrollDirection = options.scrollDirection ?? 'all';
    this.scrollbarMode = options.scrollbarMode ?? 'auto';
    this.scrollSnapX = options.scrollSnapX ?? 'none';
    this.scrollSnapY = options.scrollSnapY ?? 'none';
  }

  /** Whether the parent's flex/grid layout positions this object. */
  get participatesInLayout(): boolean {
    return !this.hidden && !this.floating && !this.ignoreLayout;
  }

  get parent(): LvObject | null {
    return this.parentObject;
  }

  get children(): readonly LvObject[] {
    return this.childObjects;
  }

  /** Appends `child` to this object, detaching it from any previous parent. */
  addChild(child: LvObject): void {
    child.parentObject?.removeChild(child);
    child.parentObject = this;
    this.childObjects.push(child);
  }

  /** Removes `child` from this object. No-op if it is not a child. */
  removeChild(child: LvObject): void {
    const index = this.childObjects.indexOf(child);
    if (index === -1) {
      return;
    }
    this.childObjects.splice(index, 1);
    child.parentObject = null;
  }

  /**
   * Subscribes `listener` to `type`, mirroring `lv_obj_add_event_cb`.
   * See {@link LvEventMap} for the event types this simulator dispatches.
   */
  addEventListener<K extends keyof LvEventMap>(
    type: K,
    listener: (event: LvEventMap[K]) => void,
  ): void {
    this.eventEmitter.on(type, listener);
  }

  /** Unsubscribes `listener` from `type`. No-op if it was never added. */
  removeEventListener<K extends keyof LvEventMap>(
    type: K,
    listener: (event: LvEventMap[K]) => void,
  ): void {
    this.eventEmitter.off(type, listener);
  }

  /**
   * Fires `type` on this object with `{ target: this }`, mirroring LVGL
   * dispatching an event to an object's registered callbacks. Called by
   * the interaction controller (`src/interaction/`) for pointer-driven
   * events, and by widgets reacting to their own input (e.g. `Checkbox`
   * toggling on `clicked`).
   */
  dispatchEvent<K extends keyof LvEventMap>(type: K, ...detail: LvEventDetailArgs<K>): void {
    this.eventEmitter.emit(type, { ...detail[0], target: this } as unknown as LvEventMap[K]);
  }

  /** This object's position in the display's coordinate space, accounting for ancestors' scroll offsets. */
  getAbsolutePosition(): { readonly x: number; readonly y: number } {
    let x = this.x;
    let y = this.y;
    for (let current = this.parentObject; current; current = current.parentObject) {
      x += current.x - current.scrollX;
      y += current.y - current.scrollY;
    }
    return { x, y };
  }

  /**
   * Padding that insets this object's children and therefore counts toward
   * its scrollable area. Zero here: manually positioned children keep their
   * own x/y relative to the border box (see {@link updateLayout});
   * {@link Container} overrides this when its layout applies the padding.
   */
  get scrollContentInsets(): {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  } {
    return { left: 0, top: 0, right: 0, bottom: 0 };
  }

  /** The offsets this object can scroll to. See {@link computeScrollRange}. */
  getScrollRange(): ScrollRange {
    return computeScrollRange(this);
  }

  /** Whether this object's content overflows on an axis it scrolls on, or is already scrolled. */
  get isScrollable(): boolean {
    const range = this.getScrollRange();
    return (
      range.maxX > range.minX || range.maxY > range.minY || this.scrollX !== 0 || this.scrollY !== 0
    );
  }

  /**
   * Scrolls to the offsets `(x, y)`, clamped to {@link getScrollRange} and
   * to the axes in `scrollDirection`. Dispatches `scroll` if anything
   * moved; returns whether it did. Mirrors `lv_obj_scroll_to`.
   */
  scrollTo(x: number, y: number): boolean {
    const range = this.getScrollRange();
    const nextX = Math.max(range.minX, Math.min(range.maxX, x));
    const nextY = Math.max(range.minY, Math.min(range.maxY, y));
    if (nextX === this.scrollX && nextY === this.scrollY) {
      return false;
    }
    this.scrollX = nextX;
    this.scrollY = nextY;
    this.dispatchEvent('scroll');
    return true;
  }

  /** Scrolls by `(dx, dy)` from the current offsets. Mirrors `lv_obj_scroll_by` (with the opposite sign: positive scrolls toward later content). */
  scrollBy(dx: number, dy: number): boolean {
    return this.scrollTo(this.scrollX + dx, this.scrollY + dy);
  }

  /** Scrolls the minimum distance that brings `child` fully into view. Mirrors `lv_obj_scroll_to_view`. */
  scrollToView(child: LvObject): boolean {
    let nextX = this.scrollX;
    let nextY = this.scrollY;
    if (child.x < this.scrollX) {
      nextX = child.x;
    } else if (child.x + child.width > this.scrollX + this.width) {
      nextX = child.x + child.width - this.width;
    }
    if (child.y < this.scrollY) {
      nextY = child.y;
    } else if (child.y + child.height > this.scrollY + this.height) {
      nextY = child.y + child.height - this.height;
    }
    return this.scrollTo(nextX, nextY);
  }

  /**
   * This object's own currently-active LVGL states, used to resolve
   * `style` (and any other per-part `StyleSet`s a subclass defines).
   * Subclasses with their own state-like fields (e.g. `Checkbox.checked`)
   * override this and fold theirs in via `super.getActiveStates()`.
   */
  protected getActiveStates(): ReadonlySet<LvState> {
    const states = new Set<LvState>();
    if (this.pressed) {
      states.add('pressed');
    }
    if (this.disabled) {
      states.add('disabled');
    }
    if (this.focused) {
      states.add('focused');
    }
    return states;
  }

  /** `style` resolved against this object's currently active states. */
  get resolvedStyle(): Style {
    return resolveStyle(this.style, this.getActiveStates());
  }

  /**
   * Positions this object's children (relative to its own content origin).
   * The base class does no layout — children keep whatever x/y/width/height
   * they were given (LVGL's default "manual" positioning). {@link Container}
   * overrides this to apply flex/grid layout.
   */
  protected updateLayout(): void {}

  /**
   * Paints this object's own visuals (background, etc), before its
   * children are painted. Widget subclasses override this to draw
   * widget-specific content instead of/in addition to a flat fill.
   */
  protected paintSelf(context: CanvasRenderingContext2D): void {
    const { x, y } = this.getAbsolutePosition();
    paintBackgroundAndBorder(context, x, y, this.width, this.height, this.resolvedStyle);
  }

  /**
   * Lays out this object's children, paints this object (applying its
   * resolved `opa`, if any — LVGL's overall per-object opacity multiplier;
   * not inherited by children in this simulator, unlike real LVGL), then
   * recurses into its children in order (later children paint over
   * earlier ones, matching LVGL's z-ordering).
   */
  render(context: CanvasRenderingContext2D): void {
    if (this.hidden) {
      return;
    }
    this.updateLayout();

    const style = this.resolvedStyle;
    const { x, y } = this.getAbsolutePosition();
    const transform = resolveTransform(style);
    if (transform) {
      // Rotation/scale apply to this object and its whole subtree.
      context.save();
      applyTransform(context, transform, x, y);
    }

    const opa = style.opa;
    const fades = opa !== undefined && opa < 255;
    if (fades) {
      context.save();
      context.globalAlpha = Math.max(0, Math.min(255, opa)) / 255;
    }
    paintShadow(context, x, y, this.width, this.height, style);
    this.paintSelf(context);
    this.paintOutlineFor(context, style, x, y);
    if (fades) {
      context.restore();
    }

    const clipsScroll = this.isScrollable;
    const clipsCorners = style.clipCorner === true && (style.radius ?? 0) > 0;
    const clips = clipsScroll || clipsCorners;
    if (clips) {
      context.save();
      if (clipsCorners) {
        traceRoundedRect(context, x, y, this.width, this.height, style.radius ?? 0);
      } else {
        context.beginPath();
        context.rect(x, y, this.width, this.height);
      }
      context.clip();
    }
    for (const child of this.childObjects) {
      child.render(context);
    }
    if (clips) {
      context.restore();
    }
    if (clipsScroll) {
      this.paintScrollbars(context);
    }

    if (transform) {
      context.restore();
    }
  }

  /** Draws the style's outline, or the theme's focus outline when focused and no outline is set. */
  private paintOutlineFor(
    context: CanvasRenderingContext2D,
    style: Style,
    x: number,
    y: number,
  ): void {
    if (style.outlineWidth !== undefined) {
      paintOutline(
        context,
        x,
        y,
        this.width,
        this.height,
        style,
        style.outlineWidth,
        style.outlineColor ?? defaultTheme.focusOutlineColor,
        style.outlinePad ?? 0,
      );
    } else if (this.focused) {
      paintOutline(
        context,
        x,
        y,
        this.width,
        this.height,
        style,
        defaultTheme.focusOutlineWidth,
        defaultTheme.focusOutlineColor,
        defaultTheme.focusOutlinePad,
      );
    }
  }

  /** Draws vertical/horizontal scrollbars per `scrollbarMode`, over the children. */
  protected paintScrollbars(context: CanvasRenderingContext2D): void {
    const mode = this.scrollbarMode;
    if (mode === 'off' || (mode === 'active' && !this.scrolling)) {
      return;
    }
    const range = this.getScrollRange();
    const { x, y } = this.getAbsolutePosition();
    const thickness = 4;
    const inset = 2;
    const color = withOpacity('#808080', 160);

    const verticalSpan = range.maxY - range.minY;
    if (verticalSpan > 0) {
      const track = this.height - inset * 2;
      const thumb = Math.max(12, (track * this.height) / (this.height + verticalSpan));
      const top = y + inset + ((this.scrollY - range.minY) / verticalSpan) * (track - thumb);
      paintRoundedRect(
        context,
        x + this.width - thickness - inset,
        top,
        thickness,
        thumb,
        2,
        color,
      );
    }
    const horizontalSpan = range.maxX - range.minX;
    if (horizontalSpan > 0) {
      const track = this.width - inset * 2;
      const thumb = Math.max(12, (track * this.width) / (this.width + horizontalSpan));
      const left = x + inset + ((this.scrollX - range.minX) / horizontalSpan) * (track - thumb);
      paintRoundedRect(
        context,
        left,
        y + this.height - thickness - inset,
        thumb,
        thickness,
        2,
        color,
      );
    }
  }
}
