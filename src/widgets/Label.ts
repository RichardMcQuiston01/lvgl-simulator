import { LvObject, type LvObjectOptions } from '../core/LvObject';
import { defaultTheme } from '../theme/defaultTheme';

export interface LabelOptions extends LvObjectOptions {
  readonly text: string;
  readonly textColor?: string;
  readonly fontSize?: number;
  readonly fontFamily?: string;
}

/** A single line of text, mirroring LVGL's `lv_label`. */
export class Label extends LvObject {
  text: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;

  constructor(options: LabelOptions) {
    super(options);
    this.text = options.text;
    this.textColor = options.textColor ?? defaultTheme.textColor;
    this.fontSize = options.fontSize ?? defaultTheme.fontSize;
    this.fontFamily = options.fontFamily ?? defaultTheme.fontFamily;
  }

  protected override paintSelf(context: CanvasRenderingContext2D): void {
    super.paintSelf(context);

    const { x, y } = this.getAbsolutePosition();
    context.fillStyle = this.textColor;
    context.font = `${this.fontSize}px ${this.fontFamily}`;
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText(this.text, x, y + this.height / 2);
  }
}
