import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import { paintRoundedRect } from '../rendering/shapes.js';
import { mergeStyle } from '../style/Style.js';
import { defaultTheme } from '../theme/defaultTheme.js';

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
 * placeholder box (`style.base.bgColor`) until a source is available —
 * real asset decoding (matching the converter's font/image pipeline) is
 * out of scope for this simulator so far.
 */
export class ImageWidget extends LvObject {
  private drawable: CanvasImageSource | undefined;
  private readonly onLoadCallback: (() => void) | undefined;

  constructor(options: ImageWidgetOptions) {
    super({
      ...options,
      style: {
        base: mergeStyle({ bgColor: defaultTheme.disabledColor }, options.style?.base),
        states: options.style?.states,
      },
    });
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

    const style = this.resolvedStyle;
    paintRoundedRect(
      context,
      x,
      y,
      this.width,
      this.height,
      style.radius ?? 0,
      style.bgColor ?? defaultTheme.disabledColor,
    );
  }
}
