/**
 * Approximation of LVGL's built-in default (light) theme — enough for
 * widgets to be "recognizable" against it, not a pixel-accurate port.
 * Widgets use these as the default values in the `StyleSet`s they build
 * (see `src/style/Style.ts`) rather than hardcoding hex values inline.
 */
export const defaultTheme = {
  /** LVGL's default theme primary palette (LV_PALETTE_BLUE). */
  primaryColor: '#2196f3',
  primaryColorPressed: '#1976d2',
  textColor: '#000000',
  textColorOnPrimary: '#ffffff',
  backgroundColor: '#ffffff',
  borderColor: '#d6d6d6',
  disabledColor: '#e0e0e0',
  radius: 6,
  fontSize: 14,
  fontFamily: 'sans-serif',
} as const;
