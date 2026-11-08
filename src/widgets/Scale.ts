import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import { strokeArc } from '../rendering/arcs.js';
import { mergeStyle, resolveStyle, type Style, type StyleSet } from '../style/Style.js';
import { withOpacity } from '../style/color.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import {
  computeScaleTicks,
  isRoundMode,
  layoutScaleTick,
  scaleAngle,
  scaleRadius,
  type ScaleGeometry,
  type ScaleMode,
  type ScaleTick,
} from './scaleMath.js';

const DEFAULT_FONT_SIZE = 12;
const LABEL_GAP = 4;

/**
 * A value range of a {@link Scale} drawn with its own look, mirroring
 * `lv_scale_section_t`: `mainStyle` recolors that stretch of the line,
 * `indicatorStyle` its major ticks and labels, and `itemsStyle` its minor
 * ticks. Each is a partial style that overrides the scale's own.
 */
export interface ScaleSection {
  readonly min: number;
  readonly max: number;
  readonly mainStyle?: Partial<Style>;
  readonly indicatorStyle?: Partial<Style>;
  readonly itemsStyle?: Partial<Style>;
}

export interface ScaleOptions extends LvObjectOptions {
  readonly mode?: ScaleMode;
  readonly min?: number;
  readonly max?: number;
  /** Total ticks including major ones (default 11). Mirrors `lv_scale_set_total_tick_count`. */
  readonly totalTickCount?: number;
  /** Every n-th tick is major (default 5). Mirrors `lv_scale_set_major_tick_every`. */
  readonly majorTickEvery?: number;
  /** Whether major ticks show labels (default `true`). Mirrors `lv_scale_set_label_show`. */
  readonly labelShow?: boolean;
  /** Custom text for the major ticks in order; defaults to each tick's value. */
  readonly labels?: readonly string[];
  /** Sweep of a round scale in degrees (default 270). Mirrors `lv_scale_set_angle_range`. */
  readonly angleRange?: number;
  /** Angle of a round scale's first tick (default 135). Mirrors `lv_scale_set_rotation`. */
  readonly rotation?: number;
  readonly majorTickLength?: number;
  readonly minorTickLength?: number;
  readonly sections?: readonly ScaleSection[];
  /** Major ticks and labels — LVGL's `LV_PART_INDICATOR`. The object's own `style` covers the line and label text (`LV_PART_MAIN`). */
  readonly indicatorStyle?: StyleSet;
  /** Minor ticks — LVGL's `LV_PART_ITEMS`. */
  readonly itemsStyle?: StyleSet;
}

/**
 * A line with tick marks and labels, linear or round, mirroring LVGL's
 * `lv_scale`. Tick and line strokes use the style's `lineWidth`/`lineColor`/
 * `lineOpa`/`lineRounded`; labels use `textColor`/`textFontSize`/
 * `textFontFamily`. It draws the scale only; a needle is a separate `Line`.
 */
export class Scale extends LvObject {
  mode: ScaleMode;
  min: number;
  max: number;
  totalTickCount: number;
  majorTickEvery: number;
  labelShow: boolean;
  labels: readonly string[] | undefined;
  angleRange: number;
  rotation: number;
  majorTickLength: number;
  minorTickLength: number;
  sections: readonly ScaleSection[];
  /** Major ticks and labels — LVGL's `LV_PART_INDICATOR`. */
  indicatorStyle: StyleSet;
  /** Minor ticks — LVGL's `LV_PART_ITEMS`. */
  itemsStyle: StyleSet;

  /** Creates a scale; the defaults give 11 ticks (a major one every 5th) over 0–100. */
  constructor(options: ScaleOptions) {
    super({
      ...options,
      clickable: options.clickable ?? false,
      style: {
        base: mergeStyle(
          {
            lineWidth: 1,
            lineColor: '#808080',
            lineRounded: false,
            textColor: defaultTheme.textColor,
            textFontSize: DEFAULT_FONT_SIZE,
            textFontFamily: defaultTheme.fontFamily,
          },
          options.style?.base,
        ),
        states: options.style?.states,
      },
    });
    this.mode = options.mode ?? 'horizontalBottom';
    this.min = options.min ?? 0;
    this.max = options.max ?? 100;
    this.totalTickCount = options.totalTickCount ?? 11;
    this.majorTickEvery = options.majorTickEvery ?? 5;
    this.labelShow = options.labelShow ?? true;
    this.labels = options.labels;
    this.angleRange = options.angleRange ?? 270;
    this.rotation = options.rotation ?? 135;
    this.majorTickLength = options.majorTickLength ?? 12;
    this.minorTickLength = options.minorTickLength ?? 6;
    this.sections = options.sections ?? [];
    this.indicatorStyle = {
      base: mergeStyle({ lineWidth: 2, lineColor: '#404040' }, options.indicatorStyle?.base),
      states: options.indicatorStyle?.states,
    };
    this.itemsStyle = {
      base: mergeStyle({ lineWidth: 1, lineColor: '#808080' }, options.itemsStyle?.base),
      states: options.itemsStyle?.states,
    };
  }

