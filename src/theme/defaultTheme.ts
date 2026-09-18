/**
 * Approximation of LVGL's built-in default (light) theme — enough for
 * widgets to be "recognizable" against it (Stage 2's bar), not a
 * pixel-accurate port. Stage 3 replaces this flat constant table with the
 * full cascading style/part/state system; widgets should keep reading
 * colors from here rather than hardcoding hex values so that swap is
 * mechanical.
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
