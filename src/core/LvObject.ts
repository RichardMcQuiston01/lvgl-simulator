/**
 * Constructor options for {@link LvObject}.
 */
export interface LvObjectOptions {
  readonly x?: number;
  readonly y?: number;
  readonly width: number;
  readonly height: number;
  readonly backgroundColor?: string;
}

/**
 * A node in the simulator's object tree, mirroring LVGL's `lv_obj_t`
 * parent/child hierarchy. Stage 1 keeps this deliberately minimal
 * (position, size, a flat background color, and tree structure) — the
 * cascading style/state system and widget subclasses land in later stages.
 */
export class LvObject {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string | undefined;

  private parentObject: LvObject | null = null;
  private readonly childObjects: LvObject[] = [];

  constructor(options: LvObjectOptions) {
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.width = options.width;
    this.height = options.height;
    this.backgroundColor = options.backgroundColor;
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
   * Draws this object's background, then recurses into its children in
   * order (later children paint over earlier ones, matching LVGL's
   * z-ordering).
   */
  render(context: CanvasRenderingContext2D): void {
    if (this.backgroundColor) {
      const { x, y } = this.getAbsolutePosition();
      context.fillStyle = this.backgroundColor;
      context.fillRect(x, y, this.width, this.height);
    }

    for (const child of this.childObjects) {
      child.render(context);
    }
  }
}
