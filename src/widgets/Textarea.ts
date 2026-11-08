import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import type { PointerDraggable } from '../interaction/PointerDraggable.js';
import { paintBackgroundAndBorder } from '../rendering/box.js';
import { mergeStyle, resolveStyle, type StyleSet } from '../style/Style.js';
import { withOpacity } from '../style/color.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import {
  caretPosition,
  moveOffsetVertically,
  offsetAtPoint,
  wrapLines,
  type MeasureText,
  type TextLine,
} from '../text/layout.js';
import { fontString, textMeasurer } from '../text/measureText.js';
import { TextEditState } from '../text/TextEditState.js';
import type { LvKeyEvent } from '../events/LvEvent.js';

const DEFAULT_PADDING = 8;
const CARET_WIDTH = 2;
/** Line height as a multiple of the font size. */
const LINE_HEIGHT_RATIO = 1.3;
/** Width of a character, as a multiple of the font size, until a canvas is available to measure with. */
const FALLBACK_CHAR_RATIO = 0.6;

export interface TextareaOptions extends LvObjectOptions {
  readonly text?: string;
  /** Shown, dimmed, while the text is empty. Mirrors `lv_textarea_set_placeholder_text`. */
  readonly placeholder?: string;
  /** One line that scrolls sideways; Enter fires `ready` instead of adding a newline. Mirrors `lv_textarea_set_one_line`. */
  readonly oneLine?: boolean;
  /** Shows `passwordChar` in place of every character. Mirrors `lv_textarea_set_password_mode`. */
  readonly passwordMode?: boolean;
  /** The mask character in password mode (default a bullet). */
  readonly passwordChar?: string;
  /** Caps the text length. Mirrors `lv_textarea_set_max_length`. */
  readonly maxLength?: number;
  /** When set, only these characters can be entered. Mirrors `lv_textarea_set_accepted_chars`. */
  readonly acceptedChars?: string;
  /** Clock in ms for caret blinking, defaulting to `performance.now()`. Inject one for deterministic output. */
  readonly now?: () => number;
  /** Half-period of the caret blink in ms (default 400). */
  readonly blinkMs?: number;
  /** Style for the placeholder text — LVGL's `LV_PART_TEXTAREA_PLACEHOLDER`. */
  readonly placeholderStyle?: StyleSet;
  /** Style for the selection highlight — LVGL's `LV_PART_SELECTED`. */
  readonly selectionStyle?: StyleSet;
  /** Style for the caret — LVGL's `LV_PART_CURSOR`. */
  readonly cursorStyle?: StyleSet;
}

/**
 * An editable text box, mirroring LVGL's `lv_textarea`: a caret and selection,
 * word wrapping or a single scrolling line, a placeholder, and password
 * masking. Keys reach it as `key` events from a {@link FocusGroup} (add it to
 * `simulator.focusGroup`, then type); pointer press and drag place the caret
 * and select. It fires `valueChanged` when the text changes, `ready` on Enter
 * in one-line mode, and `cancel` on Escape. The caret only shows while it has
 * focus. Typed input arrives key by key, so IME composition and paste are
 * not handled.
 */
export class Textarea extends LvObject implements PointerDraggable {
  oneLine: boolean;
  passwordMode: boolean;
  passwordChar: string;
  placeholder: string;
  blinkMs: number;
  /** Style for the placeholder text — LVGL's `LV_PART_TEXTAREA_PLACEHOLDER`. */
  placeholderStyle: StyleSet;
  /** Style for the selection highlight — LVGL's `LV_PART_SELECTED`. */
  selectionStyle: StyleSet;
  /** Style for the caret — LVGL's `LV_PART_CURSOR`. */
  cursorStyle: StyleSet;

  private readonly editState: TextEditState;
  private readonly now: () => number;
  private lastActivityAt: number;
  private measureContext: CanvasRenderingContext2D | undefined;
  private scrollOffsetX = 0;
  private scrollOffsetY = 0;
  private placingCaret = false;
  private preferredX: number | undefined;

