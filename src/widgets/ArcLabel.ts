import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import { paintBackgroundAndBorder } from '../rendering/box.js';
import { mergeStyle } from '../style/Style.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import { fontString, textMeasurer } from '../text/measureText.js';
import { layoutArcLabel, type ArcLabelAlign, type ArcLabelDirection } from './arcLabelMath.js';

/** Height of a glyph above its baseline, as a multiple of the font size. */
const ASCENT_RATIO = 0.8;

/** Whether the glyphs sit outside or inside the circle that `radius` names. */
export type ArcLabelVerticalAlign = 'outside' | 'inside';

export interface ArcLabelOptions extends LvObjectOptions {
  readonly text?: string;
  /** Radius of the circle the text hugs. Default: the largest that leaves room for the text inside the box. */
  readonly radius?: number;
  /** Where the text begins, in degrees clockwise from 3 o'clock (default 180, i.e. 9 o'clock). Mirrors `lv_arclabel_set_angle_start`. */
  readonly startAngle?: number;
  /** How far round the text may run, in degrees (default 180). Mirrors `lv_arclabel_set_angle_size`. */
  readonly sweepAngle?: number;
  /** Which way the text runs (default clockwise). Mirrors `lv_arclabel_set_dir`. */
  readonly direction?: ArcLabelDirection;
  /** Where the text sits within the sweep (default centered). */
  readonly align?: ArcLabelAlign;
  /** Whether the glyphs stand outside or inside the circle (default outside). Mirrors `lv_arclabel_set_text_vertical_align`. */
  readonly verticalAlign?: ArcLabelVerticalAlign;
  /** Shifts the circle's centre from the middle of the box. Mirrors `lv_arclabel_set_center_offset_x`/`y`. */
  readonly centerOffsetX?: number;
  readonly centerOffsetY?: number;
}

/**
 * Text set along an arc, mirroring LVGL's `lv_arclabel` (LVGL 9.3+): each
 * glyph is rotated to stand on a circle, for curved titles and dial labels.
 * Text longer than the sweep is cut off at its end. Glyph widths are measured
 * one character at a time, so kerning between glyphs is not applied.
 */
export class ArcLabel extends LvObject {
  text: string;
  radius: number | undefined;
  startAngle: number;
  sweepAngle: number;
  direction: ArcLabelDirection;
  align: ArcLabelAlign;
  verticalAlign: ArcLabelVerticalAlign;
  centerOffsetX: number;
  centerOffsetY: number;

  /** Creates an arc label; with the defaults, centered text arches across the top of the box. */
  constructor(options: ArcLabelOptions) {
    super({
      ...options,
      style: {
        base: mergeStyle(
          {
            textColor: defaultTheme.textColor,
            textFontSize: defaultTheme.fontSize,
            textFontFamily: defaultTheme.fontFamily,
          },
          options.style?.base,
        ),
        states: options.style?.states,
      },
    });
    this.text = options.text ?? '';
    this.radius = options.radius;
    this.startAngle = options.startAngle ?? 180;
    this.sweepAngle = options.sweepAngle ?? 180;
    this.direction = options.direction ?? 'clockwise';
    this.align = options.align ?? 'center';
    this.verticalAlign = options.verticalAlign ?? 'outside';
    this.centerOffsetX = options.centerOffsetX ?? 0;
    this.centerOffsetY = options.centerOffsetY ?? 0;
  }

  /**
   * The radius the glyph baselines run along. The circle named by `radius`
   * is the edge the glyphs touch, so the baseline moves by a glyph's height
   * depending on which side of the circle the glyphs stand and which way
   * their tops point (outward for clockwise text, inward for counterclockwise).
   */
  private baselineRadius(circleRadius: number, fontSize: number): number {
    const height = fontSize * ASCENT_RATIO;
    const outside = this.verticalAlign === 'outside';
    if (this.direction === 'clockwise') {
      return outside ? circleRadius : circleRadius - height;
    }
    return outside ? circleRadius + height : circleRadius;
  }

  /** Paints the box, then each glyph translated onto the circle and rotated to stand on it. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const style = this.resolvedStyle;
    const { x, y } = this.getAbsolutePosition();
    paintBackgroundAndBorder(context, x, y, this.width, this.height, style);

    const fontSize = style.textFontSize ?? defaultTheme.fontSize;
    const font = fontString(fontSize, style.textFontFamily ?? defaultTheme.fontFamily);
    const characters = [...this.text];
    const widths = characters.map((character) => textMeasurer.measure(context, character, font));

    const circleRadius =
      this.radius ?? Math.max(0, Math.min(this.width, this.height) / 2 - fontSize);
    const baseline = this.baselineRadius(circleRadius, fontSize);
    const placements = layoutArcLabel(
      widths,
      baseline,
      this.startAngle,
      this.sweepAngle,
      this.direction,
      this.align,
    );

    const centerX = x + this.width / 2 + this.centerOffsetX;
    const centerY = y + this.height / 2 + this.centerOffsetY;
    context.font = font;
    context.fillStyle = style.textColor ?? defaultTheme.textColor;
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    for (const placement of placements) {
      const radians = (placement.angle * Math.PI) / 180;
      context.save();
      context.translate(
        centerX + baseline * Math.cos(radians),
        centerY + baseline * Math.sin(radians),
      );
      context.rotate((placement.rotation * Math.PI) / 180);
      context.fillText(characters[placement.index] ?? '', 0, 0);
      context.restore();
    }
  }
}
