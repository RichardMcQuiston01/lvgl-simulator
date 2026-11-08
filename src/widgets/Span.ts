import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import { paintBackgroundAndBorder } from '../rendering/box.js';
import { mergeStyle, type Style } from '../style/Style.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import { fontString, textMeasurer } from '../text/measureText.js';
import {
  layoutSpans,
  truncateLineWithEllipsis,
  type SpanInput,
  type SpanLine,
} from '../text/spanLayout.js';

/** Width of a character, as a multiple of the font size, until a canvas is available to measure with. */
const FALLBACK_CHAR_RATIO = 0.6;

/** One run of text with its own look: `style` overrides the group's text color, size, family and decoration. */
export interface SpanDefinition {
  readonly text: string;
  readonly style?: Partial<Style>;
}

/**
 * How a {@link Span} sizes itself, mirroring `lv_span_mode_t`: `'fixed'` keeps
 * its size and clips, `'break'` keeps its width and grows its height to fit
 * the wrapped text, and `'expand'` is one line that grows its width.
 */
export type SpanMode = 'fixed' | 'break' | 'expand';

/** What happens to text that does not fit, mirroring `lv_span_overflow_t`. */
export type SpanOverflow = 'clip' | 'ellipsis';

export interface SpanOptions extends LvObjectOptions {
  readonly spans?: readonly SpanDefinition[];
  readonly mode?: SpanMode;
  readonly overflow?: SpanOverflow;
  /** Most lines to show (default: as many as fit). Mirrors `lv_spangroup_set_max_lines`. */
  readonly maxLines?: number;
  /** Extra space before the first line. Mirrors `lv_spangroup_set_indent`. */
  readonly indent?: number;
  /** Extra space added to every line's height. */
  readonly lineSpacing?: number;
}

/**
 * Rich text, mirroring LVGL's `lv_spangroup`: runs of text that each have their
 * own color, size, family and underline/strikethrough, wrapping together and
 * sharing a baseline. The object's own style sets the defaults and the
 * horizontal alignment (`textAlign`). A run can break onto the next line
 * between spans even where there is no whitespace. In `'break'` and
 * `'expand'` modes the object resizes itself when painted, so siblings laid
 * out by a flex or grid parent pick up the new size on the next repaint.
 */
export class Span extends LvObject {
  spans: readonly SpanDefinition[];
  mode: SpanMode;
  overflow: SpanOverflow;
  maxLines: number | undefined;
  indent: number;
  lineSpacing: number;

  private measureContext: CanvasRenderingContext2D | undefined;

  /** Creates a span group; with no `mode` the width is fixed and the height follows the text. */
  constructor(options: SpanOptions) {
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
    this.spans = options.spans ?? [];
    this.mode = options.mode ?? 'break';
    this.overflow = options.overflow ?? 'clip';
    this.maxLines = options.maxLines;
    this.indent = options.indent ?? 0;
    this.lineSpacing = options.lineSpacing ?? 0;
  }

  /** Replaces all the runs. Mirrors removing and re-adding spans on an `lv_spangroup`. */
  setSpans(spans: readonly SpanDefinition[]): void {
    this.spans = spans;
  }

  /** Appends a run. Mirrors `lv_spangroup_add_span`. */
  addSpan(span: SpanDefinition): void {
    this.spans = [...this.spans, span];
  }

  /** The group's text as one string, without styling. */
  get text(): string {
    return this.spans.map((span) => span.text).join('');
  }

  /** The resolved style of the run at `index`: the group's own, overridden by the run's. */
  private styleOf(index: number): Style {
    return mergeStyle(this.resolvedStyle, this.spans[index]?.style);
  }

  private fontOf(index: number): string {
    const style = this.styleOf(index);
    return fontString(
      style.textFontSize ?? defaultTheme.fontSize,
      style.textFontFamily ?? defaultTheme.fontFamily,
    );
  }

  /** Measures text in the run at `index`: with the real canvas once painted, by estimate before that. */
  private measure = (text: string, index: number): number => {
    const context = this.measureContext;
    if (context) {
      return textMeasurer.measure(context, text, this.fontOf(index));
    }
    const size = this.styleOf(index).textFontSize ?? defaultTheme.fontSize;
    return text.length * size * FALLBACK_CHAR_RATIO;
  };

