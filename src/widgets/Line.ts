import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import { mergeStyle } from '../style/Style.js';
import { withOpacity } from '../style/color.js';
import { defaultTheme } from '../theme/defaultTheme.js';

const DEFAULT_LINE_WIDTH = 2;

/** A point of a {@link Line}, relative to the line object's top-left corner. */
export interface LinePoint {
  readonly x: number;
  readonly y: number;
}

export interface LineOptions extends Omit<LvObjectOptions, 'width' | 'height'> {
  /** Omit to size the object to the points' extent, like `lv_line`. */
  readonly width?: number;
  /** Omit to size the object to the points' extent, like `lv_line`. */
  readonly height?: number;
  readonly points?: readonly LinePoint[];
  /** Flips the points vertically within the object's height. Mirrors `lv_line_set_y_invert`. */
  readonly yInvert?: boolean;
}

/**
 * A polyline through a list of points, mirroring LVGL's `lv_line`. Stroke
 * comes from the style's `lineWidth`, `lineColor`, `lineOpa` and
 * `lineRounded`. Without an explicit width/height the object resizes to fit
 * its points whenever they change.
 */
export class Line extends LvObject {
  yInvert: boolean;

  private pointList: readonly LinePoint[];
  private readonly autoWidth: boolean;
  private readonly autoHeight: boolean;

  /** Creates a line; an omitted width or height tracks the points' extent. */
  constructor(options: LineOptions) {
    const points = options.points ?? [];
    super({
      ...options,
      width: options.width ?? Line.extentOf(points).width,
      height: options.height ?? Line.extentOf(points).height,
      style: {
        base: mergeStyle(
          {
            lineWidth: DEFAULT_LINE_WIDTH,
            lineColor: defaultTheme.primaryColor,
            lineRounded: true,
          },
          options.style?.base,
        ),
        states: options.style?.states,
      },
    });
    this.pointList = points;
    this.autoWidth = options.width === undefined;
    this.autoHeight = options.height === undefined;
    this.yInvert = options.yInvert ?? false;
  }

  /** The largest x and y among `points` (never below 0), which is how `lv_line` sizes itself. */
  private static extentOf(points: readonly LinePoint[]): { width: number; height: number } {
    let width = 0;
    let height = 0;
    for (const point of points) {
      width = Math.max(width, point.x);
      height = Math.max(height, point.y);
    }
    return { width, height };
  }

  get points(): readonly LinePoint[] {
    return this.pointList;
  }

  /** Replaces the points, resizing any axis that was left to auto-size. Mirrors `lv_line_set_points`. */
  setPoints(points: readonly LinePoint[]): void {
    this.pointList = points;
    const extent = Line.extentOf(points);
    if (this.autoWidth) {
      this.width = extent.width;
    }
    if (this.autoHeight) {
      this.height = extent.height;
    }
  }

  /** Paints the object's own background, then strokes the polyline. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    super.paintSelf(context);
    const style = this.resolvedStyle;
    const width = style.lineWidth ?? DEFAULT_LINE_WIDTH;
    if (this.pointList.length < 2 || width <= 0 || style.lineOpa === 0) {
      return;
    }

    const { x, y } = this.getAbsolutePosition();
    // Cap and join are sticky canvas state; keep them from leaking into later strokes.
    context.save();
    context.beginPath();
    this.pointList.forEach((point, index) => {
      const pointX = x + point.x;
      const pointY = y + (this.yInvert ? this.height - point.y : point.y);
      if (index === 0) {
        context.moveTo(pointX, pointY);
      } else {
        context.lineTo(pointX, pointY);
      }
    });
    context.strokeStyle = withOpacity(style.lineColor ?? defaultTheme.primaryColor, style.lineOpa);
    context.lineWidth = width;
    const rounded = style.lineRounded !== false;
    context.lineCap = rounded ? 'round' : 'butt';
    context.lineJoin = rounded ? 'round' : 'miter';
    context.stroke();
    context.restore();
  }
}
