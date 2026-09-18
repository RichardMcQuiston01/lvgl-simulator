import { LvObject, type LvObjectOptions } from '../core/LvObject';
import { paintCircle, paintRoundedRect } from '../rendering/shapes';
import { mergeStyle, resolveStyle, type LvState, type StyleSet } from '../style/Style';
import { defaultTheme } from '../theme/defaultTheme';

const KNOB_INSET = 2;

export interface SwitchOptions extends LvObjectOptions {
  readonly checked?: boolean;
  /** Style for the sliding knob — LVGL's `LV_PART_KNOB`. The object's own `style` covers the track (`LV_PART_MAIN`). */
  readonly knobStyle?: StyleSet;
}

/** A pill-shaped toggle track with a sliding knob, mirroring LVGL's `lv_switch`. */
export class Switch extends LvObject {
  checked: boolean;
  /** Style for the knob — LVGL's `LV_PART_KNOB`. */
  knobStyle: StyleSet;

  constructor(options: SwitchOptions) {
    super({
      ...options,
      style: {
        base: mergeStyle({ bgColor: defaultTheme.borderColor }, options.style?.base),
        states: {
          checked: { bgColor: defaultTheme.primaryColor },
          ...options.style?.states,
        },
      },
    });
    this.checked = options.checked ?? false;
    this.knobStyle = {
      base: mergeStyle({ bgColor: defaultTheme.backgroundColor }, options.knobStyle?.base),
      states: options.knobStyle?.states,
    };

    // Toggling on click is the switch's own reaction to input, mirroring
    // LVGL's lv_switch — the interaction controller only knows about
    // generic pressed/released/clicked, not what a click means per widget.
    this.addEventListener('clicked', () => {
      this.checked = !this.checked;
      this.dispatchEvent('valueChanged');
    });
  }

  protected override getActiveStates(): ReadonlySet<LvState> {
    const states = new Set(super.getActiveStates());
    if (this.checked) {
      states.add('checked');
    }
    return states;
  }

  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const style = this.resolvedStyle;
    const knob = resolveStyle(this.knobStyle, this.getActiveStates());
    const { x, y } = this.getAbsolutePosition();
    const radius = this.height / 2;

    paintRoundedRect(
      context,
      x,
      y,
      this.width,
      this.height,
      radius,
      style.bgColor ?? defaultTheme.borderColor,
    );

    const knobDiameter = this.height - KNOB_INSET * 2;
    const knobLeft = this.checked ? x + this.width - knobDiameter - KNOB_INSET : x + KNOB_INSET;
    const knobCenterY = y + this.height / 2;

    paintCircle(
      context,
      knobLeft + knobDiameter / 2,
      knobCenterY,
      knobDiameter / 2,
      knob.bgColor ?? defaultTheme.backgroundColor,
    );
  }
}
