import { LvObject, type LvObjectOptions } from '../core/LvObject';
import { applyFlexLayout, type FlexLayout } from '../layout/flex';
import { applyGridLayout, type GridLayout } from '../layout/grid';
import { paddingAll } from '../style/Style';

export type ContainerLayout = FlexLayout | GridLayout;

export interface ContainerOptions extends LvObjectOptions {
  readonly layout?: ContainerLayout;
  /**
   * Convenience for a uniform `style.base` padding on all four sides
   * (mirrors LVGL's `style_pad_all`). Ignored if `style.base` already sets
   * any `pad*` field — pass those directly for per-side control.
   */
  readonly padding?: number;
}

/**
 * A plain box that can arrange its children with a flex or grid layout,
 * mirroring how an `lv_obj_t` gains flex/grid behavior via
 * `lv_obj_set_layout`. Without a `layout`, children keep the manual
 * positions LVGL uses by default (the base `LvObject` behavior).
 */
export class Container extends LvObject {
  layout: ContainerLayout | undefined;

  constructor(options: ContainerOptions) {
    const hasExplicitPadding =
      options.style?.base.padTop !== undefined ||
      options.style?.base.padRight !== undefined ||
      options.style?.base.padBottom !== undefined ||
      options.style?.base.padLeft !== undefined;

    super({
      ...options,
      style:
        options.padding !== undefined && !hasExplicitPadding
          ? { ...options.style, base: { ...options.style?.base, ...paddingAll(options.padding) } }
          : options.style,
    });
    this.layout = options.layout;
  }

  protected override updateLayout(): void {
    if (!this.layout) {
      return;
    }

    const style = this.resolvedStyle;
    const padTop = style.padTop ?? 0;
    const padRight = style.padRight ?? 0;
    const padBottom = style.padBottom ?? 0;
    const padLeft = style.padLeft ?? 0;

    const contentWidth = Math.max(0, this.width - padLeft - padRight);
    const contentHeight = Math.max(0, this.height - padTop - padBottom);

    if (this.layout.type === 'flex') {
      applyFlexLayout(this.children, contentWidth, contentHeight, this.layout);
    } else {
      applyGridLayout(this.children, contentWidth, contentHeight, this.layout);
    }

    for (const child of this.children) {
      child.x += padLeft;
      child.y += padTop;
    }
  }
}
