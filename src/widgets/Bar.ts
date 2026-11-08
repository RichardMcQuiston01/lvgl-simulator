import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import { paintBackgroundAndBorder } from '../rendering/box.js';
import { paintRoundedRect } from '../rendering/shapes.js';
import { mergeStyle, resolveStyle, type Style, type StyleSet } from '../style/Style.js';
import { withOpacity } from '../style/color.js';
import { defaultTheme } from '../theme/defaultTheme.js';

/** LVGL's `LV_RADIUS_CIRCLE`: a radius large enough to fully round any box. */
const RADIUS_CIRCLE = 0x7fff;

/** How a {@link Bar} fills, mirroring `lv_bar_mode_t`. */
export type BarMode = 'normal' | 'symmetrical' | 'range';

/** Which way a {@link Bar} runs. `'auto'` is vertical when taller than wide, like LVGL. */
export type BarOrientation = 'auto' | 'horizontal' | 'vertical';

export interface BarOptions extends LvObjectOptions {
  readonly min?: number;
  readonly max?: number;
  readonly value?: number;
  /** Where a `'range'` bar starts filling (default `min`). Mirrors `lv_bar_set_start_value`. */
  readonly startValue?: number;
  readonly mode?: BarMode;
  readonly orientation?: BarOrientation;
  /** Style for the filled part — LVGL's `LV_PART_INDICATOR`. The object's own `style` covers the track (`LV_PART_MAIN`). */
  readonly indicatorStyle?: StyleSet;
}

/**
 * The portion of a bar's track that is filled, as ratios along the track in
 * [0, 1] with `start <= end`. `'normal'` fills from `min` to `value`,
 * `'symmetrical'` from zero (clamped into the range) to `value`, and
 * `'range'` from `startValue` to `value`. Mirrors `lv_bar`'s fill logic.
 */
export function computeBarFill(
  min: number,
  max: number,
  value: number,
  startValue: number,
  mode: BarMode,
): { readonly start: number; readonly end: number } {
  const span = max - min;
  if (span === 0) {
    return { start: 0, end: 0 };
  }
  const ratioOf = (v: number): number => Math.min(1, Math.max(0, (v - min) / span));

  let from: number;
  if (mode === 'symmetrical') {
    from = ratioOf(Math.min(max, Math.max(min, 0)));
  } else if (mode === 'range') {
    from = ratioOf(startValue);
  } else {
    from = 0;
  }
  const to = ratioOf(value);
  return { start: Math.min(from, to), end: Math.max(from, to) };
}

/** A track with a filled indicator, mirroring LVGL's `lv_bar`. */
export class Bar extends LvObject {
  min: number;
  max: number;
  value: number;
  startValue: number;
  mode: BarMode;
  orientation: BarOrientation;
  /** Style for the filled part — LVGL's `LV_PART_INDICATOR`. */
  indicatorStyle: StyleSet;

  /** Creates a bar; the range defaults to 0–100 with the value at `min`. */
  constructor(options: BarOptions) {
    super({
      ...options,
      style: {
        base: mergeStyle(
          { bgColor: defaultTheme.borderColor, radius: RADIUS_CIRCLE },
          options.style?.base,
        ),
        states: options.style?.states,
      },
    });
    this.min = options.min ?? 0;
    this.max = options.max ?? 100;
    this.value = options.value ?? this.min;
    this.startValue = options.startValue ?? this.min;
    this.mode = options.mode ?? 'normal';
    this.orientation = options.orientation ?? 'auto';
    this.indicatorStyle = {
      base: mergeStyle(
        { bgColor: defaultTheme.primaryColor, radius: RADIUS_CIRCLE },
        options.indicatorStyle?.base,
      ),
      states: options.indicatorStyle?.states,
    };
  }

  /** Whether the bar currently runs bottom-to-top. */
  get isVertical(): boolean {
    if (this.orientation === 'auto') {
      return this.height > this.width;
    }
    return this.orientation === 'vertical';
  }

  /** Sets `value` (and optionally `startValue`), dispatching `valueChanged` if anything changed. */
  setValue(value: number, startValue?: number): void {
    const nextStart = startValue ?? this.startValue;
    if (value === this.value && nextStart === this.startValue) {
      return;
    }
    this.value = value;
    this.startValue = nextStart;
    this.dispatchEvent('valueChanged');
  }

  /** The indicator style resolved against this bar's active states. */
  private resolveIndicatorStyle(): Style {
    return resolveStyle(this.indicatorStyle, this.getActiveStates());
  }

  /** Paints the track (background and border), then the indicator over the filled segment. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const style = this.resolvedStyle;
    const indicator = this.resolveIndicatorStyle();
    const { x, y } = this.getAbsolutePosition();
    paintBackgroundAndBorder(context, x, y, this.width, this.height, style);

    const fill = computeBarFill(this.min, this.max, this.value, this.startValue, this.mode);
    if (fill.end <= fill.start) {
      return;
    }

    const color = withOpacity(indicator.bgColor ?? defaultTheme.primaryColor, indicator.bgOpa);
    const radius = indicator.radius ?? 0;
    if (this.isVertical) {
      // Vertical bars fill upward from the bottom.
      const top = y + this.height * (1 - fill.end);
      const length = this.height * (fill.end - fill.start);
      paintRoundedRect(context, x, top, this.width, length, radius, color);
    } else {
      const left = x + this.width * fill.start;
      const length = this.width * (fill.end - fill.start);
      paintRoundedRect(context, left, y, length, this.height, radius, color);
    }
  }
}
