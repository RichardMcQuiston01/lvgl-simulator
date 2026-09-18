import { LvObject, type LvObjectOptions } from '../core/LvObject';
import { applyFlexLayout, type FlexLayout } from '../layout/flex';
import { applyGridLayout, type GridLayout } from '../layout/grid';

export type ContainerLayout = FlexLayout | GridLayout;

export interface ContainerOptions extends LvObjectOptions {
  readonly layout?: ContainerLayout;
  /** Uniform inset applied to all sides of the content area before layout runs. */
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
  padding: number;

  constructor(options: ContainerOptions) {
    super(options);
    this.layout = options.layout;
    this.padding = options.padding ?? 0;
  }

  protected override updateLayout(): void {
    if (!this.layout) {
      return;
    }

    const contentWidth = Math.max(0, this.width - this.padding * 2);
    const contentHeight = Math.max(0, this.height - this.padding * 2);

    if (this.layout.type === 'flex') {
      applyFlexLayout(this.children, contentWidth, contentHeight, this.layout);
    } else {
      applyGridLayout(this.children, contentWidth, contentHeight, this.layout);
    }

    for (const child of this.children) {
      child.x += this.padding;
      child.y += this.padding;
    }
  }
}
