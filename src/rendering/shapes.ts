/**
 * Small Canvas 2D drawing primitives shared by the widgets in `src/widgets`.
 * Kept as plain functions (rather than methods) since they're pure drawing
 * operations with no state of their own.
 */

/** Fills a rounded rectangle. Manual `arcTo` path rather than `roundRect` for wider engine support. */
export function paintRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor: string,
): void {
  traceRoundedRect(context, x, y, width, height, radius);
  context.fillStyle = fillColor;
  context.fill();
}

/** Strokes a rounded rectangle's outline. */
export function paintRoundedRectStroke(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  strokeColor: string,
  lineWidth = 1,
): void {
  traceRoundedRect(context, x, y, width, height, radius);
  context.strokeStyle = strokeColor;
  context.lineWidth = lineWidth;
  context.stroke();
}

function traceRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

/** Fills a circle given its center and radius. */
export function paintCircle(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  fillColor: string,
): void {
  context.beginPath();
  context.arc(centerX, centerY, Math.max(0, radius), 0, Math.PI * 2);
  context.closePath();
  context.fillStyle = fillColor;
  context.fill();
}

/** Strokes a circle's outline given its center and radius. */
export function paintCircleStroke(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  strokeColor: string,
  lineWidth = 1,
): void {
  context.beginPath();
  context.arc(centerX, centerY, Math.max(0, radius), 0, Math.PI * 2);
  context.closePath();
  context.strokeStyle = strokeColor;
  context.lineWidth = lineWidth;
  context.stroke();
}

/** Draws a checkmark inside the `size`x`size` box at (x, y). */
export function paintCheckmark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  strokeColor: string,
): void {
  context.beginPath();
  context.moveTo(x + size * 0.22, y + size * 0.52);
  context.lineTo(x + size * 0.42, y + size * 0.72);
  context.lineTo(x + size * 0.8, y + size * 0.28);
  context.strokeStyle = strokeColor;
  context.lineWidth = Math.max(1, size * 0.12);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.stroke();
}
