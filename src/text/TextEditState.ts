export interface TextEditStateOptions {
  readonly text?: string;
  /** Caps the text length. Mirrors `lv_textarea_set_max_length`. */
  readonly maxLength?: number;
  /** When set, only these characters can be inserted. Mirrors `lv_textarea_set_accepted_chars`. */
  readonly acceptedChars?: string;
  /** Whether Enter inserts a newline (default `false`, i.e. one-line mode). */
  readonly multiline?: boolean;
}

/**
 * Caret and selection model for editable text, shared by `Textarea`,
 * `Spinbox` and `Keyboard`-driven widgets. Pure data and key handling with
 * no rendering, so it is fully unit-testable; widgets read `text`, `caret`
 * and `selection` to paint. Indices are UTF-16 code-unit offsets.
 */
export class TextEditState {
  maxLength: number | undefined;
  acceptedChars: string | undefined;
  multiline: boolean;

  private value: string;
  private caretIndex: number;
  private anchorIndex: number | null = null;

  constructor(options: TextEditStateOptions = {}) {
    this.value = options.text ?? '';
    this.caretIndex = this.value.length;
    this.maxLength = options.maxLength;
    this.acceptedChars = options.acceptedChars;
    this.multiline = options.multiline ?? false;
  }

  get text(): string {
    return this.value;
  }

  get caret(): number {
    return this.caretIndex;
  }

  /** The selected range, or `null` when nothing is selected. */
  get selection(): { readonly start: number; readonly end: number } | null {
    if (this.anchorIndex === null || this.anchorIndex === this.caretIndex) {
      return null;
    }
    return {
      start: Math.min(this.anchorIndex, this.caretIndex),
      end: Math.max(this.anchorIndex, this.caretIndex),
    };
  }

  get selectedText(): string {
    const range = this.selection;
    return range ? this.value.slice(range.start, range.end) : '';
  }

  /** Replaces the text, keeping the caret in range and clearing the selection. */
  setText(text: string): void {
    this.value = this.maxLength === undefined ? text : text.slice(0, this.maxLength);
    this.caretIndex = Math.min(this.caretIndex, this.value.length);
    this.anchorIndex = null;
  }

  /** Moves the caret to `index` (clamped); `extend` grows the selection from where it started. */
  setCaret(index: number, extend = false): void {
    if (extend) {
      this.anchorIndex ??= this.caretIndex;
    } else {
      this.anchorIndex = null;
    }
    this.caretIndex = Math.max(0, Math.min(this.value.length, index));
  }

  moveCaret(delta: number, extend = false): void {
    const range = this.selection;
    if (!extend && range && Math.abs(delta) === 1) {
      // Collapsing a selection lands on its near edge, like most text fields.
      this.setCaret(delta < 0 ? range.start : range.end);
      return;
    }
    this.setCaret(this.caretIndex + delta, extend);
  }

  selectAll(): void {
    this.anchorIndex = 0;
    this.caretIndex = this.value.length;
  }

  /**
   * Inserts `input` at the caret (replacing any selection), dropping
   * characters outside `acceptedChars` and anything past `maxLength`.
   * Returns whether the text changed.
   */
  insert(input: string): boolean {
    let accepted = input;
    if (this.acceptedChars !== undefined) {
      accepted = [...accepted].filter((char) => this.acceptedChars?.includes(char)).join('');
    }
    if (!this.multiline) {
      accepted = accepted.replace(/[\r\n]/g, '');
    }

    const range = this.selection;
    const start = range?.start ?? this.caretIndex;
    const end = range?.end ?? this.caretIndex;
    if (this.maxLength !== undefined) {
      accepted = accepted.slice(
        0,
        Math.max(0, this.maxLength - (this.value.length - (end - start))),
      );
    }
    if (accepted === '' && start === end) {
      return false;
    }

    this.value = this.value.slice(0, start) + accepted + this.value.slice(end);
    this.caretIndex = start + accepted.length;
    this.anchorIndex = null;
    return true;
  }

  /** Deletes the selection, or the character before the caret. Mirrors `lv_textarea_delete_char`. */
  deleteBackward(): boolean {
    return this.deleteRange(-1);
  }

  /** Deletes the selection, or the character after the caret. Mirrors `lv_textarea_delete_char_forward`. */
  deleteForward(): boolean {
    return this.deleteRange(1);
  }

  /**
   * Applies a DOM `KeyboardEvent.key` to the text: printable characters
   * insert, arrows/Home/End move the caret (Shift extends the selection),
   * Backspace/Delete remove, Enter inserts a newline when `multiline`, and
   * Ctrl/Cmd+A selects all. Returns whether the key was consumed.
   */
  handleKey(
    key: string,
    modifiers: { readonly shiftKey?: boolean; readonly ctrlKey?: boolean } = {},
  ): boolean {
    const extend = modifiers.shiftKey ?? false;
    switch (key) {
      case 'ArrowLeft':
        this.moveCaret(-1, extend);
        return true;
      case 'ArrowRight':
        this.moveCaret(1, extend);
        return true;
      case 'Home':
        this.setCaret(0, extend);
        return true;
      case 'End':
        this.setCaret(this.value.length, extend);
        return true;
      case 'Backspace':
        this.deleteBackward();
        return true;
      case 'Delete':
        this.deleteForward();
        return true;
      case 'Enter':
        if (!this.multiline) {
          return false;
        }
        this.insert('\n');
        return true;
      case 'a':
        if (modifiers.ctrlKey) {
          this.selectAll();
          return true;
        }
        break;
      default:
        break;
    }
    if ([...key].length === 1) {
      this.insert(key);
      return true;
    }
    return false;
  }

  private deleteRange(direction: -1 | 1): boolean {
    const range = this.selection;
    let start: number;
    let end: number;
    if (range) {
      start = range.start;
      end = range.end;
    } else if (direction < 0) {
      start = Math.max(0, this.caretIndex - 1);
      end = this.caretIndex;
    } else {
      start = this.caretIndex;
      end = Math.min(this.value.length, this.caretIndex + 1);
    }
    if (start === end) {
      return false;
    }
    this.value = this.value.slice(0, start) + this.value.slice(end);
    this.caretIndex = start;
    this.anchorIndex = null;
    return true;
  }
}
