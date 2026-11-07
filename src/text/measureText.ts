/**
 * Caches `CanvasRenderingContext2D.measureText` widths, which are slow to
 * recompute every frame for the same string. Least-recently-used entries
 * are evicted past `maxEntries`.
 */
export interface TextMeasurer {
  /** Width in logical pixels of `text` drawn in `font` (a CSS font string). */
  measure(context: CanvasRenderingContext2D, text: string, font: string): number;
  clear(): void;
  readonly size: number;
}

export function createTextMeasurer(maxEntries = 1000): TextMeasurer {
  const cache = new Map<string, number>();

  return {
    measure(context, text, font): number {
      const key = `${font}\u0000${text}`;
      const cached = cache.get(key);
      if (cached !== undefined) {
        // Re-insert so the Map's insertion order tracks recency.
        cache.delete(key);
        cache.set(key, cached);
        return cached;
      }

      context.font = font;
      const width = context.measureText(text).width;
      cache.set(key, width);
      if (cache.size > maxEntries) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) {
          cache.delete(oldest);
        }
      }
      return width;
    },
    clear(): void {
      cache.clear();
    },
    get size(): number {
      return cache.size;
    },
  };
}

/** Shared measurer used by widgets that lay out text. */
export const textMeasurer: TextMeasurer = createTextMeasurer();

/** Builds a CSS font string from a style's font size and family. */
export function fontString(sizePx: number, family: string): string {
  return `${sizePx}px ${family}`;
}
