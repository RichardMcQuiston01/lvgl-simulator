import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import { paintBackgroundAndBorder, paintShadow } from '../rendering/box.js';
import { mergeStyle } from '../style/Style.js';
import { mixColors } from '../style/color.js';
import { defaultTheme } from '../theme/defaultTheme.js';

/** LVGL's `LV_RADIUS_CIRCLE`. */
const RADIUS_CIRCLE = 0x7fff;
/** Brightness of a fully lit LED (`LV_LED_BRIGHT_MAX`). */
export const LED_BRIGHTNESS_MAX = 255;
/** Brightness of an "off" LED (`LV_LED_BRIGHT_MIN`): dim, but not black. */
export const LED_BRIGHTNESS_MIN = 80;

export interface LedOptions extends LvObjectOptions {
  /** The lit color as `#rrggbb` (default the theme's primary color). Mirrors `lv_led_set_color`. */
  readonly color?: string;
  /** 0–255; values below {@link LED_BRIGHTNESS_MIN} draw as dim as "off". Default fully on. */
  readonly brightness?: number;
}

/**
 * A round indicator light with adjustable brightness and a glow when lit,
 * mirroring LVGL's `lv_led`. Not clickable by default.
 */
export class Led extends LvObject {
  color: string;
  brightness: number;

  /** Creates an LED that is fully lit unless `brightness` says otherwise. */
  constructor(options: LedOptions) {
    super({
      ...options,
      clickable: options.clickable ?? false,
      style: {
        base: mergeStyle({ radius: RADIUS_CIRCLE, borderWidth: 2 }, options.style?.base),
        states: options.style?.states,
      },
    });
    this.color = options.color ?? defaultTheme.primaryColor;
    this.brightness = Led.clampBrightness(options.brightness ?? LED_BRIGHTNESS_MAX);
  }

  /** Clamps `brightness` into [0, 255]. */
  private static clampBrightness(brightness: number): number {
    return Math.min(LED_BRIGHTNESS_MAX, Math.max(0, brightness));
  }

  /** Lights the LED fully. Mirrors `lv_led_on`. */
  on(): void {
    this.brightness = LED_BRIGHTNESS_MAX;
  }

  /** Dims the LED to its "off" level. Mirrors `lv_led_off`. */
  off(): void {
    this.brightness = LED_BRIGHTNESS_MIN;
  }

  /** Switches between on and off. Mirrors `lv_led_toggle`. */
  toggle(): void {
    if (this.brightness >= LED_BRIGHTNESS_MAX - 1) {
      this.off();
    } else {
      this.on();
    }
  }

  /** Sets the brightness, clamped to 0–255. Mirrors `lv_led_set_brightness`. */
  setBrightness(brightness: number): void {
    this.brightness = Led.clampBrightness(brightness);
  }

  /** The brightness actually drawn: never dimmer than the "off" level. */
  get effectiveBrightness(): number {
    return Math.max(LED_BRIGHTNESS_MIN, this.brightness);
  }

  /** How lit the LED is above its "off" level, as a ratio in [0, 1]; drives the glow. */
  get glowRatio(): number {
    return (
      (this.effectiveBrightness - LED_BRIGHTNESS_MIN) / (LED_BRIGHTNESS_MAX - LED_BRIGHTNESS_MIN)
    );
  }

  /** Paints the glow (scaled by how lit the LED is), then the body tinted by brightness and its border. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const style = this.resolvedStyle;
    const { x, y } = this.getAbsolutePosition();
    const body = mixColors(this.color, '#000000', this.effectiveBrightness / LED_BRIGHTNESS_MAX);
    const drawStyle = {
      ...style,
      bgColor: body,
      borderColor: style.borderColor ?? mixColors('#ffffff', body, 0.3),
      shadowWidth: style.shadowWidth ?? Math.round(15 * this.glowRatio),
      shadowSpread: style.shadowSpread ?? Math.round(5 * this.glowRatio),
      shadowColor: style.shadowColor ?? this.color,
    };
    paintShadow(context, x, y, this.width, this.height, drawStyle);
    paintBackgroundAndBorder(context, x, y, this.width, this.height, drawStyle);
  }
}
