import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import type { PointerDraggable } from '../interaction/PointerDraggable.js';
import { paintBackgroundAndBorder } from '../rendering/box.js';
import { mergeStyle, resolveStyle, type LvState, type StyleSet } from '../style/Style.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import {
  KEYBOARD_LAYOUTS,
  isControlKey,
  keyAction,
  keyAtPoint,
  layoutKeys,
  type KeyDefinition,
  type KeyRect,
  type KeyboardMode,
} from './keyboardLayout.js';
import type { Textarea } from './Textarea.js';

const DEFAULT_GAP = 4;
const DEFAULT_PADDING = 4;

export interface KeyboardOptions extends LvObjectOptions {
  readonly mode?: KeyboardMode;
  /** The text area keys type into. Mirrors `lv_keyboard_set_textarea`. */
  readonly target?: Textarea;
  /** Space between keys (default 4). */
  readonly gap?: number;
  /** Space between the keys and the keyboard's edge (default 4). */
  readonly padding?: number;
  /** Style for character keys — LVGL's `LV_PART_ITEMS`. Its `states.pressed` styles a key while pressed. */
  readonly itemsStyle?: StyleSet;
  /** Style for control keys (shift, backspace, enter, space, ...). */
  readonly controlKeyStyle?: StyleSet;
}

/**
 * An on-screen keyboard, mirroring LVGL's `lv_keyboard`: lower- and upper-case
 * text, symbols, and a number pad. Pressing a key types into its `target`
 * text area (backspace, the arrows and Enter act on it too), switches layout
 * (`ABC`, `abc`, `1#`), or fires `ready` (the check key) or `cancel` (the
 * hide key) on the keyboard itself. Every activation also fires
 * `valueChanged`, with the key's label in `lastKey`. Without a target the keys
 * still fire events, so you can wire your own handling.
 */
export class Keyboard extends LvObject implements PointerDraggable {
  mode: KeyboardMode;
  target: Textarea | undefined;
  gap: number;
  padding: number;
  /** Style for character keys — LVGL's `LV_PART_ITEMS`. */
  itemsStyle: StyleSet;
  /** Style for control keys. */
  controlKeyStyle: StyleSet;
  /** The label of the key most recently activated, or `undefined` before any. */
  lastKey: string | undefined;

  private pressedKey: KeyRect | undefined;
  private releasedKey: KeyRect | undefined;

  /** Creates a keyboard showing `mode` (lower-case text by default). */
  constructor(options: KeyboardOptions) {
    super({
      ...options,
      style: {
        base: mergeStyle({ bgColor: '#e8eaed' }, options.style?.base),
        states: options.style?.states,
      },
    });
    this.mode = options.mode ?? 'textLower';
    this.target = options.target;
    this.gap = options.gap ?? DEFAULT_GAP;
    this.padding = options.padding ?? DEFAULT_PADDING;
    this.itemsStyle = {
      base: mergeStyle(
        {
          bgColor: defaultTheme.backgroundColor,
          radius: 4,
          textColor: defaultTheme.textColor,
          textFontSize: defaultTheme.fontSize,
          textFontFamily: defaultTheme.fontFamily,
        },
        options.itemsStyle?.base,
      ),
      states: {
        pressed: {
          bgColor: defaultTheme.primaryColor,
          textColor: defaultTheme.textColorOnPrimary,
        },
        ...options.itemsStyle?.states,
      },
    };
    this.controlKeyStyle = {
      base: mergeStyle({ bgColor: '#cfd4da' }, options.controlKeyStyle?.base),
      states: options.controlKeyStyle?.states,
    };

    this.addEventListener('pressed', () => {
      this.releasedKey = undefined;
    });
    this.addEventListener('released', () => {
      this.releasedKey = this.pressedKey;
      this.pressedKey = undefined;
    });
    this.addEventListener('clicked', () => {
      const key = this.releasedKey;
      this.releasedKey = undefined;
      if (key) {
        this.activate(key.definition);
      }
    });
  }

