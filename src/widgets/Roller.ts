import type { AnimationEngine, AnimationHandle } from '../animation/Animation.js';
import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import type { PointerDraggable } from '../interaction/PointerDraggable.js';
import { paintBackgroundAndBorder } from '../rendering/box.js';
import { mergeStyle, resolveStyle, type Style, type StyleSet } from '../style/Style.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import {
  constrainPosition,
  positionAfterDrag,
  selectedAt,
  settleTarget,
  visibleSlots,
  wrapIndex,
} from './rollerMath.js';

const DEFAULT_VISIBLE_ROWS = 3;
/** Pointer travel (px) below which a release counts as a tap rather than a drag. */
const TAP_LIMIT = 4;
/** How far a throw coasts, as a multiple of release velocity in ms. */
const THROW_MS = 250;

export interface RollerOptions extends LvObjectOptions {
  /** The choices, top to bottom. Mirrors `lv_roller_set_options`. */
  readonly options?: readonly string[];
  /** Index of the initially selected option (default 0). */
  readonly selected?: number;
  /** How many rows are visible at once (default 3). Mirrors `lv_roller_set_visible_row_count`. */
  readonly visibleRows?: number;
  /** Wrap from the last option back to the first, like a spinning drum. Mirrors `LV_ROLLER_MODE_INFINITE`. */
  readonly infinite?: boolean;
  /** Animates snapping and throws when given; without it the roller jumps straight to its resting row. */
  readonly animations?: AnimationEngine;
  /** Clock in ms for measuring drag speed, defaulting to `performance.now()`. Inject one for deterministic output. */
  readonly now?: () => number;
  /** Style for the highlighted centre row — LVGL's `LV_PART_SELECTED`. */
  readonly selectedStyle?: StyleSet;
}

/**
 * A drum of options where the one in the centre is selected, mirroring
 * LVGL's `lv_roller`. Drag it (it keeps rolling a little after a flick and
 * then settles on a row), tap a row, or press the arrow keys. It fires
 * `valueChanged` when the settled selection changes. With `infinite` the
 * options wrap around.
 */
export class Roller extends LvObject implements PointerDraggable {
  visibleRows: number;
  infinite: boolean;
  /** Style for the highlighted centre row — LVGL's `LV_PART_SELECTED`. */
  selectedStyle: StyleSet;

  private choices: readonly string[] = [];
  private rowPosition = 0;
  private committedIndex = 0;
  private readonly animations: AnimationEngine | undefined;
  private readonly now: () => number;
  private settling: AnimationHandle | undefined;
  private dragStartY: number | undefined;
  private dragStartPosition = 0;
  private lastY = 0;
  private lastTime = 0;
  private velocity = 0;
  private moved = false;

