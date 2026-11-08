import type { LvObject } from '../core/LvObject.js';

/**
 * How a {@link FocusGroup} interprets keys, mirroring LVGL's input device
 * types: `'keypad'` (Tab/Shift+Tab move focus; arrows and everything else
 * go to the focused object as `key` events) or `'encoder'` (arrows move
 * focus until Enter puts an `editable` object into edit mode, after which
 * arrows go to that object as `key` events until Enter/Escape leaves it).
 */
export type FocusGroupMode = 'keypad' | 'encoder';

/** Keys the focus group never consumes, so the browser keeps them: modifiers, lock keys and F1–F24. */
const UNHANDLED_KEYS =
  /^(Shift|Control|Alt|AltGraph|Meta|OS|CapsLock|NumLock|ScrollLock|Fn|FnLock|F\d{1,2})$/;

/** Modifier keys held with a key press. */
export interface KeyModifiers {
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
}

/** The `key` event payload for `key` pressed with `modifiers`, including only the flags that are set. */
function keyEventDetail(
  key: string,
  shiftKey: boolean,
  modifiers: KeyModifiers,
): { key: string; shiftKey?: true; ctrlKey?: true; metaKey?: true; altKey?: true } {
  const detail: { key: string; shiftKey?: true; ctrlKey?: true; metaKey?: true; altKey?: true } = {
    key,
  };
  if (shiftKey || modifiers.shiftKey) {
    detail.shiftKey = true;
  }
  if (modifiers.ctrlKey) {
    detail.ctrlKey = true;
  }
  if (modifiers.metaKey) {
    detail.metaKey = true;
  }
  if (modifiers.altKey) {
    detail.altKey = true;
  }
  return detail;
}

export interface FocusGroupOptions {
  readonly mode?: FocusGroupMode;
  /** Whether focus wraps past the first/last object (default `true`). Mirrors `lv_group_set_wrap`. */
  readonly wrap?: boolean;
}

/**
 * An ordered set of objects that keyboard/encoder input can focus,
 * mirroring `lv_group_t`. Moving focus updates each object's `focused`
 * state (so `style.states.focused` applies) and dispatches `defocused` on
 * the old object then `focused` on the new one. Hidden and disabled
 * objects are skipped when navigating.
 */
export class FocusGroup {
  mode: FocusGroupMode;
  wrap: boolean;
  /** True while the focused object is in encoder edit mode. */
  editing = false;

  private readonly members: LvObject[] = [];
  private focusedObject: LvObject | null = null;

  /** Creates an empty group; `mode` defaults to `'keypad'` and `wrap` to `true`. */
  constructor(options: FocusGroupOptions = {}) {
    this.mode = options.mode ?? 'keypad';
    this.wrap = options.wrap ?? true;
  }

  get objects(): readonly LvObject[] {
    return this.members;
  }

  get focusedItem(): LvObject | null {
    return this.focusedObject;
  }

  has(object: LvObject): boolean {
    return this.members.includes(object);
  }

  /** Adds `object`; the first object added takes focus. Mirrors `lv_group_add_obj`. */
  add(object: LvObject): void {
    if (this.members.includes(object)) {
      return;
    }
    this.members.push(object);
    if (!this.focusedObject && this.isFocusable(object)) {
      this.focus(object);
    }
  }

  /** Removes `object`, moving focus to its neighbour if it was focused. */
  remove(object: LvObject): void {
    const index = this.members.indexOf(object);
    if (index === -1) {
      return;
    }
    if (this.focusedObject === object) {
      const next = this.findFocusable(index, 1, false) ?? this.findFocusable(index, -1, false);
      this.members.splice(index, 1);
      object.focused = false;
      this.focusedObject = null;
      this.editing = false;
      object.dispatchEvent('defocused');
      if (next && next !== object) {
        this.focus(next);
      }
      return;
    }
    this.members.splice(index, 1);
  }

  /** Focuses `object` if it is in the group and focusable. Returns whether it now has focus. */
  focus(object: LvObject): boolean {
    if (!this.members.includes(object) || !this.isFocusable(object)) {
      return false;
    }
    if (this.focusedObject === object) {
      return true;
    }
    const previous = this.focusedObject;
    this.editing = false;
    if (previous) {
      previous.focused = false;
    }
    this.focusedObject = object;
    object.focused = true;
    previous?.dispatchEvent('defocused');
    object.dispatchEvent('focused');
    return true;
  }

  focusNext(): boolean {
    return this.step(1);
  }

  focusPrev(): boolean {
    return this.step(-1);
  }

