import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import { paintRoundedRect } from '../rendering/shapes.js';
import { mergeStyle } from '../style/Style.js';
import { defaultTheme } from '../theme/defaultTheme.js';

export interface ButtonOptions extends LvObjectOptions {
  readonly text?: string;
  /** Sugar for `style.base.bgColor`. */
  readonly backgroundColor?: string;
  /** Sugar for `style.base.textColor`. */
  readonly textColor?: string;
}

/** A rounded, filled push button, mirroring LVGL's `lv_button`. */
export class Button extends LvObject {
  text: string | undefined;

  constructor(options: ButtonOptions) {
    super({
      ...options,
      style: {
        base: mergeStyle(
          {
            bgColor: defaultTheme.primaryColor,
            textColor: defaultTheme.textColorOnPrimary,
            radius: defaultTheme.radius,
          },
          options.style?.base,
          { bgColor: options.backgroundColor, textColor: options.textColor },
        ),
        states: {
          // Pressed buttons darken, matching LVGL's default theme. A
          // caller-supplied `style.states.pressed` replaces this default
          // outright (a shallow, per-state override — not a deep merge).
          pressed: { bgColor: defaultTheme.primaryColorPressed },
          ...options.style?.states,
        },
      },
    });
    this.text = options.text;
  }

  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const style = this.resolvedStyle;
    const { x, y } = this.getAbsolutePosition();
    paintRoundedRect(
      context,
      x,
      y,
      this.width,
      this.height,
      style.radius ?? defaultTheme.radius,
      style.bgColor ?? defaultTheme.primaryColor,
    );

    if (this.text) {
      context.fillStyle = style.textColor ?? defaultTheme.textColorOnPrimary;
      context.font = `${defaultTheme.fontSize}px ${defaultTheme.fontFamily}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(this.text, x + this.width / 2, y + this.height / 2);
    }
  }
}
