/**
 * Pure number formatting and digit arithmetic for the `Spinbox` widget.
 * A spinbox stores an integer and a count of decimal digits, like LVGL's, so
 * the value never carries floating-point error: 12345 with 2 decimal digits
 * displays as `123.45`.
 */

/** The largest magnitude a spinbox of `digitCount` digits can show. */
export function maxMagnitude(digitCount: number): number {
  return 10 ** Math.max(1, Math.floor(digitCount)) - 1;
}

/**
 * Formats `value` as a spinbox shows it: zero-padded to `digitCount` digits,
 * a decimal point before the last `decimalDigits`, and a leading `+`/`-` when
 * `signed`. Mirrors `lv_spinbox`'s text.
 */
export function formatSpinbox(
  value: number,
  digitCount: number,
  decimalDigits: number,
  signed: boolean,
): string {
  const digits = String(Math.abs(Math.trunc(value))).padStart(Math.max(1, digitCount), '0');
  const decimals = Math.min(Math.max(0, Math.floor(decimalDigits)), digits.length);
  // Every digit may be a decimal (007 with 3 decimals): show a leading 0 rather than ".007".
  const whole = digits.slice(0, digits.length - decimals) || '0';
  const fraction = digits.slice(digits.length - decimals);
  const body = decimals > 0 ? `${whole}.${fraction}` : whole;
  if (!signed) {
    return body;
  }
  return `${value < 0 ? '-' : '+'}${body}`;
}

/**
 * The index within the formatted text of the digit that `step` selects: the
 * digit whose place value is `step` (1 is the last digit, 10 the one before,
 * ...). Skips over the decimal point and clamps to the displayed digits.
 */
export function stepDigitIndex(
  textLength: number,
  step: number,
  digitCount: number,
  decimalDigits: number,
): number {
  const place = Math.min(
    Math.max(0, Math.floor(Math.log10(Math.max(1, step)))),
    Math.max(1, digitCount) - 1,
  );
  const pointOffset = decimalDigits > 0 && place >= decimalDigits ? 1 : 0;
  return textLength - 1 - place - pointOffset;
}

/** `step` moved one digit left (times 10), unless that passes the most significant digit. */
export function nextStep(step: number, digitCount: number): number {
  return step * 10 <= 10 ** (Math.max(1, digitCount) - 1) ? step * 10 : step;
}

/** `step` moved one digit right (divided by 10), never below 1. */
export function previousStep(step: number): number {
  return step >= 10 ? Math.floor(step / 10) : step;
}

/**
 * `value` moved by `delta` within [min, max]. Past an end it wraps to the
 * other end when `rollover` is set, and otherwise stops at the end, like
 * `lv_spinbox_increment`/`decrement`.
 */
export function stepValue(
  value: number,
  delta: number,
  min: number,
  max: number,
  rollover: boolean,
): number {
  const next = value + delta;
  if (next > max) {
    return rollover && value === max ? min : max;
  }
  if (next < min) {
    return rollover && value === min ? max : min;
  }
  return next;
}
