/**
 * LVGL state flags this simulator models, mirroring `LV_STATE_*`. Real
 * LVGL states are bitflags that can combine freely; we approximate that
 * with a plain set plus a fixed priority order (see {@link resolveStyle}),
 * which is simpler and covers the common single-state cases this stage
 * targets (LVGL's own default theme mostly styles single states too).
 */
export type LvState = 'checked' | 'focused' | 'pressed' | 'disabled';

/**
 * A flat bag of paint properties, mirroring LVGL's core `lv_style_t`
 * property set closely enough that a future AST importer (Stage 5) can
 * map each field to/from the converter's `style_*` attributes 1:1:
 * `bgColor`/`bgOpa` ↔ `style_bg_color`/`style_bg_opa`, `borderWidth`/
 * `borderColor` ↔ `style_border_width`/`style_border_color`, `radius` ↔
 * `style_radius`, `padTop`/`padRight`/`padBottom`/`padLeft` ↔
 * `style_pad_top`/`style_pad_right`/`style_pad_bottom`/`style_pad_left`,
 * `textColor`/`textFontFamily`/`textFontSize` ↔ `style_text_color`/
 * `style_text_font` (LVGL bundles family+size into one font pointer; we
 * keep them separate since Canvas needs both), `opa` ↔ `style_opa`.
 *
 * All colors are `#rrggbb` hex strings; `bgOpa`/`opa` are 0–255, matching
 * LVGL's `LV_OPA_*` scale (not CSS's 0–1).
 */
export interface Style {
  readonly bgColor?: string;
  readonly bgOpa?: number;
  readonly borderWidth?: number;
  readonly borderColor?: string;
  readonly radius?: number;
  readonly padTop?: number;
  readonly padRight?: number;
  readonly padBottom?: number;
  readonly padLeft?: number;
  readonly textColor?: string;
  readonly textFontFamily?: string;
  readonly textFontSize?: number;
  readonly opa?: number;
}

/**
 * A base style plus per-state overrides, mirroring how LVGL objects
 * accumulate styles per `(part, state)` — see the widgets in
 * `src/widgets/` for how each maps its LVGL "parts" (e.g. a slider's
 * track/indicator/knob) to separate `StyleSet` fields, all resolved
 * against the same object states. `states` overrides are partial: only
 * the properties that actually change in that state need to be listed.
 */
export interface StyleSet {
  readonly base: Style;
  readonly states?: Partial<Record<LvState, Partial<Style>>>;
}

/**
 * Priority order (lowest to highest) in which active states are layered
 * on top of `base` when more than one is active simultaneously — e.g. a
 * `disabled` + `pressed` object resolves as disabled, since that's the
 * more specific real-world case (a disabled control isn't actually
 * pressable). LVGL itself resolves this via per-style specificity/add
 * order rather than a fixed list; this is a documented simplification.
 */
const STATE_PRIORITY: readonly LvState[] = ['checked', 'focused', 'pressed', 'disabled'];

/** Resolves `styleSet` against `activeStates` into a single concrete {@link Style}. */
export function resolveStyle(styleSet: StyleSet, activeStates: ReadonlySet<LvState>): Style {
  let resolved: Style = styleSet.base;
  for (const state of STATE_PRIORITY) {
    const override = activeStates.has(state) ? styleSet.states?.[state] : undefined;
    if (override) {
      resolved = { ...resolved, ...override };
    }
  }
  return resolved;
}

/** Convenience for a uniform inset on all four sides, matching LVGL's `style_pad_all`. */
export function paddingAll(
  value: number,
): Pick<Style, 'padTop' | 'padRight' | 'padBottom' | 'padLeft'> {
  return { padTop: value, padRight: value, padBottom: value, padLeft: value };
}

/**
 * Merges partial styles left-to-right, later parts winning — except an
 * `undefined` property value never overwrites an earlier one. Lets widget
 * constructors layer theme defaults, a caller-supplied `style.base`, and
 * flat convenience options (e.g. `LabelOptions.textColor`) without an
 * unset convenience option clobbering an explicit `style.base` value.
 */
export function mergeStyle(...parts: ReadonlyArray<Partial<Style> | undefined>): Style {
  const result: { [K in keyof Style]?: Style[K] } = {};
  for (const part of parts) {
    if (!part) {
      continue;
    }
    for (const key of Object.keys(part) as Array<keyof Style>) {
      const value = part[key];
      if (value !== undefined) {
        (result as Record<string, unknown>)[key] = value;
      }
    }
  }
  return result;
}
