import type { Style } from '../style/Style.js';
import { withOpacity } from '../style/color.js';
import { defaultTheme } from '../theme/defaultTheme.js';

/** Stroke width used when a style sets no `arcWidth`. */
export const DEFAULT_ARC_WIDTH = 12;

/**
 * Strokes one arc using `style`'s `arcWidth`, `arcColor`, `arcOpa` and
 * `arcRounded`, from `startDegrees` to `endDegrees` clockwise (0° at
 * 3 o'clock). Draws nothing for a zero width, zero opacity, or an empty
 * span. Mirrors LVGL's arc drawing.
 */
export function strokeArc(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  startDegrees: number,
  endDegrees: number,
  style: Style,
): void {
  const width = style.arcWidth ?? DEFAULT_ARC_WIDTH;
  if (width <= 0 || style.arcOpa === 0 || endDegrees <= startDegrees) {
    return;
  }
  // lineCap is sticky canvas state; keep it from leaking into later strokes.
  context.save();
  context.beginPath();
  context.arc(
    centerX,
    centerY,
    Math.max(0, radius),
    (startDegrees * Math.PI) / 180,
    (endDegrees * Math.PI) / 180,
  );
  context.strokeStyle = withOpacity(style.arcColor ?? defaultTheme.borderColor, style.arcOpa);
  context.lineWidth = width;
  context.lineCap = style.arcRounded === false ? 'butt' : 'round';
  context.stroke();
  context.restore();
}
