import { easings } from '../animation/easing.js';
import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import { paintBackgroundAndBorder } from '../rendering/box.js';
import { DEFAULT_ARC_WIDTH, strokeArc } from '../rendering/arcs.js';
import { mergeStyle, resolveStyle, type StyleSet } from '../style/Style.js';
import { defaultTheme } from '../theme/defaultTheme.js';

export interface SpinnerOptions extends LvObjectOptions {
  /** Time for one full revolution in ms (default 1000). Mirrors `lv_spinner_set_anim_params`. */
  readonly spinTimeMs?: number;
  /** Length of the spinning arc in degrees (default 60). */
  readonly arcLengthDegrees?: number;
  /** Clock in ms, defaulting to `performance.now()`. Inject one for deterministic output. */
  readonly now?: () => number;
  /** Style for the spinning arc — LVGL's `LV_PART_INDICATOR`. The object's own `style` covers the background ring (`LV_PART_MAIN`). */
  readonly indicatorStyle?: StyleSet;
}

/**
 * A ring with a spinning arc, mirroring LVGL's `lv_spinner`. Its angle comes
 * from the clock at paint time, so it moves while the simulator repaints
 * every frame (`simulator.start()`); under `renderOnce()` it shows a single
 * frame. Not clickable by default. The arc length is constant, a
 * simplification of LVGL's pulsing arc.
 */
export class Spinner extends LvObject {
  spinTimeMs: number;
  arcLengthDegrees: number;
  /** Style for the spinning arc — LVGL's `LV_PART_INDICATOR`. */
  indicatorStyle: StyleSet;

  private readonly now: () => number;
  private readonly startedAt: number;

  /** Creates a spinner whose revolution starts counting from construction. */
  constructor(options: SpinnerOptions) {
    super({
      ...options,
      clickable: options.clickable ?? false,
      style: {
        base: mergeStyle(
          { arcWidth: DEFAULT_ARC_WIDTH, arcColor: defaultTheme.borderColor, arcRounded: true },
          options.style?.base,
        ),
        states: options.style?.states,
      },
    });
    this.spinTimeMs = options.spinTimeMs ?? 1000;
    this.arcLengthDegrees = options.arcLengthDegrees ?? 60;
    this.indicatorStyle = {
      base: mergeStyle(
        { arcWidth: DEFAULT_ARC_WIDTH, arcColor: defaultTheme.primaryColor, arcRounded: true },
        options.indicatorStyle?.base,
      ),
      states: options.indicatorStyle?.states,
    };
    this.now = options.now ?? ((): number => performance.now());
    this.startedAt = this.now();
  }

  /** The arc's leading start angle in degrees at the current time, eased like LVGL's spin. */
  get currentAngle(): number {
    if (this.spinTimeMs <= 0) {
      return 0;
    }
    const elapsed = Math.max(0, this.now() - this.startedAt);
    const fraction = (elapsed % this.spinTimeMs) / this.spinTimeMs;
    return 360 * easings.easeInOut(fraction);
  }

  /** Paints the background ring, then the spinning arc at the current angle. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const style = this.resolvedStyle;
    const indicator = resolveStyle(this.indicatorStyle, this.getActiveStates());
    const { x, y } = this.getAbsolutePosition();
    paintBackgroundAndBorder(context, x, y, this.width, this.height, style);

    const width = Math.max(
      style.arcWidth ?? DEFAULT_ARC_WIDTH,
      indicator.arcWidth ?? DEFAULT_ARC_WIDTH,
    );
    const centerX = x + this.width / 2;
    const centerY = y + this.height / 2;
    const radius = Math.min(this.width, this.height) / 2 - width / 2;

    strokeArc(context, centerX, centerY, radius, 0, 360, style);
    const start = this.currentAngle;
    strokeArc(context, centerX, centerY, radius, start, start + this.arcLengthDegrees, indicator);
  }
}
