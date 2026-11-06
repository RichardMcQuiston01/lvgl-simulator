import type { Style } from '../style/Style.js';

/** LVGL's identity scale: `transform_scale` of 256 is 100%. */
const IDENTITY_SCALE = 256;

export interface ResolvedTransform {
  /** Rotation in radians (LVGL stores 0.1° units). */
  readonly rotation: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly pivotX: number;
  readonly pivotY: number;
}

/** The object's transform from its style, or `null` when it is the identity. */
export function resolveTransform(style: Style): ResolvedTransform | null {
  const rotation = ((style.transformRotation ?? 0) / 10) * (Math.PI / 180);
  const scaleX = (style.transformScaleX ?? IDENTITY_SCALE) / IDENTITY_SCALE;
  const scaleY = (style.transformScaleY ?? IDENTITY_SCALE) / IDENTITY_SCALE;
  if (rotation === 0 && scaleX === 1 && scaleY === 1) {
    return null;
  }
  return {
    rotation,
    scaleX,
    scaleY,
    pivotX: style.transformPivotX ?? 0,
    pivotY: style.transformPivotY ?? 0,
  };
}

/** Applies `transform` to `context` around the pivot, given the object's absolute top-left. */
export function applyTransform(
  context: CanvasRenderingContext2D,
  transform: ResolvedTransform,
  originX: number,
  originY: number,
): void {
  const pivotX = originX + transform.pivotX;
  const pivotY = originY + transform.pivotY;
  context.translate(pivotX, pivotY);
  context.rotate(transform.rotation);
  context.scale(transform.scaleX, transform.scaleY);
  context.translate(-pivotX, -pivotY);
}

/** Maps a point from display space into the object's own untransformed space (the inverse of {@link applyTransform}). */
export function inverseTransformPoint(
  transform: ResolvedTransform,
  originX: number,
  originY: number,
  x: number,
  y: number,
): { readonly x: number; readonly y: number } {
  const pivotX = originX + transform.pivotX;
  const pivotY = originY + transform.pivotY;
  const dx = x - pivotX;
  const dy = y - pivotY;
  const cos = Math.cos(-transform.rotation);
  const sin = Math.sin(-transform.rotation);
  return {
    x: pivotX + (dx * cos - dy * sin) / transform.scaleX,
    y: pivotY + (dx * sin + dy * cos) / transform.scaleY,
  };
}
