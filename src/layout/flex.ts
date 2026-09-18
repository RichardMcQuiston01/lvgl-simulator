import type { LvObject } from '../core/LvObject.js';

export type FlexDirection = 'row' | 'column';
export type FlexWrap = 'nowrap' | 'wrap';
/** Mirrors LVGL's `LV_FLEX_ALIGN_*` (main axis / `justify-content`). */
export type FlexMainAlign =
  'start' | 'center' | 'end' | 'space_between' | 'space_around' | 'space_evenly';
/** Mirrors LVGL's `LV_FLEX_ALIGN_*` restricted to what the cross axis supports (`align-items`). */
export type FlexCrossAlign = 'start' | 'center' | 'end';

export interface FlexLayout {
  readonly type: 'flex';
  readonly direction?: FlexDirection;
  readonly wrap?: FlexWrap;
  readonly mainAlign?: FlexMainAlign;
  readonly crossAlign?: FlexCrossAlign;
  /** Gap between rows — the cross axis when `direction` is `row`, the main axis when `column`. */
  readonly rowGap?: number;
  /** Gap between columns — the main axis when `direction` is `row`, the cross axis when `column`. */
  readonly columnGap?: number;
}

interface LineLayoutParams {
  readonly isRow: boolean;
  readonly mainAlign: FlexMainAlign;
  readonly crossAlign: FlexCrossAlign;
  readonly mainGap: number;
  readonly contentMain: number;
  readonly crossOffset: number;
  readonly lineCrossSize: number;
}

/**
 * Positions `children` within a `contentWidth`x`contentHeight` content box
 * (already inset by the container's own padding) per LVGL flex semantics:
 * main-axis distribution — including `flex_grow`, which consumes free
 * space before alignment runs, same as LVGL and CSS — optional wrapping
 * into lines, and cross-axis alignment. Mutates each child's x/y (and
 * width/height, only for children whose `flexGrow` stretches them).
 * Coordinates are relative to the content box's own origin (0, 0), not
 * the display — the caller (see `Container.updateLayout`) offsets by its
 * own padding afterward.
 */
export function applyFlexLayout(
  children: readonly LvObject[],
  contentWidth: number,
  contentHeight: number,
  layout: FlexLayout,
): void {
  const isRow = (layout.direction ?? 'row') === 'row';
  const wrap = layout.wrap ?? 'nowrap';
  const mainAlign = layout.mainAlign ?? 'start';
  const crossAlign = layout.crossAlign ?? 'start';
  const mainGap = isRow ? (layout.columnGap ?? 0) : (layout.rowGap ?? 0);
  const crossGap = isRow ? (layout.rowGap ?? 0) : (layout.columnGap ?? 0);
  const contentMain = isRow ? contentWidth : contentHeight;
  const contentCross = isRow ? contentHeight : contentWidth;

  const lines =
    wrap === 'wrap' ? splitIntoLines(children, contentMain, mainGap, isRow) : [children.slice()];

  let crossCursor = 0;
  for (const line of lines) {
    // A single (non-wrapped) line fills the whole cross axis, so alignment
    // centers/ends within the container — matching CSS/LVGL flex. Once
    // wrapping produces multiple lines, each line packs to its own tallest
    // (or widest) child instead.
    const lineCrossSize =
      lines.length === 1
        ? contentCross
        : line.reduce((max, child) => Math.max(max, crossSize(child, isRow)), 0);
    layoutLine(line, {
      isRow,
      mainAlign,
      crossAlign,
      mainGap,
      contentMain,
      crossOffset: crossCursor,
      lineCrossSize,
    });
    crossCursor += lineCrossSize + crossGap;
  }
}

function mainSize(child: LvObject, isRow: boolean): number {
  return isRow ? child.width : child.height;
}

function crossSize(child: LvObject, isRow: boolean): number {
  return isRow ? child.height : child.width;
}

function splitIntoLines(
  children: readonly LvObject[],
  contentMain: number,
  mainGap: number,
  isRow: boolean,
): LvObject[][] {
  const lines: LvObject[][] = [];
  let current: LvObject[] = [];
  let currentMain = 0;

  for (const child of children) {
    const size = mainSize(child, isRow);
    const gapIfAppended = current.length > 0 ? mainGap : 0;
    if (current.length > 0 && currentMain + gapIfAppended + size > contentMain) {
      lines.push(current);
      current = [child];
      currentMain = size;
    } else {
      current.push(child);
      currentMain += gapIfAppended + size;
    }
  }
  if (current.length > 0) {
    lines.push(current);
  }
  return lines;
}

function layoutLine(line: readonly LvObject[], params: LineLayoutParams): void {
  const { isRow, mainAlign, crossAlign, mainGap, contentMain, crossOffset, lineCrossSize } = params;
  if (line.length === 0) {
    return;
  }

  const totalGap = mainGap * (line.length - 1);
  const totalGrow = line.reduce((sum, child) => sum + Math.max(0, child.flexGrow ?? 0), 0);
  const naturalMain = line.reduce((sum, child) => sum + mainSize(child, isRow), 0) + totalGap;
  let freeSpace = contentMain - naturalMain;

  if (totalGrow > 0 && freeSpace > 0) {
    for (const child of line) {
      const grow = Math.max(0, child.flexGrow ?? 0);
      if (grow <= 0) {
        continue;
      }
      const extra = (freeSpace * grow) / totalGrow;
      if (isRow) {
        child.width += extra;
      } else {
        child.height += extra;
      }
    }
    freeSpace = 0;
  }

  const { leadingSpace, betweenSpace } = distributeMainAlign(mainAlign, freeSpace, line.length);

  let mainCursor = leadingSpace;
  for (const child of line) {
    const crossPos = crossOffset + alignCross(crossAlign, lineCrossSize, crossSize(child, isRow));

    if (isRow) {
      child.x = mainCursor;
      child.y = crossPos;
    } else {
      child.y = mainCursor;
      child.x = crossPos;
    }

    mainCursor += mainSize(child, isRow) + mainGap + betweenSpace;
  }
}

function distributeMainAlign(
  align: FlexMainAlign,
  freeSpace: number,
  count: number,
): { readonly leadingSpace: number; readonly betweenSpace: number } {
  if (freeSpace <= 0 || count === 0) {
    return { leadingSpace: 0, betweenSpace: 0 };
  }
  switch (align) {
    case 'center':
      return { leadingSpace: freeSpace / 2, betweenSpace: 0 };
    case 'end':
      return { leadingSpace: freeSpace, betweenSpace: 0 };
    case 'space_between':
      return { leadingSpace: 0, betweenSpace: count > 1 ? freeSpace / (count - 1) : 0 };
    case 'space_around': {
      const each = freeSpace / count;
      return { leadingSpace: each / 2, betweenSpace: each };
    }
    case 'space_evenly': {
      const each = freeSpace / (count + 1);
      return { leadingSpace: each, betweenSpace: each };
    }
    case 'start':
    default:
      return { leadingSpace: 0, betweenSpace: 0 };
  }
}

function alignCross(align: FlexCrossAlign, lineCrossSize: number, childCrossSize: number): number {
  switch (align) {
    case 'center':
      return (lineCrossSize - childCrossSize) / 2;
    case 'end':
      return lineCrossSize - childCrossSize;
    case 'start':
    default:
      return 0;
  }
}
