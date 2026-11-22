import type { AnimationEngine, AnimationHandle } from '../animation/Animation.js';
import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import type { ScrollRange } from '../scroll/scrollMath.js';
import { mergeStyle } from '../style/Style.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import { Container } from './Container.js';
import {
  nearestTile,
  reachableTiles,
  resolveDirections,
  tileAt,
  tileRange,
  type TileDirections,
  type TileInfo,
} from './tileviewMath.js';

export interface TileviewOptions extends LvObjectOptions {
  /** Animates moving to a tile from code or a key when given; without it the view jumps to the tile. */
  readonly animations?: AnimationEngine;
}

/** A tile's position in the grid. */
export interface TilePosition {
  readonly col: number;
  readonly row: number;
}

/**
 * A grid of full-size tiles you swipe between, mirroring LVGL's
 * `lv_tileview`. {@link addTile} puts a tile (a {@link Container} to fill) at
 * a column and row, and the view scrolls one tile at a time, snapping to a
 * whole tile, toward whichever neighbours exist and the current tile allows
 * (its `directions`). Fires `valueChanged` when the active tile changes.
 */
export class Tileview extends LvObject {
  private readonly tileList: { readonly info: TileInfo; readonly container: Container }[] = [];
  private active: TileInfo | undefined;
  /** The tile `valueChanged` last reported (or the first tile, which is never reported). */
  private announced: TileInfo | undefined;
  private readonly animations: AnimationEngine | undefined;
  private moving: AnimationHandle | undefined;
  private settling = false;
  /** While an animated move runs, the span between where it started and where it ends. */
  private moveRange: ScrollRange | undefined;

  /** Creates an empty tile view. */
  constructor(options: TileviewOptions) {
    super({
      ...options,
      scrollDirection: 'all',
      scrollbarMode: options.scrollbarMode ?? 'off',
      scrollSnapX: 'start',
      scrollSnapY: 'start',
      style: {
        base: mergeStyle({ bgColor: defaultTheme.backgroundColor }, options.style?.base),
        states: options.style?.states,
      },
    });
    this.animations = options.animations;
    this.addEventListener('scrollEnd', () => this.settle());
    this.addEventListener('scroll', () => {
      // Scrolls the controller is not driving (the mouse wheel) have no scrollEnd, so settle them here.
      if (!this.scrolling && !this.settling && !this.moving) {
        this.settle();
      }
    });
    this.addEventListener('key', (event) => {
      const moves: Readonly<Record<string, readonly [number, number]>> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const move = moves[event.key];
      if (move && this.active) {
        this.moveBy(move[0], move[1]);
      }
    });
  }

  /** The tiles' containers, in the order they were added. */
  get tiles(): readonly Container[] {
    return this.tileList.map((entry) => entry.container);
  }

  /** The grid position of the active tile, or `undefined` before any tile is added. */
  get activeTile(): TilePosition | undefined {
    return this.active ? { col: this.active.col, row: this.active.row } : undefined;
  }

  /** The container of the tile at `(col, row)`, or `undefined`. */
  tileContainer(col: number, row: number): Container | undefined {
    return this.tileList.find((entry) => entry.info.col === col && entry.info.row === row)
      ?.container;
  }

  /**
   * Adds a tile at `(col, row)` and returns its container to fill. By default
   * you can move to every neighbouring tile; `directions` turns some off.
   * The first tile added becomes the active one. Mirrors `lv_tileview_add_tile`.
   */
  addTile(col: number, row: number, directions?: Partial<TileDirections>): Container {
    if (tileAt(this.infos, col, row)) {
      throw new Error(`The tile view already has a tile at column ${col}, row ${row}.`);
    }
    const container = new Container({ width: this.width, height: this.height });
    const info: TileInfo = { col, row, directions: resolveDirections(directions) };
    this.tileList.push({ info, container });
    this.addChild(container);
    this.layoutTiles();
    if (!this.active) {
      this.active = info;
      this.announced = info;
      this.scrollX = col * this.width;
      this.scrollY = row * this.height;
    }
    return container;
  }

