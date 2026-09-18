import { LvObject, type LvObjectOptions } from '../core/LvObject';
import { paintCircle, paintRoundedRect } from '../rendering/shapes';
import { defaultTheme } from '../theme/defaultTheme';

const KNOB_INSET = 2;

export interface SwitchOptions extends LvObjectOptions {
  readonly checked?: boolean;
}

/** A pill-shaped toggle track with a sliding knob, mirroring LVGL's `lv_switch`. */
export class Switch extends LvObject {
  checked: boolean;

  constructor(options: SwitchOptions) {
    super(options);
    this.checked = options.checked ?? false;
  }

  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const { x, y } = this.getAbsolutePosition();
    const trackColor = this.checked ? defaultTheme.primaryColor : defaultTheme.borderColor;
    const radius = this.height / 2;

    paintRoundedRect(context, x, y, this.width, this.height, radius, trackColor);

    const knobDiameter = this.height - KNOB_INSET * 2;
    const knobLeft = this.checked ? x + this.width - knobDiameter - KNOB_INSET : x + KNOB_INSET;
    const knobCenterY = y + this.height / 2;

    paintCircle(
      context,
      knobLeft + knobDiameter / 2,
      knobCenterY,
      knobDiameter / 2,
      defaultTheme.backgroundColor,
    );
  }
}
