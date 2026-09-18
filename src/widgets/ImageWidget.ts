import { LvObject, type LvObjectOptions } from '../core/LvObject';
import { paintRoundedRect } from '../rendering/shapes';
import { defaultTheme } from '../theme/defaultTheme';

export interface ImageWidgetOptions extends LvObjectOptions {
  /** A URL to load. Loading is asynchronous — see `onLoad`. */
  readonly src?: string;
  /** An already-available drawable (e.g. in tests, or a pre-decoded bitmap). Takes precedence over `src`. */
  readonly image?: CanvasImageSource;
  /** Called once `src` finishes loading. Call `renderOnce()`/keep the render loop running to actually redraw. */
  readonly onLoad?: () => void;
}

/**
 * Draws a bitmap, mirroring LVGL's `lv_image`. Renders a neutral
 * placeholder box until a source is available — real asset decoding
 * (matching the converter's font/image pipeline) is out of scope for
 * Stage 2.
 */
export class ImageWidget extends LvObject {
  private drawable: CanvasImageSource | undefined;
  private readonly onLoadCallback: (() => void) | undefined;

  constructor(options: ImageWidgetOptions) {
    super(options);
    this.onLoadCallback = options.onLoad;

    if (options.image) {
      this.drawable = options.image;
    } else if (options.src) {
      this.loadFromSrc(options.src);
    }
  }

  private loadFromSrc(src: string): void {
    const element = new Image();
    element.addEventListener('load', () => {
      this.drawable = element;
      this.onLoadCallback?.();
    });
    element.src = src;
  }

  protected override paintSelf(context: CanvasRenderingContext2D): void {
    const { x, y } = this.getAbsolutePosition();

    if (this.drawable) {
      context.drawImage(this.drawable, x, y, this.width, this.height);
      return;
    }

    paintRoundedRect(context, x, y, this.width, this.height, 0, defaultTheme.disabledColor);
  }
}
