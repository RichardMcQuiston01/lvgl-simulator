import { LvObject, type LvObjectOptions } from '../core/LvObject';
import { paintCircle, paintCircleStroke, paintRoundedRect } from '../rendering/shapes';
import { defaultTheme } from '../theme/defaultTheme';

const MAX_TRACK_HEIGHT = 8;

export interface SliderOptions extends LvObjectOptions {
  readonly min?: number;
  readonly max?: number;
  readonly value?: number;
}

/** A track with a filled indicator and a draggable knob, mirroring LVGL's `lv_slider`. */
export class Slider extends LvObject {
  min: number;
  max: number;
  value: number;

  constructor(options: SliderOptions) {
    super(options);
    this.min = options.min ?? 0;
    this.max = options.max ?? 100;
    this.value = options.value ?? this.min;
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
      defaultTheme.borderColor,
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
        defaultTheme.primaryColor,
      );
    }

    const knobRadius = this.height / 2;
    const knobCenterX = x + filledWidth;
    const knobCenterY = y + this.height / 2;
    paintCircle(context, knobCenterX, knobCenterY, knobRadius, defaultTheme.backgroundColor);
    paintCircleStroke(context, knobCenterX, knobCenterY, knobRadius, defaultTheme.borderColor);
  }
}
