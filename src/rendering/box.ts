import { withOpacity } from '../style/color.js';
import type { Style } from '../style/Style.js';
import { paintRoundedRectStroke, traceRoundedRect } from './shapes.js';

/** How far off-canvas the shadow caster is drawn, so only its shadow shows. */
const SHADOW_CASTER_OFFSET = 100_000;

/**
 * Draws `style`'s shadow behind the box at (x, y, width, height). Canvas
 * only draws shadows for a shape it also paints, so the casting shape is
 * drawn far off-screen with the shadow offset compensating — leaving just
 * the shadow visible, even when the box itself has no background.
 */
export function paintShadow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  style: Style,
): void {
  const blur = style.shadowWidth ?? 0;
  if (blur <= 0 || style.shadowOpa === 0) {
    return;
  }
  const spread = style.shadowSpread ?? 0;

  context.save();
  context.shadowColor = withOpacity(style.shadowColor ?? '#000000', style.shadowOpa ?? 255);
  context.shadowBlur = blur;
  context.shadowOffsetX = (style.shadowOffsetX ?? 0) + SHADOW_CASTER_OFFSET;
  context.shadowOffsetY = style.shadowOffsetY ?? 0;
  traceRoundedRect(
    context,
    x - spread - SHADOW_CASTER_OFFSET,
    y - spread,
    width + spread * 2,
    height + spread * 2,
    (style.radius ?? 0) + spread,
  );
  context.fillStyle = '#000000';
  context.fill();
  context.restore();
}

/** Fills the box's background (solid or two-stop gradient, honoring `radius`) and strokes its border. */
export function paintBackgroundAndBorder(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  style: Style,
): void {
  const radius = style.radius ?? 0;

  if (style.bgColor) {
    let fill: string | CanvasGradient = withOpacity(style.bgColor, style.bgOpa);
    const direction = style.bgGradDir ?? 'none';
    if (direction !== 'none' && style.bgGradColor) {
      const gradient =
        direction === 'ver'
          ? context.createLinearGradient(x, y, x, y + height)
          : context.createLinearGradient(x, y, x + width, y);
      gradient.addColorStop(0, withOpacity(style.bgColor, style.bgOpa));
      gradient.addColorStop(1, withOpacity(style.bgGradColor, style.bgOpa));
      fill = gradient;
    }

    if (radius > 0) {
      traceRoundedRect(context, x, y, width, height, radius);
      context.fillStyle = fill;
      context.fill();
    } else {
      context.fillStyle = fill;
      context.fillRect(x, y, width, height);
    }
  }

  const borderWidth = style.borderWidth ?? 0;
  if (borderWidth > 0 && style.borderColor && style.borderOpa !== 0) {
    const inset = borderWidth / 2;
    paintRoundedRectStroke(
      context,
      x + inset,
      y + inset,
      width - borderWidth,
      height - borderWidth,
      Math.max(0, radius - inset),
      withOpacity(style.borderColor, style.borderOpa),
      borderWidth,
    );
  }
}

/** Strokes the outline just outside the box, `outlinePad` away from its edge. */
export function paintOutline(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  style: Style,
  outlineWidth: number,
  outlineColor: string,
  outlinePad: number,
): void {
  if (outlineWidth <= 0 || style.outlineOpa === 0) {
    return;
  }
  const grow = outlinePad + outlineWidth / 2;
  paintRoundedRectStroke(
    context,
    x - grow,
    y - grow,
    width + grow * 2,
    height + grow * 2,
    (style.radius ?? 0) + grow,
    withOpacity(outlineColor, style.outlineOpa),
    outlineWidth,
  );
}
