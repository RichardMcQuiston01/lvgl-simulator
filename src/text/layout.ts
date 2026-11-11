/**
 * Pure text layout shared by the text widgets: word wrapping, and mapping
 * between character offsets and positions. Everything takes a `measure`
 * callback (text to pixel width), so it needs no canvas and is exactly
 * testable.
 */

/** Measures `text`'s width in pixels. */
export type MeasureText = (text: string) => number;

/** One laid-out line: the half-open character range `[start, end)` of the source text. */
export interface TextLine {
  readonly start: number;
  readonly end: number;
  /** Pixel width of the line's text, ignoring trailing whitespace. */
  readonly width: number;
}

/** Width of `text` ignoring trailing whitespace, which wrapping lets hang past the edge. */
function trimmedWidth(text: string, measure: MeasureText): number {
  return measure(text.replace(/\s+$/, ''));
}

/** The largest prefix length of `text` (at least 1) that fits in `maxWidth`. */
function fittingPrefixLength(text: string, maxWidth: number, measure: MeasureText): number {
  let length = 1;
  while (length < text.length && measure(text.slice(0, length + 1)) <= maxWidth) {
    length += 1;
  }
  return length;
}

/**
 * Splits `text` into lines no wider than `maxWidth`. A `\\n` always breaks.
 * With `wrap`, lines also break after whole words, and a word wider than the
 * line is broken by character. A line keeps the whitespace that follows its
 * last word, so each line starts exactly where the previous one ends (apart
 * from a consumed `\\n`), which keeps caret offsets unambiguous. Without
 * `wrap`, or when `maxWidth` is not positive, only `\\n` breaks.
 */
export function wrapLines(
  text: string,
  maxWidth: number,
  measure: MeasureText,
  wrap = true,
): readonly TextLine[] {
  const lines: TextLine[] = [];
  let paragraphStart = 0;

  while (paragraphStart <= text.length) {
    const newline = text.indexOf('\n', paragraphStart);
    const paragraphEnd = newline === -1 ? text.length : newline;
    const paragraph = text.slice(paragraphStart, paragraphEnd);

    if (!wrap || maxWidth <= 0 || paragraph === '') {
      lines.push({
        start: paragraphStart,
        end: paragraphEnd,
        width: trimmedWidth(paragraph, measure),
      });
    } else {
      let lineStart = paragraphStart;
      let lineEnd = paragraphStart;
      for (const token of paragraph.match(/\S+\s*|\s+/g) ?? []) {
        let tokenStart = lineEnd;
        const tokenEnd = tokenStart + token.length;
        // Does the line still fit with this token (ignoring its trailing space)?
        while (trimmedWidth(text.slice(lineStart, tokenEnd), measure) > maxWidth) {
          if (lineEnd > lineStart) {
            lines.push({
              start: lineStart,
              end: lineEnd,
              width: trimmedWidth(text.slice(lineStart, lineEnd), measure),
            });
            lineStart = lineEnd;
            continue;
          }
          // The token alone is too wide: break it by character.
          const length = fittingPrefixLength(text.slice(tokenStart, tokenEnd), maxWidth, measure);
          const brokenEnd = tokenStart + length;
          lines.push({
            start: lineStart,
            end: brokenEnd,
            width: trimmedWidth(text.slice(lineStart, brokenEnd), measure),
          });
          lineStart = brokenEnd;
          lineEnd = brokenEnd;
          tokenStart = brokenEnd;
          if (tokenStart >= tokenEnd) {
            break;
          }
        }
        lineEnd = tokenEnd;
      }
      lines.push({
        start: lineStart,
        end: paragraphEnd,
        width: trimmedWidth(text.slice(lineStart, paragraphEnd), measure),
      });
    }

    if (newline === -1) {
      break;
    }
    paragraphStart = newline + 1;
  }
  return lines;
}

/** The index of the line that holds `offset`; a wrap boundary belongs to the line that starts there. */
export function lineIndexAt(lines: readonly TextLine[], offset: number): number {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (line && offset >= line.start) {
      return index;
    }
  }
  return 0;
}

/** The line and pixel x of the caret at `offset`. */
export function caretPosition(
  text: string,
  lines: readonly TextLine[],
  offset: number,
  measure: MeasureText,
): { readonly line: number; readonly x: number } {
  const lineNumber = lineIndexAt(lines, offset);
  const line = lines[lineNumber];
  if (!line) {
    return { line: 0, x: 0 };
  }
  const end = Math.min(offset, line.end);
  return { line: lineNumber, x: measure(text.slice(line.start, end)) };
}

/** The character offset on `line` nearest to pixel `x` (the boundary the pointer is closest to). */
export function offsetAtX(text: string, line: TextLine, x: number, measure: MeasureText): number {
  if (x <= 0) {
    return line.start;
  }
  let previousWidth = 0;
  for (let offset = line.start + 1; offset <= line.end; offset += 1) {
    const width = measure(text.slice(line.start, offset));
    if (x < width) {
      return x - previousWidth < width - x ? offset - 1 : offset;
    }
    previousWidth = width;
  }
  return line.end;
}

/** The character offset nearest to the point `(x, y)` in text laid out with `lineHeight`-tall lines. */
export function offsetAtPoint(
  text: string,
  lines: readonly TextLine[],
  x: number,
  y: number,
  lineHeight: number,
  measure: MeasureText,
): number {
  if (lines.length === 0 || lineHeight <= 0) {
    return 0;
  }
  const index = Math.min(lines.length - 1, Math.max(0, Math.floor(y / lineHeight)));
  const line = lines[index];
  return line ? offsetAtX(text, line, x, measure) : 0;
}

/**
 * Moves `offset` up or down by `delta` lines, landing at pixel `preferredX`
 * on the new line (or its end). Returns `offset` unchanged at the first or
 * last line. Mirrors a text field's Up/Down arrow keys.
 */
export function moveOffsetVertically(
  text: string,
  lines: readonly TextLine[],
  offset: number,
  delta: number,
  preferredX: number,
  measure: MeasureText,
): number {
  const current = lineIndexAt(lines, offset);
  const target = current + delta;
  const line = lines[target];
  if (!line || target < 0) {
    return offset;
  }
  return offsetAtX(text, line, preferredX, measure);
}