  /** The ticks currently laid out for this scale's range and counts. */
  get ticks(): readonly ScaleTick[] {
    return computeScaleTicks(
      this.min,
      this.max,
      this.totalTickCount,
      this.majorTickEvery,
      this.labels,
    );
  }

  /** `tick`'s style: the major or minor base, overridden by every section containing its value. */
  private tickStyle(tick: ScaleTick, major: Style, minor: Style): Style {
    let style = tick.major ? major : minor;
    for (const section of this.sections) {
      if (tick.value >= section.min && tick.value <= section.max) {
        style = mergeStyle(style, tick.major ? section.indicatorStyle : section.itemsStyle);
      }
    }
    return style;
  }

  /** Strokes a straight segment in `style`'s line look. */
  private strokeLine(
    context: CanvasRenderingContext2D,
    from: { readonly x: number; readonly y: number },
    to: { readonly x: number; readonly y: number },
    style: Style,
  ): void {
    const width = style.lineWidth ?? 1;
    if (width <= 0 || style.lineOpa === 0) {
      return;
    }
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.strokeStyle = withOpacity(style.lineColor ?? '#808080', style.lineOpa);
    context.lineWidth = width;
    context.lineCap = style.lineRounded === true ? 'round' : 'butt';
    context.stroke();
  }

  /** Draws the scale's line (or arc) between two ratios, in `style`. */
  private strokeAxis(
    context: CanvasRenderingContext2D,
    geometry: ScaleGeometry,
    originX: number,
    originY: number,
    fromRatio: number,
    toRatio: number,
    style: Style,
  ): void {
    if (isRoundMode(geometry.mode)) {
      strokeArc(
        context,
        originX + geometry.width / 2,
        originY + geometry.height / 2,
        scaleRadius(geometry),
        scaleAngle(geometry, fromRatio),
        scaleAngle(geometry, toRatio),
        {
          arcWidth: style.lineWidth ?? 1,
          arcColor: style.lineColor,
          arcOpa: style.lineOpa,
          arcRounded: style.lineRounded === true,
        },
      );
      return;
    }
    const start = layoutScaleTick(geometry, fromRatio, 0);
    const end = layoutScaleTick(geometry, toRatio, 0);
    this.strokeLine(
      context,
      { x: originX + start.x1, y: originY + start.y1 },
      { x: originX + end.x1, y: originY + end.y1 },
      style,
    );
  }

  /** A value's position along the scale as a ratio clamped to [0, 1]. */
  private ratioOf(value: number): number {
    const span = this.max - this.min;
    return span === 0 ? 0 : Math.min(1, Math.max(0, (value - this.min) / span));
  }

  /** Paints the line, any section highlights over it, then each tick and its label. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    super.paintSelf(context);
    const style = this.resolvedStyle;
    const states = this.getActiveStates();
    const major = resolveStyle(this.indicatorStyle, states);
    const minor = resolveStyle(this.itemsStyle, states);
    const { x: originX, y: originY } = this.getAbsolutePosition();
    const fontSize = style.textFontSize ?? DEFAULT_FONT_SIZE;
    const geometry: ScaleGeometry = {
      mode: this.mode,
      width: this.width,
      height: this.height,
      angleRange: this.angleRange,
      rotation: this.rotation,
      fontSize,
      labelGap: LABEL_GAP,
      majorTickLength: this.majorTickLength,
    };

    this.strokeAxis(context, geometry, originX, originY, 0, 1, style);
    for (const section of this.sections) {
      if (section.mainStyle) {
        this.strokeAxis(
          context,
          geometry,
          originX,
          originY,
          this.ratioOf(section.min),
          this.ratioOf(section.max),
          mergeStyle(style, section.mainStyle),
        );
      }
    }

    for (const tick of this.ticks) {
      const tickStyle = this.tickStyle(tick, major, minor);
      const layout = layoutScaleTick(
        geometry,
        tick.ratio,
        tick.major ? this.majorTickLength : this.minorTickLength,
      );
      this.strokeLine(
        context,
        { x: originX + layout.x1, y: originY + layout.y1 },
        { x: originX + layout.x2, y: originY + layout.y2 },
        tickStyle,
      );

      if (tick.major && this.labelShow && tick.label !== undefined) {
        context.fillStyle = tickStyle.textColor ?? style.textColor ?? defaultTheme.textColor;
        context.font = `${fontSize}px ${style.textFontFamily ?? defaultTheme.fontFamily}`;
        context.textAlign = layout.labelAlign;
        context.textBaseline = layout.labelBaseline;
        context.fillText(tick.label, originX + layout.labelX, originY + layout.labelY);
      }
    }
  }
}