  /** Creates a text area; the caret starts at the end of any initial text. */
  constructor(options: TextareaOptions) {
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
            padTop: DEFAULT_PADDING,
            padRight: DEFAULT_PADDING,
            padBottom: DEFAULT_PADDING,
            padLeft: DEFAULT_PADDING,
            textColor: defaultTheme.textColor,
            textFontSize: defaultTheme.fontSize,
            textFontFamily: defaultTheme.fontFamily,
          },
          options.style?.base,
        ),
        states: options.style?.states,
      },
    });
    this.oneLine = options.oneLine ?? false;
    this.passwordMode = options.passwordMode ?? false;
    this.passwordChar = options.passwordChar ?? '•';
    this.placeholder = options.placeholder ?? '';
    this.blinkMs = options.blinkMs ?? 400;
    this.placeholderStyle = {
      base: mergeStyle({ textColor: '#a0a0a0' }, options.placeholderStyle?.base),
      states: options.placeholderStyle?.states,
    };
    this.selectionStyle = {
      base: mergeStyle(
        { bgColor: defaultTheme.primaryColor, bgOpa: 90 },
        options.selectionStyle?.base,
      ),
      states: options.selectionStyle?.states,
    };
    this.cursorStyle = {
      base: mergeStyle({ bgColor: defaultTheme.textColor }, options.cursorStyle?.base),
      states: options.cursorStyle?.states,
    };
    this.now = options.now ?? ((): number => performance.now());
    this.lastActivityAt = this.now();
    this.editState = new TextEditState({
      text: options.text,
      maxLength: options.maxLength,
      acceptedChars: options.acceptedChars,
      multiline: !this.oneLine,
    });

    this.addEventListener('key', (event) => this.handleKeyEvent(event));
    this.addEventListener('pressed', () => {
      this.placingCaret = true;
    });
  }

  get text(): string {
    return this.editState.text;
  }

  /** The caret's character offset. */
  get caret(): number {
    return this.editState.caret;
  }

  /** The selected range, or `null` when nothing is selected. */
  get selection(): { readonly start: number; readonly end: number } | null {
    return this.editState.selection;
  }

  get selectedText(): string {
    return this.editState.selectedText;
  }

  /** The text as drawn: masked in password mode. */
  get displayText(): string {
    return this.passwordMode ? this.passwordChar.repeat(this.editState.text.length) : this.text;
  }

  /** Replaces the text, firing `valueChanged` if it differs. Mirrors `lv_textarea_set_text`. */
  setText(text: string): void {
    const before = this.editState.text;
    this.editState.setText(text);
    this.touch();
    if (this.editState.text !== before) {
      this.dispatchEvent('valueChanged');
    }
  }

  /** Inserts `text` at the caret, replacing any selection. Mirrors `lv_textarea_add_text`. */
  insertText(text: string): void {
    this.apply(() => this.editState.insert(text));
  }

  /** Deletes the selection, or the character before the caret. Mirrors `lv_textarea_delete_char`. */
  deleteBackward(): void {
    this.apply(() => this.editState.deleteBackward());
  }

  /** Deletes the selection, or the character after the caret. Mirrors `lv_textarea_delete_char_forward`. */
  deleteForward(): void {
    this.apply(() => this.editState.deleteForward());
  }

  /** Moves the caret by `delta` characters, extending the selection when `extend` is set. */
  moveCaret(delta: number, extend = false): void {
    this.editState.moveCaret(delta, extend);
    this.preferredX = undefined;
    this.touch();
  }

  /** Puts the caret at character offset `offset`, extending the selection when `extend` is set. */
  setCaret(offset: number, extend = false): void {
    this.editState.setCaret(offset, extend);
    this.preferredX = undefined;
    this.touch();
  }

  selectAll(): void {
    this.editState.selectAll();
    this.touch();
  }

  /** Restarts the caret's blink so it shows solid right after any edit or move. */
  private touch(): void {
    this.lastActivityAt = this.now();
  }

  /** Runs an edit and fires `valueChanged` when it changed the text. */
  private apply(edit: () => unknown): void {
    const before = this.editState.text;
    edit();
    this.preferredX = undefined;
    this.touch();
    if (this.editState.text !== before) {
      this.dispatchEvent('valueChanged');
    }
  }

  /** The text's font, in CSS form. */
  private get font(): string {
    const style = this.resolvedStyle;
    return fontString(
      style.textFontSize ?? defaultTheme.fontSize,
      style.textFontFamily ?? defaultTheme.fontFamily,
    );
  }

  /** Height of one line of text: the font size times the line-height ratio, rounded. */
  private get lineHeight(): number {
    return Math.round(
      (this.resolvedStyle.textFontSize ?? defaultTheme.fontSize) * LINE_HEIGHT_RATIO,
    );
  }

  /** A width measurer: the real canvas once painted, a per-character estimate before that. */
  private get measure(): MeasureText {
    const context = this.measureContext;
    if (context) {
      const font = this.font;
      return (text) => textMeasurer.measure(context, text, font);
    }
    const charWidth =
      (this.resolvedStyle.textFontSize ?? defaultTheme.fontSize) * FALLBACK_CHAR_RATIO;
    return (text) => text.length * charWidth;
  }

  /** The inset content box the text is laid out in. */
  private get contentBox(): { left: number; top: number; width: number; height: number } {
    const style = this.resolvedStyle;
    const left = style.padLeft ?? 0;
    const top = style.padTop ?? 0;
    return {
      left,
      top,
      width: Math.max(0, this.width - left - (style.padRight ?? 0)),
      height: Math.max(0, this.height - top - (style.padBottom ?? 0)),
    };
  }

  /** The laid-out lines of the displayed text. */
  private get lines(): readonly TextLine[] {
    return wrapLines(
      this.displayText,
      this.oneLine ? 0 : this.contentBox.width,
      this.measure,
      !this.oneLine,
    );
  }

  /** Applies a `key` event to the text, firing `ready`/`cancel` and `valueChanged` as appropriate. */
  private handleKeyEvent(event: LvKeyEvent): void {
    const { key } = event;
    if (key === 'Enter' && this.oneLine) {
      this.dispatchEvent('ready');
      return;
    }
    if (key === 'Escape') {
      this.dispatchEvent('cancel');
      return;
    }
    if ((key === 'ArrowUp' || key === 'ArrowDown') && !this.oneLine) {
      this.moveVertically(key === 'ArrowDown' ? 1 : -1, event.shiftKey === true);
      return;
    }

    const before = this.editState.text;
    this.editState.handleKey(key, {
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
    });
    this.preferredX = undefined;
    this.touch();
    if (this.editState.text !== before) {
      this.dispatchEvent('valueChanged');
    }
  }

  /** Moves the caret one line up or down, keeping its pixel column. */
  private moveVertically(delta: number, extend: boolean): void {
    const lines = this.lines;
    const measure = this.measure;
    const text = this.displayText;
    const caret = this.editState.caret;
    this.preferredX ??= caretPosition(text, lines, caret, measure).x;
    const next = moveOffsetVertically(text, lines, caret, delta, this.preferredX, measure);
    const keep = this.preferredX;
    this.editState.setCaret(next, extend);
    this.preferredX = keep;
    this.touch();
  }

  /**
   * Places the caret at a pointer position local to the textarea's top-left
   * (see {@link PointerDraggable}): the first position after a press moves the
   * caret and clears the selection; later ones, while dragging, extend it.
   */
  handlePointerPosition(localX: number, localY = 0): void {
    const box = this.contentBox;
    const offset = offsetAtPoint(
      this.displayText,
      this.lines,
      localX - box.left + this.scrollOffsetX,
      localY - box.top + this.scrollOffsetY,
      this.lineHeight,
      this.measure,
    );
    this.editState.setCaret(offset, !this.placingCaret);
    this.placingCaret = false;
    this.preferredX = undefined;
    this.touch();
  }

  /** Whether the caret is in the visible half of its blink cycle. */
  get caretVisible(): boolean {
    if (!this.focused) {
      return false;
    }
    const phase = Math.floor(Math.max(0, this.now() - this.lastActivityAt) / this.blinkMs);
    return phase % 2 === 0;
  }

  /** Scrolls the view just enough to keep the caret inside the content box. */
  private followCaret(
    caretX: number,
    caretLine: number,
    box: { width: number; height: number },
  ): void {
    if (this.oneLine) {
      if (caretX - this.scrollOffsetX > box.width - CARET_WIDTH) {
        this.scrollOffsetX = caretX - (box.width - CARET_WIDTH);
      } else if (caretX < this.scrollOffsetX) {
        this.scrollOffsetX = caretX;
      }
      this.scrollOffsetY = 0;
      return;
    }
    this.scrollOffsetX = 0;
    const top = caretLine * this.lineHeight;
    if (top + this.lineHeight - this.scrollOffsetY > box.height) {
      this.scrollOffsetY = top + this.lineHeight - box.height;
    } else if (top < this.scrollOffsetY) {
      this.scrollOffsetY = top;
    }
  }

  /** Paints the box, then (clipped to its content area) the selection, text or placeholder, and caret. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    this.measureContext = context;
    const style = this.resolvedStyle;
    const states = this.getActiveStates();
    const { x, y } = this.getAbsolutePosition();
    paintBackgroundAndBorder(context, x, y, this.width, this.height, style);

    const box = this.contentBox;
    const measure = this.measure;
    const text = this.displayText;
    const lines = this.lines;
    const lineHeight = this.lineHeight;
    const caret = caretPosition(text, lines, this.editState.caret, measure);
    this.followCaret(caret.x, caret.line, box);

    const originX = x + box.left - this.scrollOffsetX;
    const originY = y + box.top - this.scrollOffsetY;

    context.save();
    context.beginPath();
    context.rect(x + box.left, y + box.top, box.width, box.height);
    context.clip();

    const selection = this.editState.selection;
    if (selection) {
      const highlight = resolveStyle(this.selectionStyle, states);
      context.fillStyle = withOpacity(
        highlight.bgColor ?? defaultTheme.primaryColor,
        highlight.bgOpa,
      );
      lines.forEach((line, index) => {
        const from = Math.max(selection.start, line.start);
        const to = Math.min(selection.end, line.end);
        if (to <= from) {
          return;
        }
        const left = measure(text.slice(line.start, from));
        const right = measure(text.slice(line.start, to));
        context.fillRect(originX + left, originY + index * lineHeight, right - left, lineHeight);
      });
    }

    context.font = this.font;
    context.textAlign = 'left';
    context.textBaseline = 'top';
    if (text === '' && this.placeholder !== '') {
      const placeholder = resolveStyle(this.placeholderStyle, states);
      context.fillStyle = placeholder.textColor ?? '#a0a0a0';
      context.fillText(this.placeholder, originX, originY);
    } else {
      context.fillStyle = style.textColor ?? defaultTheme.textColor;
      lines.forEach((line, index) => {
        context.fillText(text.slice(line.start, line.end), originX, originY + index * lineHeight);
      });
    }

    if (this.caretVisible) {
      const cursor = resolveStyle(this.cursorStyle, states);
      context.fillStyle = withOpacity(cursor.bgColor ?? defaultTheme.textColor, cursor.bgOpa);
      context.fillRect(
        originX + caret.x,
        originY + caret.line * lineHeight,
        CARET_WIDTH,
        lineHeight,
      );
    }
    context.restore();
  }
}
