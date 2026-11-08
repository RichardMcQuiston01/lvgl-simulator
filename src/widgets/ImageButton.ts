import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import type { LvState } from '../style/Style.js';

/** The visual states an {@link ImageButton} can show a different image for, mirroring `lv_imagebutton_state_t`. */
export type ImageButtonState =
  'released' | 'pressed' | 'disabled' | 'checkedReleased' | 'checkedPressed' | 'checkedDisabled';

/** A URL to load, or an already-decoded drawable. */
export type ImageButtonSource = string | CanvasImageSource;

/**
 * One state's artwork: a `left` cap, a `right` cap, and a `mid` image tiled
 * between them, so the button can be any width. A lone `mid` just tiles
 * across the whole button. Mirrors `lv_imagebutton_set_src`.
 */
export interface ImageButtonImages {
  readonly left?: ImageButtonSource;
  readonly mid?: ImageButtonSource;
  readonly right?: ImageButtonSource;
}

type ImagePart = keyof ImageButtonImages;

const PARTS: readonly ImagePart[] = ['left', 'mid', 'right'];
/** Most tiles one button draws, so a tiny `mid` image cannot stall a frame. */
const MAX_TILES = 2000;

export interface ImageButtonOptions extends LvObjectOptions {
  readonly images?: Partial<Record<ImageButtonState, ImageButtonImages>>;
  /** Whether a click toggles `checked` (default `false`). Mirrors the `CHECKABLE` flag. */
  readonly checkable?: boolean;
  readonly checked?: boolean;
  /** Called when a URL source finishes loading. Repaint (`renderOnce()`) to show it. */
  readonly onLoad?: () => void;
  /** Called with the URL when a source fails to load, so the failure is not silent. */
  readonly onError?: (src: string) => void;
}

/** The pixel size of `drawable`, using its natural size where it has one. */
function sizeOf(drawable: CanvasImageSource): { width: number; height: number } {
  const source = drawable as {
    naturalWidth?: number;
    naturalHeight?: number;
    width?: number | { baseVal?: { value: number } };
    height?: number | { baseVal?: { value: number } };
  };
  const width = source.naturalWidth ?? (typeof source.width === 'number' ? source.width : 0);
  const height = source.naturalHeight ?? (typeof source.height === 'number' ? source.height : 0);
  return { width, height };
}

/**
 * A button drawn from per-state images instead of a style, mirroring
 * LVGL's `lv_imagebutton`. A state with no image falls back to the
 * `released` one. Draws nothing until an image has loaded; a URL that fails
 * to load is reported through `onError`.
 */
export class ImageButton extends LvObject {
  checkable: boolean;
  checked: boolean;

  private readonly drawables = new Map<string, CanvasImageSource>();
  private readonly onLoadCallback: (() => void) | undefined;
  private readonly onErrorCallback: ((src: string) => void) | undefined;

  /** Creates the button and starts loading any URL sources. */
  constructor(options: ImageButtonOptions) {
    super(options);
    this.checkable = options.checkable ?? false;
    this.checked = options.checked ?? false;
    this.onLoadCallback = options.onLoad;
    this.onErrorCallback = options.onError;

    for (const [state, images] of Object.entries(options.images ?? {})) {
      for (const part of PARTS) {
        const source = images?.[part];
        if (source !== undefined) {
          this.register(`${state}:${part}`, source);
        }
      }
    }

    // Toggling on click is the button's own reaction to input, like Checkbox.
    this.addEventListener('clicked', () => {
      if (this.checkable) {
        this.checked = !this.checked;
        this.dispatchEvent('valueChanged');
      }
    });
  }

  /** Stores a drawable under `key`, loading it first when `source` is a URL. */
  private register(key: string, source: ImageButtonSource): void {
    if (typeof source !== 'string') {
      this.drawables.set(key, source);
      return;
    }
    const element = new Image();
    element.addEventListener('load', () => {
      this.drawables.set(key, element);
      this.onLoadCallback?.();
    });
    element.addEventListener('error', () => this.onErrorCallback?.(source));
    element.src = source;
  }

  /** Adds `checked` to the inherited states so `style.states.checked` applies. */
  protected override getActiveStates(): ReadonlySet<LvState> {
    const states = new Set(super.getActiveStates());
    if (this.checked) {
      states.add('checked');
    }
    return states;
  }

  /** The image state matching the current checked, pressed and disabled flags. */
  get imageState(): ImageButtonState {
    if (this.checked) {
      if (this.disabled) {
        return 'checkedDisabled';
      }
      return this.pressed ? 'checkedPressed' : 'checkedReleased';
    }
    if (this.disabled) {
      return 'disabled';
    }
    return this.pressed ? 'pressed' : 'released';
  }

  /** The drawable for `part` in the current state, else in `released`. */
  private drawableFor(part: ImagePart): CanvasImageSource | undefined {
    return (
      this.drawables.get(`${this.imageState}:${part}`) ?? this.drawables.get(`released:${part}`)
    );
  }

  /** Paints the object's own background, then the left cap, tiled middle, and right cap. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    super.paintSelf(context);
    const left = this.drawableFor('left');
    const mid = this.drawableFor('mid');
    const right = this.drawableFor('right');
    const { x, y } = this.getAbsolutePosition();

    const leftSize = left ? sizeOf(left) : { width: 0, height: 0 };
    const rightSize = right ? sizeOf(right) : { width: 0, height: 0 };
    if (left) {
      context.drawImage(left, x, y, leftSize.width, leftSize.height || this.height);
    }
    if (right) {
      context.drawImage(
        right,
        x + this.width - rightSize.width,
        y,
        rightSize.width,
        rightSize.height || this.height,
      );
    }

    if (!mid) {
      return;
    }
    const midSize = sizeOf(mid);
    const midLeft = x + leftSize.width;
    const midWidth = this.width - leftSize.width - rightSize.width;
    if (midSize.width <= 0 || midWidth <= 0) {
      return;
    }
    const tileHeight = midSize.height || this.height;
    context.save();
    context.beginPath();
    context.rect(midLeft, y, midWidth, this.height);
    context.clip();
    const tiles = Math.min(MAX_TILES, Math.ceil(midWidth / midSize.width));
    for (let tile = 0; tile < tiles; tile += 1) {
      context.drawImage(mid, midLeft + tile * midSize.width, y, midSize.width, tileHeight);
    }
    context.restore();
  }
}
