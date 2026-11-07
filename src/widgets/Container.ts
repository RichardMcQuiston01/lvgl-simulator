import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import { applyFlexLayout, type FlexLayout } from '../layout/flex.js';
import { applyGridLayout, type GridLayout } from '../layout/grid.js';
import { paddingAll } from '../style/Style.js';

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

  /** Creates a container, folding the `padding` shorthand into its base style unless a per-side pad is set. */
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

  /** The padding that counts toward the scrollable area: the layout's padding when a layout applies it, otherwise none. */
  override get scrollContentInsets(): {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  } {
    if (!this.layout) {
      return super.scrollContentInsets;
    }
    const style = this.resolvedStyle;
    return {
      left: style.padLeft ?? 0,
      top: style.padTop ?? 0,
      right: style.padRight ?? 0,
      bottom: style.padBottom ?? 0,
    };
  }

  /** Lays out the children that participate in layout (excluding hidden, floating and ignore-layout ones) inside the padded content box. */
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

    const laidOutChildren = this.children.filter((child) => child.participatesInLayout);
    if (this.layout.type === 'flex') {
      applyFlexLayout(laidOutChildren, contentWidth, contentHeight, this.layout);
    } else {
      applyGridLayout(laidOutChildren, contentWidth, contentHeight, this.layout);
    }

    for (const child of laidOutChildren) {
      child.x += padLeft;
      child.y += padTop;
    }
  }
}
