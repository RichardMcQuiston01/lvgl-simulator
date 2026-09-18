import { LvObject, type LvObjectOptions } from '../core/LvObject';
import { paintCheckmark, paintRoundedRect, paintRoundedRectStroke } from '../rendering/shapes';
import { defaultTheme } from '../theme/defaultTheme';

const INDICATOR_SIZE = 20;
const INDICATOR_RADIUS = 4;
const LABEL_GAP = 8;

export interface CheckboxOptions extends LvObjectOptions {
  readonly text?: string;
  readonly checked?: boolean;
}

/** A square indicator with an optional trailing label, mirroring LVGL's `lv_checkbox`. */
export class Checkbox extends LvObject {
  text: string | undefined;
  checked: boolean;

  constructor(options: CheckboxOptions) {
    super(options);
    this.text = options.text;
    this.checked = options.checked ?? false;
  }

  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const { x, y } = this.getAbsolutePosition();
    const size = Math.min(INDICATOR_SIZE, this.height);
    const indicatorY = y + (this.height - size) / 2;

    if (this.checked) {
      paintRoundedRect(
        context,
        x,
        indicatorY,
        size,
        size,
        INDICATOR_RADIUS,
        defaultTheme.primaryColor,
      );
      paintCheckmark(context, x, indicatorY, size, defaultTheme.textColorOnPrimary);
    } else {
      paintRoundedRectStroke(
        context,
        x,
        indicatorY,
        size,
        size,
        INDICATOR_RADIUS,
        defaultTheme.borderColor,
        2,
      );
    }

    if (this.text) {
      context.fillStyle = defaultTheme.textColor;
      context.font = `${defaultTheme.fontSize}px ${defaultTheme.fontFamily}`;
      context.textAlign = 'left';
      context.textBaseline = 'middle';
      context.fillText(this.text, x + size + LABEL_GAP, y + this.height / 2);
    }
  }
}
