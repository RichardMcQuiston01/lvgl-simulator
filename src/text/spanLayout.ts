/**
 * Pure layout for rich text made of runs ("spans") that each have their own
 * font size, shared by the `Span` widget. Words wrap across span boundaries,
 * each line is as tall as its largest run, and all runs on a line share one
 * baseline. Everything goes through a `measure` callback, so it needs no
 * canvas and is exactly testable.
 */

/** A run of text and the font size it is drawn in. */
export interface SpanInput {
  readonly text: string;
  readonly fontSize: number;
}

/** Measures `text` as drawn in the span at `spanIndex`. */
export type MeasureSpanText = (text: string, spanIndex: number) => number;

/** A piece of one span placed on a line. */
export interface SpanFragment {
  readonly spanIndex: number;
  readonly text: string;
  /** Horizontal position within the line, before alignment. */
  readonly x: number;
  readonly width: number;
}

/** One laid-out line. */
export interface SpanLine {
  readonly fragments: readonly SpanFragment[];
  /** Width of the line's text, ignoring trailing whitespace. */
  readonly width: number;
  /** Height of the line: its largest font size times the line-height ratio, plus line spacing. */
  readonly height: number;
  /** Distance from the line's top to the baseline every run shares. */
  readonly baseline: number;
}

export interface SpanLayoutOptions {
  /** Width to wrap at; zero or less means no wrapping (only `\n` breaks). */
  readonly maxWidth: number;
  /** Extra space before the first line. */
  readonly indent: number;
  /** Extra space added to every line's height. */
  readonly lineSpacing: number;
}

/** Line height as a multiple of the font size. */
export const SPAN_LINE_HEIGHT_RATIO = 1.3;
/** Baseline's distance from the line top, as a multiple of the font size. */
const BASELINE_RATIO = 0.95;

interface WorkingFragment {
  spanIndex: number;
  text: string;
  x: number;
  width: number;
}

/** `text` without trailing whitespace. */
function trimEnd(text: string): string {
  return text.replace(/\s+$/, '');
}

/**
 * Lays `spans` out into lines. A `\n` always breaks. When wrapping, a line
 * breaks before a word that would overflow, and a word wider than a whole
 * line is split by character. Whitespace hanging off the end of a wrapped
 * line is dropped. Consecutive pieces of the same span on a line are merged.
 */
export function layoutSpans(
  spans: readonly SpanInput[],
  measure: MeasureSpanText,
  options: SpanLayoutOptions,
): readonly SpanLine[] {
  const lines: SpanLine[] = [];
  let fragments: WorkingFragment[] = [];
  let cursor = options.indent;
  let lastFontSize = spans[0]?.fontSize ?? 0;

  /** Closes the current line: trims trailing whitespace, measures it, records it, and starts the next at x = 0. */
  function finishLine(): void {
    // Drop trailing whitespace on the last fragment, then measure the line.
    const last = fragments[fragments.length - 1];
    if (last) {
      const trimmed = trimEnd(last.text);
      if (trimmed === '') {
        fragments.pop();
      } else if (trimmed !== last.text) {
        last.text = trimmed;
        last.width = measure(trimmed, last.spanIndex);
      }
    }
    const tail = fragments[fragments.length - 1];
    const width = tail ? tail.x + tail.width : 0;
    const fontSize = fragments.reduce(
      (largest, fragment) => Math.max(largest, spans[fragment.spanIndex]?.fontSize ?? 0),
      fragments.length === 0 ? lastFontSize : 0,
    );
    lines.push({
      fragments: fragments.map((fragment) => ({ ...fragment })),
      width,
      height: Math.round(fontSize * SPAN_LINE_HEIGHT_RATIO) + options.lineSpacing,
      baseline: fontSize * BASELINE_RATIO,
    });
    fragments = [];
    cursor = 0;
  }

  /** Adds `text` to the current line, merging it into the previous fragment when that is the same span. */
  function place(spanIndex: number, text: string, width: number): void {
    const previous = fragments[fragments.length - 1];
    if (previous && previous.spanIndex === spanIndex) {
      previous.text += text;
      previous.width = measure(previous.text, spanIndex);
    } else {
      fragments.push({ spanIndex, text, x: cursor, width });
    }
    const tail = fragments[fragments.length - 1];
    cursor = tail ? tail.x + tail.width : cursor;
  }

  spans.forEach((span, spanIndex) => {
    lastFontSize = span.fontSize;
    span.text.split('\n').forEach((segment, segmentIndex) => {
      if (segmentIndex > 0) {
        finishLine();
      }
      for (const token of segment.match(/\S+\s*|\s+/g) ?? []) {
        const trimmedWidth = measure(trimEnd(token), spanIndex);
        const fits = options.maxWidth <= 0 || cursor + trimmedWidth <= options.maxWidth;
        if (!fits && fragments.length > 0) {
          finishLine();
        }

        const roomy = options.maxWidth <= 0 || cursor + trimmedWidth <= options.maxWidth;
        if (roomy) {
          place(spanIndex, token, measure(token, spanIndex));
          continue;
        }
        // The token alone is wider than a whole line: split it by character.
        let rest = token;
        while (rest !== '') {
          let length = 1;
          while (
            length < rest.length &&
            cursor + measure(rest.slice(0, length + 1), spanIndex) <= options.maxWidth
          ) {
            length += 1;
          }
          const piece = rest.slice(0, length);
          place(spanIndex, piece, measure(piece, spanIndex));
          rest = rest.slice(length);
          if (rest !== '') {
            finishLine();
          }
        }
      }
    });
  });
  finishLine();
  return lines;
}

/**
 * `line` with its end replaced by `ellipsis` so it fits in `maxWidth`:
 * characters are removed from the last fragment (and whole fragments, if
 * need be) until the text plus the ellipsis fits. Returns the line
 * unchanged when `maxWidth` is not positive. Mirrors a span group's
 * ellipsis overflow.
 */
export function truncateLineWithEllipsis(
  line: SpanLine,
  measure: MeasureSpanText,
  maxWidth: number,
  ellipsis = '…',
): SpanLine {
  if (maxWidth <= 0) {
    return line;
  }
  const fragments = line.fragments.map((fragment) => ({ ...fragment }));
  while (fragments.length > 0) {
    const last = fragments[fragments.length - 1];
    if (!last) {
      break;
    }
    let text = trimEnd(last.text);
    while (text !== '' && last.x + measure(text + ellipsis, last.spanIndex) > maxWidth) {
      text = text.slice(0, -1);
    }
    if (text !== '' || last.x + measure(ellipsis, last.spanIndex) <= maxWidth) {
      const truncated = text + ellipsis;
      last.text = truncated;
      last.width = measure(truncated, last.spanIndex);
      return { ...line, fragments, width: last.x + last.width };
    }
    fragments.pop();
  }
  return { ...line, fragments: [], width: 0 };
}
