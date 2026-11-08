import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import type { PointerDraggable } from '../interaction/PointerDraggable.js';
import { paintBackgroundAndBorder } from '../rendering/box.js';
import { paintCircle } from '../rendering/shapes.js';
import { mergeStyle, resolveStyle, type Style, type StyleSet } from '../style/Style.js';
import { withOpacity } from '../style/color.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import {
  arcSweep,
  computeArcIndicator,
  pointerAngle,
  valueFromAngle,
  type ArcMode,
} from './arcMath.js';

const DEFAULT_ARC_WIDTH = 12;
/** How far the knob's radius extends past the indicator arc's own half-width. */
const KNOB_EXTRA = 3;

export interface ArcOptions extends LvObjectOptions {
  readonly min?: number;
  readonly max?: number;
  readonly value?: number;
  /** Background arc start, degrees clockwise from 3 o'clock (default 135). Mirrors `lv_arc_set_bg_start_angle`. */
  readonly bgStartAngle?: number;
  /** Background arc end angle (default 45, giving a 270° arc). Mirrors `lv_arc_set_bg_end_angle`. */
  readonly bgEndAngle?: number;
  /** Rotates the whole arc, degrees clockwise (default 0). Mirrors `lv_arc_set_rotation`. */
  readonly rotation?: number;
  readonly mode?: ArcMode;
  /** Style for the filled arc — LVGL's `LV_PART_INDICATOR` (`arcWidth`, `arcColor`, `arcOpa`, `arcRounded`). The object's own `style` covers the background arc (`LV_PART_MAIN`). */
  readonly indicatorStyle?: StyleSet;
  /** Style for the knob — LVGL's `LV_PART_KNOB`. */
  readonly knobStyle?: StyleSet;
}

/** A circular gauge or dial with a draggable knob, mirroring LVGL's `lv_arc`. */
export class Arc extends LvObject implements PointerDraggable {
  min: number;
  max: number;
  value: number;
  bgStartAngle: number;
  bgEndAngle: number;
  rotation: number;
  mode: ArcMode;
  /** Style for the filled arc — LVGL's `LV_PART_INDICATOR`. */
  indicatorStyle: StyleSet;
  /** Style for the knob — LVGL's `LV_PART_KNOB`. */
  knobStyle: StyleSet;

  /** Creates an arc; the defaults give a 270° dial opening at the bottom, range 0–100. */
  constructor(options: ArcOptions) {
    super({
      ...options,
      style: {
        base: mergeStyle(
          {
            arcWidth: DEFAULT_ARC_WIDTH,
            arcColor: defaultTheme.borderColor,
            arcRounded: true,
          },
          options.style?.base,
        ),
        states: options.style?.states,
      },
    });
    this.min = options.min ?? 0;
    this.max = options.max ?? 100;
    this.value = options.value ?? this.min;
    this.bgStartAngle = options.bgStartAngle ?? 135;
    this.bgEndAngle = options.bgEndAngle ?? 45;
    this.rotation = options.rotation ?? 0;
    this.mode = options.mode ?? 'normal';
    this.indicatorStyle = {
      base: mergeStyle(
        {
          arcWidth: DEFAULT_ARC_WIDTH,
          arcColor: defaultTheme.primaryColor,
          arcRounded: true,
        },
        options.indicatorStyle?.base,
      ),
      states: options.indicatorStyle?.states,
    };
    this.knobStyle = {
      base: mergeStyle({ bgColor: defaultTheme.primaryColor }, options.knobStyle?.base),
      states: options.knobStyle?.states,
    };
  }

  /** The background arc's clockwise sweep in degrees, in (0, 360]. */
  get sweep(): number {
    return arcSweep(this.bgStartAngle, this.bgEndAngle);
  }

  /**
   * Sets `value` from a pointer position local to the arc's top-left (see
   * {@link PointerDraggable}), dispatching `valueChanged` if it changed. A
   * pointer outside the arc's angular range pins the value to the nearer
   * end, like dragging an `lv_arc` knob past its limit.
   */
  handlePointerPosition(localX: number, localY = 0): void {
    const angle = pointerAngle(localX - this.width / 2, localY - this.height / 2) - this.rotation;
    const nextValue = valueFromAngle(angle, this.bgStartAngle, this.sweep, this.min, this.max);
    if (nextValue === this.value) {
      return;
    }
    this.value = nextValue;
    this.dispatchEvent('valueChanged');
  }

  /** Strokes one arc from `startDegrees` to `endDegrees` (clockwise, rotation already applied). */
  private strokeArc(
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
  }

  /** Paints the object box, the background arc, the indicator arc, then the knob at the indicator's end. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const style = this.resolvedStyle;
    const states = this.getActiveStates();
    const indicator = resolveStyle(this.indicatorStyle, states);
    const knob = resolveStyle(this.knobStyle, states);
    const { x, y } = this.getAbsolutePosition();
    paintBackgroundAndBorder(context, x, y, this.width, this.height, style);

    const backgroundWidth = style.arcWidth ?? DEFAULT_ARC_WIDTH;
    const indicatorWidth = indicator.arcWidth ?? DEFAULT_ARC_WIDTH;
    const centerX = x + this.width / 2;
    const centerY = y + this.height / 2;
    const radius =
      Math.min(this.width, this.height) / 2 -
      Math.max(backgroundWidth, indicatorWidth) / 2 -
      KNOB_EXTRA;

    const sweep = this.sweep;
    const startAngle = this.bgStartAngle + this.rotation;
    this.strokeArc(context, centerX, centerY, radius, startAngle, startAngle + sweep, style);

    const fill = computeArcIndicator(this.min, this.max, this.value, this.mode, startAngle, sweep);
    this.strokeArc(context, centerX, centerY, radius, fill.start, fill.end, indicator);

    // The knob sits on the moving end of the indicator.
    const knobAngle = ((this.mode === 'reverse' ? fill.start : fill.end) * Math.PI) / 180;
    paintCircle(
      context,
      centerX + radius * Math.cos(knobAngle),
      centerY + radius * Math.sin(knobAngle),
      indicatorWidth / 2 + KNOB_EXTRA,
      withOpacity(knob.bgColor ?? defaultTheme.primaryColor, knob.bgOpa),
    );
  }
}