  /** The inset content box the text is laid out in. */
  private get contentBox(): { left: number; top: number; width: number; height: number } {
    const style = this.resolvedStyle;
    const left = style.padLeft ?? 0;
    const top = style.padTop ?? 0;
    return {
      left,
      top,
      width: Math.max(0, this.width - left - (style.padRight ?? 0)),
      height: Math.max(0, this.height - top - (style.padBottom ?? 0)),
    };
  }

  /**
   * The lines to draw: laid out for the current size, cut to `maxLines` (and,
   * in fixed mode, to the lines that fit the height), with the last visible
   * line ending in an ellipsis when `overflow` asks for one.
   */
  private visibleLines(): readonly SpanLine[] {
    const box = this.contentBox;
    const inputs: SpanInput[] = this.spans.map((_span, index) => ({
      text: this.spans[index]?.text ?? '',
      fontSize: this.styleOf(index).textFontSize ?? defaultTheme.fontSize,
    }));
    const wrapWidth = this.mode === 'expand' ? 0 : box.width;
    const all = layoutSpans(inputs, this.measure, {
      maxWidth: wrapWidth,
      indent: this.indent,
      lineSpacing: this.lineSpacing,
    });

    let limit = this.maxLines ?? all.length;
    if (this.mode === 'fixed') {
      let used = 0;
      let fitting = 0;
      for (const line of all) {
        if (used + line.height > box.height && fitting > 0) {
          break;
        }
        used += line.height;
        fitting += 1;
      }
      limit = Math.min(limit, fitting);
    }
    limit = Math.max(1, limit);

    const lines = all.slice(0, limit);
    if (this.overflow === 'ellipsis' && all.length > limit) {
      const last = lines[lines.length - 1];
      if (last) {
        lines[lines.length - 1] = truncateLineWithEllipsis(last, this.measure, wrapWidth);
      }
    }
    return lines;
  }

  /** Paints the box, then each visible line's runs on a shared baseline, with any underline or strikethrough. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    this.measureContext = context;
    const style = this.resolvedStyle;
    const lines = this.visibleLines();

    // Grow to fit the text in the modes that ask for it.
    const textHeight = lines.reduce((sum, line) => sum + line.height, 0);
    if (this.mode !== 'fixed') {
      this.height = (style.padTop ?? 0) + (style.padBottom ?? 0) + textHeight;
    }
    if (this.mode === 'expand') {
      const widest = lines.reduce((largest, line) => Math.max(largest, line.width), 0);
      this.width = (style.padLeft ?? 0) + (style.padRight ?? 0) + widest;
    }

    const { x, y } = this.getAbsolutePosition();
    paintBackgroundAndBorder(context, x, y, this.width, this.height, style);

    const box = this.contentBox;
    context.save();
    context.beginPath();
    context.rect(x + box.left, y + box.top, box.width, box.height);
    context.clip();
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';

    let lineTop = y + box.top;
    for (const line of lines) {
      const free = Math.max(0, box.width - line.width);
      const alignShift =
        style.textAlign === 'center' ? free / 2 : style.textAlign === 'right' ? free : 0;
      const baselineY = lineTop + line.baseline;
      for (const fragment of line.fragments) {
        const runStyle = this.styleOf(fragment.spanIndex);
        const fontSize = runStyle.textFontSize ?? defaultTheme.fontSize;
        const left = x + box.left + alignShift + fragment.x;
        context.font = this.fontOf(fragment.spanIndex);
        context.fillStyle = runStyle.textColor ?? defaultTheme.textColor;
        context.fillText(fragment.text, left, baselineY);

        const thickness = Math.max(1, Math.round(fontSize / 14));
        if (runStyle.textDecor === 'underline') {
          context.fillRect(left, baselineY + thickness, fragment.width, thickness);
        } else if (runStyle.textDecor === 'strikethrough') {
          context.fillRect(left, baselineY - fontSize * 0.3, fragment.width, thickness);
        }
      }
      lineTop += line.height;
    }
    context.restore();
  }
}
