/**
 * Constructor options for {@link LvObject}.
 */
export interface LvObjectOptions {
  readonly x?: number;
  readonly y?: number;
  readonly width: number;
  readonly height: number;
  readonly backgroundColor?: string;
  /** Share of a flex container's free main-axis space this child grows into. Mirrors LVGL's `flex_grow`. */
  readonly flexGrow?: number;
  /** 0-based grid column track. Mirrors LVGL's `style_grid_cell_column_pos`. Omit to auto-place. */
  readonly gridColumn?: number;
  /** 0-based grid row track. Mirrors LVGL's `style_grid_cell_row_pos`. Omit to auto-place. */
  readonly gridRow?: number;
  readonly gridColumnSpan?: number;
  readonly gridRowSpan?: number;
}

/**
 * A node in the simulator's object tree, mirroring LVGL's `lv_obj_t`
 * parent/child hierarchy. Stage 1 kept this to position, size, a flat
 * background color, and tree structure; Stage 2 adds the `updateLayout`/
 * `paintSelf` hooks that {@link Container} and the widget subclasses build
 * on. The full cascading style/state system is still a later stage.
 */
export class LvObject {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string | undefined;
  flexGrow: number | undefined;
  gridColumn: number | undefined;
  gridRow: number | undefined;
  gridColumnSpan: number | undefined;
  gridRowSpan: number | undefined;

  private parentObject: LvObject | null = null;
  private readonly childObjects: LvObject[] = [];

  constructor(options: LvObjectOptions) {
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.width = options.width;
    this.height = options.height;
    this.backgroundColor = options.backgroundColor;
    this.flexGrow = options.flexGrow;
    this.gridColumn = options.gridColumn;
    this.gridRow = options.gridRow;
    this.gridColumnSpan = options.gridColumnSpan;
    this.gridRowSpan = options.gridRowSpan;
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
    if (this.backgroundColor) {
      const { x, y } = this.getAbsolutePosition();
      context.fillStyle = this.backgroundColor;
      context.fillRect(x, y, this.width, this.height);
    }
  }

  /**
   * Lays out this object's children, paints this object, then recurses
   * into its children in order (later children paint over earlier ones,
   * matching LVGL's z-ordering).
   */
  render(context: CanvasRenderingContext2D): void {
    this.updateLayout();
    this.paintSelf(context);

    for (const child of this.childObjects) {
      child.render(context);
    }
  }
}