  /** Creates a roller showing `options.options`, with `options.selected` in the centre. */
  constructor(options: RollerOptions) {
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
            textColor: defaultTheme.textColor,
            textFontSize: defaultTheme.fontSize,
            textFontFamily: defaultTheme.fontFamily,
            textAlign: 'center',
            clipCorner: true,
          },
          options.style?.base,
        ),
        states: options.style?.states,
      },
    });
    this.visibleRows = Math.max(1, Math.floor(options.visibleRows ?? DEFAULT_VISIBLE_ROWS));
    this.infinite = options.infinite ?? false;
    this.animations = options.animations;
    this.now = options.now ?? ((): number => performance.now());
    this.selectedStyle = {
      base: mergeStyle(
        { bgColor: defaultTheme.primaryColor, textColor: defaultTheme.textColorOnPrimary },
        options.selectedStyle?.base,
      ),
      states: options.selectedStyle?.states,
    };
    this.setOptions(options.options ?? [], options.selected);

    this.addEventListener('pressed', () => {
      this.cancelSettling();
      this.dragStartY = undefined;
    });
    this.addEventListener('released', () => this.finishDrag());
    this.addEventListener('key', (event) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        this.selectBy(-1);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        this.selectBy(1);
      }
    });
  }

  /** The height of one row. */
  get rowHeight(): number {
    return this.height / this.visibleRows;
  }

  /** The choices, top to bottom. */
  get options(): readonly string[] {
    return this.choices;
  }

  /** The fractional row at the centre: 2 has option 2 centred, 2.5 is halfway to option 3. */
  get position(): number {
    return this.rowPosition;
  }

  /** The index of the option nearest the centre. Mirrors `lv_roller_get_selected`. */
  get selectedIndex(): number {
    return selectedAt(this.rowPosition, this.choices.length, this.infinite);
  }

  /** The text of the selected option, or `undefined` when there are none. Mirrors `lv_roller_get_selected_str`. */
  get selectedText(): string | undefined {
    return this.choices[this.selectedIndex];
  }

  /** Replaces the choices and selects `selected` (default: the first). Mirrors `lv_roller_set_options`. */
  setOptions(options: readonly string[], selected = 0): void {
    this.cancelSettling();
    this.choices = [...options];
    const index = this.infinite
      ? wrapIndex(selected, options.length)
      : Math.min(Math.max(0, options.length - 1), Math.max(0, Math.floor(selected)));
    this.rowPosition = index;
    this.committedIndex = index;
  }

  /**
   * Rolls to `index` (wrapped when infinite, otherwise kept within the
   * options), animating when the roller has an animation engine and
   * `animate` is true. Fires `valueChanged` once it settles on a new option.
   * Mirrors `lv_roller_set_selected`.
   */
  setSelected(index: number, animate = false): void {
    const target = this.infinite
      ? this.nearestEquivalent(index)
      : constrainPosition(Math.round(index), this.choices.length, false);
    this.settleOn(target, animate);
  }

  /** Records the pointer's drag so the drum follows it (see {@link PointerDraggable}). */
  handlePointerPosition(_localX: number, localY = 0): void {
    const time = this.now();
    if (this.dragStartY === undefined) {
      this.dragStartY = localY;
      this.dragStartPosition = this.rowPosition;
      this.lastY = localY;
      this.lastTime = time;
      this.velocity = 0;
      this.moved = false;
      return;
    }
    if (Math.abs(localY - this.dragStartY) > TAP_LIMIT) {
      this.moved = true;
    }
    if (!this.moved) {
      this.lastY = localY;
      return;
    }
    const elapsed = Math.max(1, time - this.lastTime);
    // Dragging up moves the position forward, so velocity is in rows per ms along the position.
    this.velocity = 0.7 * this.velocity + 0.3 * (-(localY - this.lastY) / this.rowHeight / elapsed);
    this.lastY = localY;
    this.lastTime = time;
    this.rowPosition = positionAfterDrag(
      this.dragStartPosition,
      localY - this.dragStartY,
      this.rowHeight,
      this.choices.length,
      this.infinite,
    );
  }

  /** Ends a drag: settles on the row a throw would reach, or on the tapped row when the pointer barely moved. */
  private finishDrag(): void {
    if (this.dragStartY === undefined) {
      return;
    }
    const count = this.choices.length;
    const target = this.moved
      ? settleTarget(this.rowPosition, this.velocity, THROW_MS, count, this.infinite)
      : constrainPosition(
          Math.round(this.rowPosition + (this.lastY - this.height / 2) / this.rowHeight),
          count,
          this.infinite,
        );
    this.dragStartY = undefined;
    this.velocity = 0;
    this.settleOn(target, true);
  }

  /** Moves the selection `delta` rows, firing `valueChanged` if it changes. */
  private selectBy(delta: number): void {
    this.cancelSettling();
    this.settleOn(
      constrainPosition(this.selectedIndex + delta, this.choices.length, this.infinite),
      false,
    );
  }

  /** Brings `target` (a whole row position) to the centre, animated when possible, then commits it. */
  private settleOn(target: number, animate: boolean): void {
    this.cancelSettling();
    const from = this.rowPosition;
    const distance = Math.abs(target - from);
    if (!animate || !this.animations || distance < 0.01) {
      this.rowPosition = target;
      this.commit();
      return;
    }
    this.settling = this.animations.start({
      from,
      to: target,
      durationMs: Math.min(600, Math.max(120, distance * 120)),
      easing: 'easeOut',
      onUpdate: (value) => {
        this.rowPosition = value;
      },
      onComplete: () => {
        this.settling = undefined;
        this.rowPosition = target;
        this.commit();
      },
    });
  }

  /** Wraps an infinite roller's position back onto the options and fires `valueChanged` if the selection changed. */
  private commit(): void {
    if (this.infinite) {
      this.rowPosition = wrapIndex(this.rowPosition, this.choices.length);
    }
    const index = this.selectedIndex;
    if (index !== this.committedIndex) {
      this.committedIndex = index;
      this.dispatchEvent('valueChanged');
    }
  }

  /** Stops any settle animation where it is. */
  private cancelSettling(): void {
    this.settling?.cancel();
    this.settling = undefined;
  }

  /** The position of option `index` nearest the current one, so an infinite roller takes the short way round. */
  private nearestEquivalent(index: number): number {
    const count = this.choices.length;
    if (count === 0) {
      return 0;
    }
    const base = wrapIndex(index, count);
    const turns = Math.round((this.rowPosition - base) / count);
    return base + turns * count;
  }

  /** Paints the drum: every row, fading toward the edges, then the centre row's band with its own colors. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const style = this.resolvedStyle;
    const { x, y } = this.getAbsolutePosition();
    paintBackgroundAndBorder(context, x, y, this.width, this.height, style);

    const rowHeight = this.rowHeight;
    const centreY = y + this.height / 2;
    const slots = visibleSlots(
      this.rowPosition,
      this.visibleRows,
      this.choices.length,
      this.infinite,
    );
    const reach = this.visibleRows / 2;

    context.save();
    context.beginPath();
    context.rect(x, y, this.width, this.height);
    context.clip();
    for (const slot of slots) {
      const alpha = Math.max(0.15, 1 - Math.abs(slot.offset) / (reach + 1) / 1.2);
      this.paintRow(context, slot.optionIndex, x, centreY + slot.offset * rowHeight, style, alpha);
    }
    context.restore();

    const selected = resolveStyle(this.selectedStyle, new Set());
    context.save();
    context.beginPath();
    context.rect(x, centreY - rowHeight / 2, this.width, rowHeight);
    context.clip();
    paintBackgroundAndBorder(context, x, centreY - rowHeight / 2, this.width, rowHeight, {
      ...selected,
      radius: 0,
    });
    for (const slot of slots) {
      this.paintRow(
        context,
        slot.optionIndex,
        x,
        centreY + slot.offset * rowHeight,
        {
          ...style,
          ...selected,
        },
        1,
      );
    }
    context.restore();
  }

  /** Draws option `optionIndex`'s text centred (or aligned per `textAlign`) on `rowCentreY`. */
  private paintRow(
    context: CanvasRenderingContext2D,
    optionIndex: number,
    left: number,
    rowCentreY: number,
    style: Style,
    alpha: number,
  ): void {
    const text = this.choices[optionIndex];
    if (text === undefined) {
      return;
    }
    const align =
      style.textAlign === 'left' || style.textAlign === 'right' ? style.textAlign : 'center';
    const padding = 8;
    const textX =
      align === 'left'
        ? left + padding
        : align === 'right'
          ? left + this.width - padding
          : left + this.width / 2;
    context.save();
    context.globalAlpha *= alpha;
    context.fillStyle = style.textColor ?? defaultTheme.textColor;
    context.font = `${style.textFontSize ?? defaultTheme.fontSize}px ${style.textFontFamily ?? defaultTheme.fontFamily}`;
    context.textAlign = align;
    context.textBaseline = 'middle';
    context.fillText(text, textX, rowCentreY);
    context.restore();
  }
}
