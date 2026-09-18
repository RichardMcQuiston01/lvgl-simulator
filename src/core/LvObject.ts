import { EventEmitter } from '../events/EventEmitter.js';
import type { LvEventMap } from '../events/LvEvent.js';
import { resolveStyle, type LvState, type Style, type StyleSet } from '../style/Style.js';
import { withOpacity } from '../style/color.js';

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
  dispatchEvent<K extends keyof LvEventMap>(type: K): void {
    this.eventEmitter.emit(type, { target: this });
  }

  /** This object's position in the display's coordinate space. */
  getAbsolutePosition(): { readonly x: number; readonly y: number } {
    let x = this.x;
    let y = this.y;
    for (let current = this.parentObject; current; current = current.parentObject) {
      x += current.x;
      y += current.y;
    }
    return { x, y };
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
    const style = this.resolvedStyle;
    if (style.bgColor) {
      const { x, y } = this.getAbsolutePosition();
      context.fillStyle = withOpacity(style.bgColor, style.bgOpa);
      context.fillRect(x, y, this.width, this.height);
    }
  }

  /**
   * Lays out this object's children, paints this object (applying its
   * resolved `opa`, if any — LVGL's overall per-object opacity multiplier;
   * not inherited by children in this simulator, unlike real LVGL), then
   * recurses into its children in order (later children paint over
   * earlier ones, matching LVGL's z-ordering).
   */
  render(context: CanvasRenderingContext2D): void {
    this.updateLayout();

    const opa = this.resolvedStyle.opa;
    if (opa !== undefined && opa < 255) {
      context.save();
      context.globalAlpha = Math.max(0, Math.min(255, opa)) / 255;
      this.paintSelf(context);
      context.restore();
    } else {
      this.paintSelf(context);
    }

    for (const child of this.childObjects) {
      child.render(context);
    }
  }
}
