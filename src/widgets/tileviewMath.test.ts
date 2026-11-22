import { describe, expect, it } from 'vitest';
import {
  ALL_TILE_DIRECTIONS,
  nearestTile,
  resolveDirections,
  tileAt,
  tileRange,
  type TileInfo,
} from './tileviewMath.js';

function tile(col: number, row: number, directions = ALL_TILE_DIRECTIONS): TileInfo {
  return { col, row, directions };
}

describe('resolveDirections', () => {
  it('allows everything not mentioned', () => {
    expect(resolveDirections(undefined)).toEqual(ALL_TILE_DIRECTIONS);
    expect(resolveDirections({ left: false })).toEqual({
      left: false,
      right: true,
      top: true,
      bottom: true,
    });
  });
});

describe('tileAt', () => {
  it('finds a tile by position', () => {
    const tiles = [tile(0, 0), tile(1, 0)];
    expect(tileAt(tiles, 1, 0)).toBe(tiles[1]);
    expect(tileAt(tiles, 2, 0)).toBeUndefined();
  });
});

describe('tileRange', () => {
  // A plus shape around (1, 1).
  const tiles = [tile(1, 0), tile(0, 1), tile(1, 1), tile(2, 1), tile(1, 2)];

  it('reaches one tile toward each neighbour that exists', () => {
    expect(tileRange(tileAt(tiles, 1, 1), tiles, 100, 50)).toEqual({
      minX: 0,
      maxX: 200,
      minY: 0,
      maxY: 100,
    });
  });

  it('does not reach toward a tile that is missing', () => {
    // (1, 0) has nothing above, left or right of it.
    expect(tileRange(tileAt(tiles, 1, 0), tiles, 100, 50)).toEqual({
      minX: 100,
      maxX: 100,
      minY: 0,
      maxY: 50,
    });
  });

  it('honours the directions a tile allows', () => {
    const restricted = [tile(0, 0, resolveDirections({ right: false })), tile(1, 0)];
    expect(tileRange(restricted[0], restricted, 100, 50)).toEqual({
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
    });
    expect(tileRange(restricted[1], restricted, 100, 50).minX).toBe(0);
  });

  it('is empty without an active tile', () => {
    expect(tileRange(undefined, tiles, 100, 50)).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
  });
});

describe('nearestTile', () => {
  const tiles = [tile(0, 0), tile(1, 0), tile(1, 1)];

  it('picks the tile whose origin is nearest the scroll offset', () => {
    expect(nearestTile(tiles, 40, 0, 100, 50)).toBe(tiles[0]);
    expect(nearestTile(tiles, 60, 0, 100, 50)).toBe(tiles[1]);
    expect(nearestTile(tiles, 90, 40, 100, 50)).toBe(tiles[2]);
  });

  it('never picks a position that has no tile', () => {
    expect(nearestTile(tiles, 0, 50, 100, 50)).toBe(tiles[0]);
  });

  it('falls back to the first tile for a zero size, and has none without tiles', () => {
    expect(nearestTile(tiles, 10, 10, 0, 0)).toBe(tiles[0]);
    expect(nearestTile([], 0, 0, 100, 50)).toBeUndefined();
  });
});
