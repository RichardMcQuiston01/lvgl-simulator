import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import type { PointerDraggable } from '../interaction/PointerDraggable.js';
import { paintBackgroundAndBorder } from '../rendering/box.js';
import { mergeStyle, resolveStyle, type StyleSet } from '../style/Style.js';
import { withOpacity } from '../style/color.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import { fontString, textMeasurer } from '../text/measureText.js';
import {
  formatSpinbox,
  maxMagnitude,
  nextStep,
  previousStep,
  stepDigitIndex,
  stepValue,
} from './spinboxMath.js';

const DEFAULT_PADDING = 8;
/** Width of a character, as a multiple of the font size, until a canvas is available to measure with. */
const FALLBACK_CHAR_RATIO = 0.6;

export interface SpinboxOptions extends LvObjectOptions {
  /** The value as an integer: with `decimalDigits` 2, 12345 shows as 123.45. Default 0. */
  readonly value?: number;
  readonly min?: number;
  readonly max?: number;
  /** How many digits are shown (default 5). Mirrors `lv_spinbox_set_digit_format`. */
  readonly digitCount?: number;
  /** How many of those digits follow the decimal point (default 0). */
  readonly decimalDigits?: number;
  /** The amount an increment changes the value by, and so which digit is selected (default 1). */
  readonly step?: number;
  /** Wrap from one end of the range to the other (default `false`). Mirrors `lv_spinbox_set_rollover`. */
  readonly rollover?: boolean;
  /** Style for the selected digit — LVGL's `LV_PART_CURSOR`. */
  readonly cursorStyle?: StyleSet;
}

/**
 * A number you step with the keys, mirroring LVGL's `lv_spinbox`. The value
 * is an integer with a fixed count of decimal digits, so it never carries
 * floating-point error. One digit is selected: Up/Down change the value by
 * that digit's place (`step`), Left/Right move the selection, and pressing a
 * digit selects it. It fires `valueChanged` when the value changes and
 * `ready` on Enter. A sign is shown when the range includes negatives.
 */
export class Spinbox extends LvObject implements PointerDraggable {
  min: number;
  max: number;
  digitCount: number;
  decimalDigits: number;
  step: number;
  rollover: boolean;
  /** Style for the selected digit — LVGL's `LV_PART_CURSOR`. */
  cursorStyle: StyleSet;

  private currentValue: number;
  private measureContext: CanvasRenderingContext2D | undefined;

  /** Creates a spinbox; the range defaults to the largest the digits can show. */
  constructor(options: SpinboxOptions) {
    super({
      ...options,
      editable: options.editable ?? true,
      style: {
        base: mergeStyle(
          {
            bgColor: defaultTheme.backgroundColor,
            borderColor: defaultTheme.borderColor,
            borderWidth: 1,
            radius: defaultTheme.radius,
            padTop: DEFAULT_PADDING,
            padRight: DEFAULT_PADDING,
            padBottom: DEFAULT_PADDING,
            padLeft: DEFAULT_PADDING,
            textColor: defaultTheme.textColor,
            textFontSize: defaultTheme.fontSize,
            textFontFamily: defaultTheme.fontFamily,
          },
          options.style?.base,
        ),
        states: options.style?.states,
      },
    });
    this.digitCount = Math.max(1, Math.floor(options.digitCount ?? 5));
    this.decimalDigits = Math.max(0, Math.floor(options.decimalDigits ?? 0));
    const limit = maxMagnitude(this.digitCount);
    this.min = Math.max(-limit, options.min ?? -limit);
    this.max = Math.min(limit, options.max ?? limit);
    this.step = Math.max(1, Math.floor(options.step ?? 1));
    this.rollover = options.rollover ?? false;
    this.cursorStyle = {
      base: mergeStyle(
        { bgColor: defaultTheme.primaryColor, textColor: defaultTheme.textColorOnPrimary },
        options.cursorStyle?.base,
      ),
      states: options.cursorStyle?.states,
    };
    this.currentValue = Math.min(this.max, Math.max(this.min, options.value ?? 0));

    this.addEventListener('key', (event) => {
      switch (event.key) {
        case 'ArrowUp':
          this.increment();
          break;
        case 'ArrowDown':
          this.decrement();
          break;
        case 'ArrowLeft':
          this.stepNext();
          break;
        case 'ArrowRight':
          this.stepPrevious();
          break;
        case 'Enter':
          this.dispatchEvent('ready');
          break;
        default:
          break;
      }
    });
  }

  /** The current value, as an integer (see `decimalDigits`). */
  get value(): number {
    return this.currentValue;
  }

  /** The value as a real number: `value / 10 ** decimalDigits`. */
  get decimalValue(): number {
    return this.currentValue / 10 ** this.decimalDigits;
  }

