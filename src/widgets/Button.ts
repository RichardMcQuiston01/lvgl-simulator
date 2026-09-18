import { LvObject, type LvObjectOptions } from '../core/LvObject';
import { paintRoundedRect } from '../rendering/shapes';
import { defaultTheme } from '../theme/defaultTheme';

export interface ButtonOptions extends LvObjectOptions {
  readonly text?: string;
  readonly textColor?: string;
}

/** A rounded, filled push button, mirroring LVGL's `lv_button`. */
export class Button extends LvObject {
  text: string | undefined;
  textColor: string;

  constructor(options: ButtonOptions) {
    super({ ...options, backgroundColor: options.backgroundColor ?? defaultTheme.primaryColor });
    this.text = options.text;
    this.textColor = options.textColor ?? defaultTheme.textColorOnPrimary;
  }

  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const { x, y } = this.getAbsolutePosition();
    paintRoundedRect(
      context,
      x,
      y,
      this.width,
      this.height,
      defaultTheme.radius,
      this.backgroundColor ?? defaultTheme.primaryColor,
    );

    if (this.text) {
      context.fillStyle = this.textColor;
      context.font = `${defaultTheme.fontSize}px ${defaultTheme.fontFamily}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(this.text, x + this.width / 2, y + this.height / 2);
    }
  }
}
