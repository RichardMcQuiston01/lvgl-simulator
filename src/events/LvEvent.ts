import type { LvObject } from '../core/LvObject.js';

/** An event dispatched by an {@link LvObject}, mirroring LVGL's `lv_event_t`. */
export interface LvEvent {
  readonly target: LvObject;
}

/** Direction of a swipe gesture, mirroring `lv_dir_t` (`LV_DIR_*`). */
export type LvGestureDirection = 'left' | 'right' | 'top' | 'bottom';

/** Payload of a `key` event, mirroring `lv_event_get_key`. Uses DOM `KeyboardEvent.key` names. */
export interface LvKeyEvent extends LvEvent {
  readonly key: string;
  /** Present (and `true`) only when the modifier was held, so plain keys keep the minimal `{ key }` shape. */
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
}

/** Payload of a `gesture` event, mirroring `lv_indev_get_gesture_dir`. */
export interface LvGestureEvent extends LvEvent {
  readonly direction: LvGestureDirection;
}

/**
 * Event types this simulator dispatches, mirroring LVGL's `LV_EVENT_*`
 * codes: `pressed`/`released` on every hit-testable object as a pointer
 * presses/releases it, `clicked` when a release lands back on the same
 * object it was pressed on, and `valueChanged` when a widget's own value
 * changes (e.g. a `Checkbox`/`Switch` toggling, a `Slider` being dragged).
 *
 * Also: `pressLost` (the pointer
 * started scrolling, so the press is abandoned); `longPressed` (held past the long-press time) and
 * `longPressedRepeat` (every repeat interval after that); `scrollBegin`/
 * `scroll`/`scrollEnd` around a scroll gesture; `gesture` for a swipe;
 * `key` for keyboard/encoder input on a focused object; and `focused`/
 * `defocused` as a {@link FocusGroup} moves focus.
 */
export interface LvEventMap {
  pressed: LvEvent;
  released: LvEvent;
  clicked: LvEvent;
  valueChanged: LvEvent;
  pressLost: LvEvent;
  longPressed: LvEvent;
  longPressedRepeat: LvEvent;
  scrollBegin: LvEvent;
  scroll: LvEvent;
  scrollEnd: LvEvent;
  gesture: LvGestureEvent;
  key: LvKeyEvent;
  focused: LvEvent;
  defocused: LvEvent;
}

/** The extra payload fields (beyond `target`) that `type` carries; `[]` when it has none. */
export type LvEventDetailArgs<K extends keyof LvEventMap> = keyof Omit<
  LvEventMap[K],
  'target'
> extends never
  ? []
  : [Omit<LvEventMap[K], 'target'>];