  /** Every key's rectangle for the current mode and size, relative to the keyboard's top-left. */
  get keyRects(): readonly KeyRect[] {
    return layoutKeys(KEYBOARD_LAYOUTS[this.mode], this.width, this.height, this.gap, this.padding);
  }

  /** Switches the key set shown. Mirrors `lv_keyboard_set_mode`. */
  setMode(mode: KeyboardMode): void {
    this.mode = mode;
    this.pressedKey = undefined;
  }

  /**
   * Tracks which key is under the pointer while pressed (see
   * {@link PointerDraggable}), so it highlights and a release on it activates
   * it; sliding off onto a gap or another key follows the pointer.
   */
  handlePointerPosition(localX: number, localY = 0): void {
    this.pressedKey = keyAtPoint(this.keyRects, localX, localY);
  }

  /** Activates the first key labelled `label` as if it had been clicked. Returns whether one was found. */
  pressKey(label: string): boolean {
    const rect = this.keyRects.find((candidate) => candidate.definition.label === label);
    if (!rect) {
      return false;
    }
    this.activate(rect.definition);
    return true;
  }

  /** Carries out `key`'s action, then fires `valueChanged`. */
  private activate(key: KeyDefinition): void {
    this.lastKey = key.label;
    const target = this.target;
    switch (keyAction(key.label)) {
      case 'char':
        target?.insertText(key.label);
        break;
      case 'backspace':
        target?.deleteBackward();
        break;
      case 'enter':
        target?.dispatchEvent('key', { key: 'Enter' });
        break;
      case 'left':
        target?.moveCaret(-1);
        break;
      case 'right':
        target?.moveCaret(1);
        break;
      case 'lower':
        this.setMode('textLower');
        break;
      case 'upper':
        this.setMode('textUpper');
        break;
      case 'special':
        this.setMode('special');
        break;
      case 'toggleSign':
        this.toggleSign();
        break;
      case 'ok':
        this.dispatchEvent('ready');
        break;
      case 'close':
        this.dispatchEvent('cancel');
        break;
    }
    this.dispatchEvent('valueChanged');
  }

  /** Flips a leading minus on the target's text, as the number pad's `+/-` key does. */
  private toggleSign(): void {
    const target = this.target;
    if (!target) {
      return;
    }
    if (target.text.startsWith('-')) {
      target.setCaret(1);
      target.deleteBackward();
    } else {
      target.setCaret(0);
      target.insertText('-');
    }
  }

  /** Paints the keyboard's background, then each key with its label, highlighting the pressed one. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const style = this.resolvedStyle;
    const { x, y } = this.getAbsolutePosition();
    paintBackgroundAndBorder(context, x, y, this.width, this.height, style);

    for (const rect of this.keyRects) {
      const pressed = this.pressedKey?.row === rect.row && this.pressedKey.index === rect.index;
      const states: ReadonlySet<LvState> = pressed
        ? new Set<LvState>(['pressed'])
        : new Set<LvState>();
      // Control keys take their own look, but a pressed key shows the pressed look either way.
      const base = resolveStyle(this.itemsStyle, states);
      const keyStyle =
        isControlKey(rect.definition.label) && !pressed
          ? { ...base, ...resolveStyle(this.controlKeyStyle, states) }
          : base;
      paintBackgroundAndBorder(context, x + rect.x, y + rect.y, rect.width, rect.height, keyStyle);

      if (rect.definition.label.trim() === '') {
        continue;
      }
      context.fillStyle = keyStyle.textColor ?? defaultTheme.textColor;
      context.font = `${keyStyle.textFontSize ?? defaultTheme.fontSize}px ${keyStyle.textFontFamily ?? defaultTheme.fontFamily}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(
        rect.definition.label,
        x + rect.x + rect.width / 2,
        y + rect.y + rect.height / 2,
      );
    }
  }
}
