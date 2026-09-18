import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import { paintCheckmark, paintRoundedRect, paintRoundedRectStroke } from '../rendering/shapes.js';
import { mergeStyle, resolveStyle, type LvState, type StyleSet } from '../style/Style.js';
import { defaultTheme } from '../theme/defaultTheme.js';

const INDICATOR_SIZE = 20;
const INDICATOR_RADIUS = 4;
const LABEL_GAP = 8;

export interface CheckboxOptions extends LvObjectOptions {
  readonly text?: string;
  readonly checked?: boolean;
  /** Style for the box itself — LVGL's `LV_PART_INDICATOR`. The object's own `style` covers the label text (`LV_PART_MAIN`). */
  readonly indicatorStyle?: StyleSet;
}

/** A square indicator with an optional trailing label, mirroring LVGL's `lv_checkbox`. */
export class Checkbox extends LvObject {
  text: string | undefined;
  checked: boolean;
  /** Style for the box — LVGL's `LV_PART_INDICATOR`. */
  indicatorStyle: StyleSet;

  constructor(options: CheckboxOptions) {
    super({
      ...options,
      style: {
        base: mergeStyle({ textColor: defaultTheme.textColor }, options.style?.base),
        states: options.style?.states,
      },
    });
    this.text = options.text;
    this.checked = options.checked ?? false;
    this.indicatorStyle = {
      base: mergeStyle(
        { borderColor: defaultTheme.borderColor, borderWidth: 2, radius: INDICATOR_RADIUS },
        options.indicatorStyle?.base,
      ),
      states: {
        checked: { bgColor: defaultTheme.primaryColor },
        ...options.indicatorStyle?.states,
      },
    };

    // Toggling on click is the checkbox's own reaction to input, mirroring
    // LVGL's lv_checkbox — the interaction controller only knows about
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
    const indicator = resolveStyle(this.indicatorStyle, this.getActiveStates());
    const { x, y } = this.getAbsolutePosition();
    const size = Math.min(INDICATOR_SIZE, this.height);
    const indicatorY = y + (this.height - size) / 2;

    if (this.checked && indicator.bgColor) {
      paintRoundedRect(
        context,
        x,
        indicatorY,
        size,
        size,
        indicator.radius ?? 0,
        indicator.bgColor,
      );
      paintCheckmark(context, x, indicatorY, size, defaultTheme.textColorOnPrimary);
    } else {
      paintRoundedRectStroke(
        context,
        x,
        indicatorY,
        size,
        size,
        indicator.radius ?? 0,
        indicator.borderColor ?? defaultTheme.borderColor,
        indicator.borderWidth ?? 1,
      );
    }

    if (this.text) {
      context.fillStyle = style.textColor ?? defaultTheme.textColor;
      context.font = `${defaultTheme.fontSize}px ${defaultTheme.fontFamily}`;
      context.textAlign = 'left';
      context.textBaseline = 'middle';
      context.fillText(this.text, x + size + LABEL_GAP, y + this.height / 2);
    }
  }
}
