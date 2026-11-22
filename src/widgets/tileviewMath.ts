/**
 * Tile bookkeeping for the `Tileview` widget, kept free of drawing so it is
 * exactly testable. Tiles sit on a grid of `col` by `row`; each is as big as
 * the view, so tile `(col, row)` starts at `(col * width, row * height)`.
 */

/** Which neighbouring tiles a tile lets you move to, mirroring the `LV_DIR_*` flags of `lv_tileview_add_tile`. */
export interface TileDirections {
  readonly left: boolean;
  readonly right: boolean;
  readonly top: boolean;
  readonly bottom: boolean;
}

/** A tile's grid position and the directions you may leave it in. */
export interface TileInfo {
  readonly col: number;
  readonly row: number;
  readonly directions: TileDirections;
}

/** The scroll offsets reachable from a tile. */
export interface TileRange {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

/** Every direction allowed. */
export const ALL_TILE_DIRECTIONS: TileDirections = {
  left: true,
  right: true,
  top: true,
  bottom: true,
};

/** Fills in a partial direction set; anything not mentioned is allowed. */
export function resolveDirections(partial: Partial<TileDirections> | undefined): TileDirections {
  return { ...ALL_TILE_DIRECTIONS, ...partial };
}

/** The tile at `(col, row)`, or `undefined`. */
export function tileAt(tiles: readonly TileInfo[], col: number, row: number): TileInfo | undefined {
  return tiles.find((tile) => tile.col === col && tile.row === row);
}

/**
 * The offsets you can scroll to from `active`: its own position, extended by
 * one tile toward each neighbour that exists and that `active` allows moving
 * to. This is what keeps a swipe to one tile and honours the direction flags.
 */
export function tileRange(
  active: TileInfo | undefined,
  tiles: readonly TileInfo[],
  width: number,
  height: number,
): TileRange {
  if (!active) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  const { col, row, directions } = active;
  const open = (dCol: number, dRow: number, allowed: boolean): boolean =>
    allowed && tileAt(tiles, col + dCol, row + dRow) !== undefined;
  return {
    minX: (open(-1, 0, directions.left) ? col - 1 : col) * width,
    maxX: (open(1, 0, directions.right) ? col + 1 : col) * width,
    minY: (open(0, -1, directions.top) ? row - 1 : row) * height,
    maxY: (open(0, 1, directions.bottom) ? row + 1 : row) * height,
  };
}

/** The tile nearest the scroll offset `(scrollX, scrollY)`, or `undefined` with no tiles. */
export function nearestTile(
  tiles: readonly TileInfo[],
  scrollX: number,
  scrollY: number,
  width: number,
  height: number,
): TileInfo | undefined {
  if (width <= 0 || height <= 0) {
    return tiles[0];
  }
  const col = scrollX / width;
  const row = scrollY / height;
  let best: TileInfo | undefined;
  let bestDistance = Infinity;
  for (const tile of tiles) {
    const distance = (tile.col - col) ** 2 + (tile.row - row) ** 2;
    if (distance < bestDistance) {
      best = tile;
      bestDistance = distance;
    }
  }
  return best;
}
