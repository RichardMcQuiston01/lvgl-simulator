import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import { mergeStyle } from '../style/Style.js';
import { defaultTheme } from '../theme/defaultTheme.js';

export interface LabelOptions extends LvObjectOptions {
  readonly text: string;
  /** Sugar for `style.base.textColor`. */
  readonly textColor?: string;
  /** Sugar for `style.base.textFontSize`. */
  readonly fontSize?: number;
  /** Sugar for `style.base.textFontFamily`. */
  readonly fontFamily?: string;
}

/** A single line of text, mirroring LVGL's `lv_label`. */
export class Label extends LvObject {
  text: string;

  constructor(options: LabelOptions) {
    super({
      ...options,
      style: {
        base: mergeStyle(
          {
            textColor: defaultTheme.textColor,
            textFontSize: defaultTheme.fontSize,
            textFontFamily: defaultTheme.fontFamily,
          },
          options.style?.base,
          {
            textColor: options.textColor,
            textFontSize: options.fontSize,
            textFontFamily: options.fontFamily,
          },
        ),
        states: options.style?.states,
      },
    });
    this.text = options.text;
  }

  protected override paintSelf(context: CanvasRenderingContext2D): void {
    super.paintSelf(context);

    const style = this.resolvedStyle;
    const { x, y } = this.getAbsolutePosition();
    context.fillStyle = style.textColor ?? defaultTheme.textColor;
    context.font = `${style.textFontSize ?? defaultTheme.fontSize}px ${style.textFontFamily ?? defaultTheme.fontFamily}`;
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText(this.text, x, y + this.height / 2);
  }
}
