import { LvObject, type LvObjectOptions } from '../core/LvObject';
import { paintCircle, paintCircleStroke, paintRoundedRect } from '../rendering/shapes';
import { mergeStyle, resolveStyle, type StyleSet } from '../style/Style';
import { defaultTheme } from '../theme/defaultTheme';

const MAX_TRACK_HEIGHT = 8;

export interface SliderOptions extends LvObjectOptions {
  readonly min?: number;
  readonly max?: number;
  readonly value?: number;
  /** Style for the filled portion — LVGL's `LV_PART_INDICATOR`. */
  readonly indicatorStyle?: StyleSet;
  /** Style for the knob — LVGL's `LV_PART_KNOB`. The object's own `style` covers the track (`LV_PART_MAIN`). */
  readonly knobStyle?: StyleSet;
}

/** A track with a filled indicator and a draggable knob, mirroring LVGL's `lv_slider`. */
export class Slider extends LvObject {
  min: number;
  max: number;
  value: number;
  /** Style for the filled portion — LVGL's `LV_PART_INDICATOR`. */
  indicatorStyle: StyleSet;
  /** Style for the knob — LVGL's `LV_PART_KNOB`. */
  knobStyle: StyleSet;

  constructor(options: SliderOptions) {
    super({
      ...options,
      style: {
        base: mergeStyle({ bgColor: defaultTheme.borderColor }, options.style?.base),
        states: options.style?.states,
      },
    });
    this.min = options.min ?? 0;
    this.max = options.max ?? 100;
    this.value = options.value ?? this.min;
    this.indicatorStyle = {
      base: mergeStyle({ bgColor: defaultTheme.primaryColor }, options.indicatorStyle?.base),
      states: options.indicatorStyle?.states,
    };
    this.knobStyle = {
      base: mergeStyle(
        {
          bgColor: defaultTheme.backgroundColor,
          borderColor: defaultTheme.borderColor,
          borderWidth: 1,
        },
        options.knobStyle?.base,
      ),
      states: options.knobStyle?.states,
    };
  }

  /** The current value's position along the track, in [0, 1]. */
  get ratio(): number {
    const span = this.max - this.min;
    if (span === 0) {
      return 0;
    }
    return Math.min(1, Math.max(0, (this.value - this.min) / span));
  }

  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const style = this.resolvedStyle;
    const indicator = resolveStyle(this.indicatorStyle, this.getActiveStates());
    const knob = resolveStyle(this.knobStyle, this.getActiveStates());
    const { x, y } = this.getAbsolutePosition();
    const trackHeight = Math.min(this.height, MAX_TRACK_HEIGHT);
    const trackY = y + (this.height - trackHeight) / 2;
    const trackRadius = trackHeight / 2;

    paintRoundedRect(
      context,
      x,
      trackY,
      this.width,
      trackHeight,
      trackRadius,
      style.bgColor ?? defaultTheme.borderColor,
    );

    const filledWidth = this.width * this.ratio;
    if (filledWidth > 0) {
      paintRoundedRect(
        context,
        x,
        trackY,
        filledWidth,
        trackHeight,
        trackRadius,
        indicator.bgColor ?? defaultTheme.primaryColor,
      );
    }

    const knobRadius = this.height / 2;
    const knobCenterX = x + filledWidth;
    const knobCenterY = y + this.height / 2;
    paintCircle(
      context,
      knobCenterX,
      knobCenterY,
      knobRadius,
      knob.bgColor ?? defaultTheme.backgroundColor,
    );
    paintCircleStroke(
      context,
      knobCenterX,
      knobCenterY,
      knobRadius,
      knob.borderColor ?? defaultTheme.borderColor,
      knob.borderWidth,
    );
  }
}
