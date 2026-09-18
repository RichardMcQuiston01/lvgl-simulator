import type { LvObject } from '../core/LvObject';

/** An event dispatched by an {@link LvObject}, mirroring LVGL's `lv_event_t`. */
export interface LvEvent {
  readonly target: LvObject;
}

/**
 * Event types this simulator dispatches, mirroring LVGL's `LV_EVENT_*`
 * codes: `pressed`/`released` on every hit-testable object as a pointer
 * presses/releases it, `clicked` when a release lands back on the same
 * object it was pressed on, and `valueChanged` when a widget's own value
 * changes (e.g. a `Checkbox`/`Switch` toggling, a `Slider` being dragged).
 */
export interface LvEventMap {
  pressed: LvEvent;
  released: LvEvent;
  clicked: LvEvent;
  valueChanged: LvEvent;
}