  /** Whether a sign is shown, which is when the range includes negative values. */
  get signed(): boolean {
    return this.min < 0;
  }

  /** The text as displayed. */
  get text(): string {
    return formatSpinbox(this.currentValue, this.digitCount, this.decimalDigits, this.signed);
  }

  /** Sets the value, clamped to the range, firing `valueChanged` if it changed. Mirrors `lv_spinbox_set_value`. */
  setValue(value: number): void {
    const next = Math.min(this.max, Math.max(this.min, Math.trunc(value)));
    if (next !== this.currentValue) {
      this.currentValue = next;
      this.dispatchEvent('valueChanged');
    }
  }

  /** Raises the value by `step`. Mirrors `lv_spinbox_increment`. */
  increment(): void {
    this.setValue(stepValue(this.currentValue, this.step, this.min, this.max, this.rollover));
  }

  /** Lowers the value by `step`. Mirrors `lv_spinbox_decrement`. */
  decrement(): void {
    this.setValue(stepValue(this.currentValue, -this.step, this.min, this.max, this.rollover));
  }

  /** Selects the next more significant digit. Mirrors `lv_spinbox_step_next`. */
  stepNext(): void {
    this.step = nextStep(this.step, this.digitCount);
  }

  /** Selects the next less significant digit. Mirrors `lv_spinbox_step_prev`. */
  stepPrevious(): void {
    this.step = previousStep(this.step);
  }

  /** A width measurer: the real canvas once painted, a per-character estimate before that. */
  private get measure(): (text: string) => number {
    const style = this.resolvedStyle;
    const size = style.textFontSize ?? defaultTheme.fontSize;
    const context = this.measureContext;
    if (context) {
      const font = fontString(size, style.textFontFamily ?? defaultTheme.fontFamily);
      return (text) => textMeasurer.measure(context, text, font);
    }
    return (text) => text.length * size * FALLBACK_CHAR_RATIO;
  }

  /**
   * Selects the digit under a pointer position local to the spinbox (see
   * {@link PointerDraggable}), by moving `step` to that digit's place value.
   */
  handlePointerPosition(localX: number, _localY?: number): void {
    const text = this.text;
    const measure = this.measure;
    const style = this.resolvedStyle;
    const x = localX - (style.padLeft ?? 0);

    let chosen = -1;
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index] ?? '';
      if (character < '0' || character > '9') {
        continue;
      }
      const left = measure(text.slice(0, index));
      const right = measure(text.slice(0, index + 1));
      if (x >= left && x < right) {
        chosen = index;
        break;
      }
    }
    if (chosen === -1) {
      return;
    }
    // Place value of the chosen digit: count digits to its right, skipping the point.
    const digitsToRight = [...text.slice(chosen + 1)].filter((c) => c >= '0' && c <= '9').length;
    this.step = Math.min(10 ** digitsToRight, 10 ** (this.digitCount - 1));
  }

  /** Paints the box, then the number, with the selected digit highlighted while focused. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    this.measureContext = context;
    const style = this.resolvedStyle;
    const { x, y } = this.getAbsolutePosition();
    paintBackgroundAndBorder(context, x, y, this.width, this.height, style);

    const text = this.text;
    const measure = this.measure;
    const size = style.textFontSize ?? defaultTheme.fontSize;
    const left = x + (style.padLeft ?? 0);
    const middle = y + this.height / 2;
    context.font = fontString(size, style.textFontFamily ?? defaultTheme.fontFamily);
    context.textAlign = 'left';
    context.textBaseline = 'middle';

    const selected = this.focused
      ? stepDigitIndex(text.length, this.step, this.digitCount, this.decimalDigits)
      : -1;
    const before = selected === -1 ? text : text.slice(0, selected);
    const digit = selected === -1 ? '' : (text[selected] ?? '');
    const after = selected === -1 ? '' : text.slice(selected + 1);

    context.fillStyle = style.textColor ?? defaultTheme.textColor;
    if (before !== '') {
      context.fillText(before, left, middle);
    }
    if (digit !== '') {
      const cursor = resolveStyle(this.cursorStyle, this.getActiveStates());
      const digitLeft = left + measure(before);
      const digitWidth = measure(digit);
      context.fillStyle = withOpacity(cursor.bgColor ?? defaultTheme.primaryColor, cursor.bgOpa);
      context.fillRect(digitLeft, middle - size * 0.75, digitWidth, size * 1.5);
      context.fillStyle = cursor.textColor ?? defaultTheme.textColorOnPrimary;
      context.fillText(digit, digitLeft, middle);
      context.fillStyle = style.textColor ?? defaultTheme.textColor;
      if (after !== '') {
        context.fillText(after, digitLeft + digitWidth, middle);
      }
    }
  }
}
