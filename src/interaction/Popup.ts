import type { LvObject } from '../core/LvObject.js';

/**
 * Implemented by widgets that open a popup (a dropdown's option list) which
 * should close when the pointer presses anywhere outside it. The
 * interaction controller duck-types for this, as it does for
 * `PointerDraggable`, rather than special-casing widget classes.
 */
export interface Popup {
  /** Whether the popup is currently showing. */
  readonly popupOpen: boolean;
  /** Closes the popup. */
  closePopup(): void;
  /** Whether a press on `target` counts as inside this widget or its popup, and so should leave it open. */
  ownsPopupTarget(target: LvObject): boolean;
}

/** Whether `value` implements {@link Popup}. */
export function isPopup(value: unknown): value is Popup {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Partial<Popup>).closePopup === 'function' &&
    typeof (value as Partial<Popup>).ownsPopupTarget === 'function'
  );
}

/**
 * Closes every open popup under `root` that `pressed` (the object under the
 * pointer, or `null` for empty space) is not part of. Returns whether any
 * closed.
 */
export function dismissPopups(root: LvObject, pressed: LvObject | null): boolean {
  let dismissed = false;
  /** Closes `node` if it is an open popup that `pressed` is outside, then checks its descendants. */
  const visit = (node: LvObject): void => {
    if (isPopup(node) && node.popupOpen && !(pressed && node.ownsPopupTarget(pressed))) {
      node.closePopup();
      dismissed = true;
    }
    node.children.forEach(visit);
  };
  visit(root);
  return dismissed;
}