  /**
   * Moves to the tile at `(col, row)`, easing there when `animate` is true and
   * the view has an animation engine. Does nothing if there is no such tile.
   * Fires `valueChanged` if the active tile changed. Mirrors `lv_tileview_set_tile_by_index`.
   */
  setActiveTile(col: number, row: number, animate = false): boolean {
    const target = tileAt(this.infos, col, row);
    if (!target) {
      return false;
    }
    this.cancelMoving();
    const x = col * this.width;
    const y = row * this.height;
    // The target becomes active now, which widens the reachable range to include it.
    this.active = target;
    if (!animate || !this.animations) {
      this.scrollTo(x, y);
      this.announce();
      return true;
    }
    const fromX = this.scrollX;
    const fromY = this.scrollY;
    // The destination's own range may not include where the move starts, so allow the whole span.
    this.moveRange = {
      minX: Math.min(fromX, x),
      maxX: Math.max(fromX, x),
      minY: Math.min(fromY, y),
      maxY: Math.max(fromY, y),
    };
    this.moving = this.animations.start({
      from: 0,
      to: 1,
      durationMs: 250,
      easing: 'easeOut',
      onUpdate: (progress) => {
        this.scrollTo(fromX + (x - fromX) * progress, fromY + (y - fromY) * progress);
      },
      onComplete: () => {
        this.moving = undefined;
        this.moveRange = undefined;
        this.scrollTo(x, y);
        this.announce();
      },
    });
    return true;
  }

  /** The offsets the view can reach from the active tile: its neighbours it allows, nothing else. */
  override getScrollRange(): ScrollRange {
    if (this.moveRange) {
      return this.moveRange;
    }
    return tileRange(this.active, this.infos, this.width, this.height);
  }

  private get infos(): readonly TileInfo[] {
    return this.tileList.map((entry) => entry.info);
  }

  /** Moves by `(dCol, dRow)` from the active tile when it allows that direction. */
  private moveBy(dCol: number, dRow: number): void {
    const from = this.active;
    if (!from) {
      return;
    }
    const allowed =
      (dCol < 0 && from.directions.left) ||
      (dCol > 0 && from.directions.right) ||
      (dRow < 0 && from.directions.top) ||
      (dRow > 0 && from.directions.bottom);
    if (allowed) {
      this.setActiveTile(from.col + dCol, from.row + dRow, true);
    }
  }

  /** Makes the tile nearest the scroll position active, snapping onto it. */
  private settle(): void {
    // A swipe ends on the active tile or one neighbour it allows, never a diagonal or farther tile.
    const candidates = this.active ? reachableTiles(this.active, this.infos) : this.infos;
    const target = nearestTile(candidates, this.scrollX, this.scrollY, this.width, this.height);
    if (!target) {
      return;
    }
    this.settling = true;
    this.active = target;
    this.scrollTo(target.col * this.width, target.row * this.height);
    this.settling = false;
    this.announce();
  }

  /** Fires `valueChanged` when the active tile differs from the last one announced. */
  private announce(): void {
    if (this.active !== this.announced) {
      this.announced = this.active;
      this.dispatchEvent('valueChanged');
    }
  }

  /** Stops a tile-change animation where it is. */
  private cancelMoving(): void {
    this.moving?.cancel();
    this.moving = undefined;
    this.moveRange = undefined;
  }

  /** Sizes every tile to the view and keeps the active tile in view, following a resize. */
  protected override updateLayout(): void {
    this.layoutTiles();
    if (this.active && !this.scrolling && !this.moving) {
      this.scrollX = this.active.col * this.width;
      this.scrollY = this.active.row * this.height;
    }
  }

  /** Places each tile at its grid position, one view-size apart. */
  private layoutTiles(): void {
    for (const { info, container } of this.tileList) {
      container.x = info.col * this.width;
      container.y = info.row * this.height;
      container.width = this.width;
      container.height = this.height;
    }
  }
}