  /**
   * Feeds one key press into the group. Returns whether it was consumed
   * (so a DOM listener knows to `preventDefault`). Key names are DOM
   * `KeyboardEvent.key` values.
   */
  handleKey(key: string, shiftKey = false, modifiers: KeyModifiers = {}): boolean {
    const focused = this.focusedObject;

    if (key === 'Tab') {
      return shiftKey ? this.focusPrev() : this.focusNext();
    }
    if (!focused) {
      return false;
    }

    if (key === 'Escape' && this.editing) {
      this.editing = false;
      return true;
    }
    if (this.mode === 'encoder' && !this.editing) {
      if (key === 'ArrowRight' || key === 'ArrowDown') {
        return this.focusNext();
      }
      if (key === 'ArrowLeft' || key === 'ArrowUp') {
        return this.focusPrev();
      }
    }

    // Past this point the key acts on the focused object, which may have
    // been disabled or hidden since it took focus; pointer input rejects such
    // objects, so keyboard input does too (navigation above still works).
    if (!this.isFocusable(focused)) {
      return false;
    }
    if (key === 'Enter') {
      return this.handleEnter(focused);
    }
    // Bare modifiers and function keys belong to the browser (reload, devtools).
    if (UNHANDLED_KEYS.test(key)) {
      return false;
    }

    focused.dispatchEvent('key', keyEventDetail(key, shiftKey, modifiers));
    return true;
  }

  /** Handles Enter: toggles edit mode on an editable object in encoder mode, otherwise activates the object like a click. */
  private handleEnter(focused: LvObject): boolean {
    if (this.mode === 'encoder' && focused.editable) {
      this.editing = !this.editing;
      return true;
    }
    // Enter activates the object like a click: press, release, then clicked.
    focused.dispatchEvent('key', { key: 'Enter' });
    focused.dispatchEvent('pressed');
    focused.dispatchEvent('released');
    focused.dispatchEvent('clicked');
    return true;
  }

  /** Whether `object` can hold focus: neither hidden nor disabled. */
  private isFocusable(object: LvObject): boolean {
    return !object.hidden && !object.disabled;
  }

  /** Moves focus one focusable member in `direction`. Returns whether focus changed. */
  private step(direction: 1 | -1): boolean {
    const current = this.focusedObject ? this.members.indexOf(this.focusedObject) : -1;
    const next = this.findFocusable(current, direction, this.wrap);
    if (!next || next === this.focusedObject) {
      return false;
    }
    return this.focus(next);
  }

  /** The next focusable member after `from` in `direction`, optionally wrapping around. */
  private findFocusable(from: number, direction: 1 | -1, wrap: boolean): LvObject | null {
    const count = this.members.length;
    for (let offset = 1; offset <= count; offset += 1) {
      let index = from + direction * offset;
      if (index < 0 || index >= count) {
        if (!wrap) {
          return null;
        }
        index = ((index % count) + count) % count;
      }
      const candidate = this.members[index];
      if (candidate && this.isFocusable(candidate)) {
        return candidate;
      }
    }
    return null;
  }
}

export interface KeyboardController {
  dispose(): void;
}

/**
 * Routes `keydown` events on `target` (e.g. the simulator's canvas, which
 * must be focusable via `tabIndex`) into `group`. Consumed keys have their
 * default prevented and trigger `render`. Browser shortcuts (Alt, Ctrl and
 * Cmd combinations) are left alone, except Ctrl/Cmd+A in an `editable`
 * object; AltGr passes through so typed characters such as `@` work.
 */
export function attachKeyboard(
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
  group: FocusGroup,
  render: () => void,
): KeyboardController {
  /** Routes a `keydown` into the focus group, preventing the default and rendering only when the key was consumed. */
  function onKeyDown(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    const { ctrlKey, metaKey, altKey, shiftKey, key } = keyEvent;
    // Ctrl+Alt is how Windows reports AltGr, which types printable characters.
    const altGr = ctrlKey && altKey;
    // Alt on its own, and Ctrl/Cmd shortcuts, belong to the browser, with one
    // exception: Ctrl/Cmd+A selects all in an editable object.
    const browserShortcut = (altKey && !altGr && !metaKey) || ((ctrlKey || metaKey) && !altGr);
    const selectAll = key.toLowerCase() === 'a' && group.focusedItem?.editable === true;
    if (browserShortcut && !selectAll) {
      return;
    }
    if (group.handleKey(key, shiftKey, { ctrlKey, metaKey, altKey })) {
      keyEvent.preventDefault();
      render();
    }
  }

  target.addEventListener('keydown', onKeyDown);
  return {
    dispose(): void {
      target.removeEventListener('keydown', onKeyDown);
    },
  };
}
