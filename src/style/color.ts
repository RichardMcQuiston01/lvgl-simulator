/**
 * Applies an LVGL-style 0–255 opacity to a `#rrggbb` hex color, returning
 * an `rgba()` string Canvas can use directly as `fillStyle`/`strokeStyle`.
 * `opa` of `undefined` or `255` (fully opaque) returns `hexColor` as-is.
 * Only 6-digit hex input is supported — the only format this codebase
 * produces (see `src/theme/defaultTheme.ts` and widget defaults).
 */
export function withOpacity(hexColor: string, opa: number | undefined): string {
  if (opa === undefined || opa >= 255) {
    return hexColor;
  }

  const alpha = Math.max(0, Math.min(255, opa)) / 255;
  const { r, g, b } = hexToRgb(hexColor);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgb(hex: string): { readonly r: number; readonly g: number; readonly b: number } {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  };
}

/**
 * Blends two `#rrggbb` colors, mirroring `lv_color_mix`: `weight` is how
 * much of `foreground` shows (0 = all `background`, 1 = all `foreground`).
 * Returns a `#rrggbb` string.
 */
export function mixColors(foreground: string, background: string, weight: number): string {
  const mix = Math.max(0, Math.min(1, weight));
  const front = hexToRgb(foreground);
  const back = hexToRgb(background);
  const channel = (a: number, b: number): string =>
    Math.round(a * mix + b * (1 - mix))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(front.r, back.r)}${channel(front.g, back.g)}${channel(front.b, back.b)}`;
}
