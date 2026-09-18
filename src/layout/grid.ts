import type { LvObject } from '../core/LvObject';

export interface GridLayout {
  readonly type: 'grid';
  /** Column track sizes in px, matching LVGL's `style_grid_column_dsc_array`. */
  readonly columns: readonly number[];
  /** Row track sizes in px, matching LVGL's `style_grid_row_dsc_array`. */
  readonly rows: readonly number[];
  readonly rowGap?: number;
  readonly columnGap?: number;
}

/**
 * Positions `children` into the grid tracks described by `layout`. Each
 * child may set `gridColumn`/`gridRow` (0-based) and `gridColumnSpan`/
 * `gridRowSpan` to place itself explicitly (mirrors LVGL's per-child grid
 * cell attributes); children that set neither are auto-placed in row-major
 * order, matching the fallback the `html-to-lvgl` converter uses for
 * browser-auto-placed grid items. A child's width/height is set to its
 * cell's spanned size — unlike the converter (which bakes in the
 * browser's already-computed pixel geometry), this is a live layout
 * engine, so cell size comes from the tracks, not from the child.
 */
export function applyGridLayout(
  children: readonly LvObject[],
  _contentWidth: number,
  _contentHeight: number,
  layout: GridLayout,
): void {
  const rowGap = layout.rowGap ?? 0;
  const columnGap = layout.columnGap ?? 0;
  const columnOffsets = trackOffsets(layout.columns, columnGap);
  const rowOffsets = trackOffsets(layout.rows, rowGap);
  const columnCount = layout.columns.length;

  let autoIndex = 0;
  for (const child of children) {
    const explicitPlacement = child.gridColumn !== undefined || child.gridRow !== undefined;
    const columnPos = child.gridColumn ?? (columnCount > 0 ? autoIndex % columnCount : 0);
    const rowPos = child.gridRow ?? (columnCount > 0 ? Math.floor(autoIndex / columnCount) : 0);
    if (!explicitPlacement) {
      autoIndex += 1;
    }

    const columnSpan = Math.max(1, child.gridColumnSpan ?? 1);
    const rowSpan = Math.max(1, child.gridRowSpan ?? 1);

    child.x = columnOffsets[columnPos] ?? 0;
    child.y = rowOffsets[rowPos] ?? 0;
    child.width = spanSize(layout.columns, columnPos, columnSpan, columnGap);
    child.height = spanSize(layout.rows, rowPos, rowSpan, rowGap);
  }
}

function trackOffsets(tracks: readonly number[], gap: number): number[] {
  const offsets: number[] = [];
  let cursor = 0;
  for (const size of tracks) {
    offsets.push(cursor);
    cursor += size + gap;
  }
  return offsets;
}

function spanSize(tracks: readonly number[], start: number, span: number, gap: number): number {
  let size = 0;
  for (let i = 0; i < span; i += 1) {
    size += tracks[start + i] ?? 0;
  }
  return size + gap * Math.max(0, span - 1);
}
