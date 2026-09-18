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
