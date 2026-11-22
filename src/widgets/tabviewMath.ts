/**
 * Geometry for the `Tabview` widget, kept free of drawing so it is exactly
 * testable. Everything is in the tab view's own coordinates.
 */

/** Which edge the tab bar sits on, mirroring `lv_tabview_set_tab_bar_position`. */
export type TabPosition = 'top' | 'bottom' | 'left' | 'right';

/** A rectangle, in the tab view's coordinates. */
export interface TabRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Where the tab bar and the page area go in a `width` by `height` tab view with a bar `barSize` thick. */
export function tabviewLayout(
  width: number,
  height: number,
  position: TabPosition,
  barSize: number,
): { readonly bar: TabRect; readonly content: TabRect } {
  const horizontal = position === 'top' || position === 'bottom';
  const bar = Math.max(0, Math.min(horizontal ? height : width, barSize));
  switch (position) {
    case 'top':
      return {
        bar: { x: 0, y: 0, width, height: bar },
        content: { x: 0, y: bar, width, height: height - bar },
      };
    case 'bottom':
      return {
        bar: { x: 0, y: height - bar, width, height: bar },
        content: { x: 0, y: 0, width, height: height - bar },
      };
    case 'left':
      return {
        bar: { x: 0, y: 0, width: bar, height },
        content: { x: bar, y: 0, width: width - bar, height },
      };
    case 'right':
      return {
        bar: { x: width - bar, y: 0, width: bar, height },
        content: { x: 0, y: 0, width: width - bar, height },
      };
  }
}

/** The `count` tab buttons' rectangles, sharing the bar equally along its length (side by side for top/bottom, stacked for left/right). */
export function tabButtonRects(bar: TabRect, position: TabPosition, count: number): TabRect[] {
  if (count <= 0) {
    return [];
  }
  const horizontal = position === 'top' || position === 'bottom';
  const rects: TabRect[] = [];
  for (let index = 0; index < count; index += 1) {
    rects.push(
      horizontal
        ? {
            x: bar.x + (bar.width * index) / count,
            y: bar.y,
            width: bar.width / count,
            height: bar.height,
          }
        : {
            x: bar.x,
            y: bar.y + (bar.height * index) / count,
            width: bar.width,
            height: bar.height / count,
          },
    );
  }
  return rects;
}

/** The marker drawn on the active tab's button: a `thickness` line along the edge that faces the pages. */
export function tabIndicatorRect(
  button: TabRect,
  position: TabPosition,
  thickness: number,
): TabRect {
  switch (position) {
    case 'top':
      return {
        x: button.x,
        y: button.y + button.height - thickness,
        width: button.width,
        height: thickness,
      };
    case 'bottom':
      return { x: button.x, y: button.y, width: button.width, height: thickness };
    case 'left':
      return {
        x: button.x + button.width - thickness,
        y: button.y,
        width: thickness,
        height: button.height,
      };
    case 'right':
      return { x: button.x, y: button.y, width: thickness, height: button.height };
  }
}

/** The page nearest the scroll offset `scrollX` when each page is `pageWidth` wide, kept to `0..count-1`. */
export function activeIndexAt(scrollX: number, pageWidth: number, count: number): number {
  if (count <= 0 || pageWidth <= 0) {
    return 0;
  }
  return Math.min(count - 1, Math.max(0, Math.round(scrollX / pageWidth)));
}
