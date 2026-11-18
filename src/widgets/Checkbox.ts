import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import {
  paintCheckmark,
  paintCircle,
  paintCircleStroke,
  paintRoundedRect,
  paintRoundedRectStroke,
} from '../rendering/shapes.js';
import {
  mergeStyle,
  resolveStyle,
  type LvState,
  type Style,
  type StyleSet,
} from '../style/Style.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import type { CheckboxGroup } from './CheckboxGroup.js';

const INDICATOR_SIZE = 20;
const INDICATOR_RADIUS = 4;
const LABEL_GAP = 8;

export interface CheckboxOptions extends LvObjectOptions {
  readonly text?: string;
  readonly checked?: boolean;
  /** Style for the box itself — LVGL's `LV_PART_INDICATOR`. The object's own `style` covers the label text (`LV_PART_MAIN`). */
  readonly indicatorStyle?: StyleSet;
  /** Makes this a radio button: checking it unchecks the others in the group, and it is drawn round. */
  readonly group?: CheckboxGroup;
}

/** A square indicator with an optional trailing label, mirroring LVGL's `lv_checkbox`. */
export class Checkbox extends LvObject {
  text: string | undefined;
  checked: boolean;
  /** Style for the box — LVGL's `LV_PART_INDICATOR`. */
  indicatorStyle: StyleSet;
  /** The radio group this checkbox belongs to, if any. Set it with {@link CheckboxGroup.add}. */
  group: CheckboxGroup | undefined;

  /** Creates a checkbox, joining `options.group` if given; clicking toggles it (or, in a group, selects it). */
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
      const siblings = this.group?.checkboxes.filter((member) => member !== this && member.checked);
      if (!this.setChecked(!this.checked)) {
        return;
      }
      // Radio siblings that were unchecked by this click report it, then this checkbox does.
      for (const sibling of siblings ?? []) {
        if (!sibling.checked) {
          sibling.dispatchEvent('valueChanged');
        }
      }
      this.dispatchEvent('valueChanged');
    });
    options.group?.add(this);
  }

  /**
   * Checks or unchecks this checkbox without firing an event. In a
   * {@link CheckboxGroup}, checking it unchecks the others, and unchecking
   * is refused unless the group allows it. Returns whether the state changed.
   */
  setChecked(checked: boolean): boolean {
    if (this.checked === checked) {
      return false;
    }
    const group = this.group;
    if (group) {
      if (!checked && !group.allowUncheck) {
        return false;
      }
      if (checked) {
        for (const member of group.checkboxes) {
          if (member !== this) {
            member.checked = false;
          }
        }
      }
    }
    this.checked = checked;
    return true;
  }

  /** The base states plus `checked` while checked. */
  protected override getActiveStates(): ReadonlySet<LvState> {
    const states = new Set(super.getActiveStates());
    if (this.checked) {
      states.add('checked');
    }
    return states;
  }

  /** Paints the indicator (a box with a checkmark, or a round radio dot in a group) and the label. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const style = this.resolvedStyle;
    const indicator = resolveStyle(this.indicatorStyle, this.getActiveStates());
    const { x, y } = this.getAbsolutePosition();
    const size = Math.min(INDICATOR_SIZE, this.height);
    const indicatorY = y + (this.height - size) / 2;

    if (this.group) {
      this.paintRadio(context, indicator, x, indicatorY, size);
    } else if (this.checked && indicator.bgColor) {
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

  /** Draws the round radio indicator: an outlined circle, with a filled one inside when checked. */
  private paintRadio(
    context: CanvasRenderingContext2D,
    indicator: Style,
    x: number,
    y: number,
    size: number,
  ): void {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const borderWidth = indicator.borderWidth ?? 1;
    const color = this.checked
      ? (indicator.bgColor ?? defaultTheme.primaryColor)
      : (indicator.borderColor ?? defaultTheme.borderColor);
    paintCircleStroke(context, centerX, centerY, size / 2 - borderWidth / 2, color, borderWidth);
    if (this.checked) {
      paintCircle(context, centerX, centerY, size / 2 - borderWidth - 2, color);
    }
  }
}
