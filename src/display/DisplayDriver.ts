/**
 * Pixel format the display reports, mirroring LVGL's `lv_disp_drv_t` color
 * depth setting. Stage 1's Canvas 2D context doesn't vary its own pixel
 * format by this value yet — it's tracked so later stages (and any
 * fidelity comparison against a real LVGL target) can reason about it.
 */
export type ColorFormat = 'RGB565' | 'RGB888' | 'ARGB8888';

export interface DisplayDriverOptions {
  readonly width: number;
  readonly height: number;
  readonly colorFormat?: ColorFormat;
  /** Overrides the backing-store scale factor; defaults to `window.devicePixelRatio`. */
  readonly devicePixelRatio?: number;
}

export interface DisplayDriver {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  /** Logical (CSS) pixel width — draw calls use this coordinate space. */
  readonly width: number;
  /** Logical (CSS) pixel height — draw calls use this coordinate space. */
  readonly height: number;
  readonly colorFormat: ColorFormat;
  readonly devicePixelRatio: number;
}

/**
 * Creates and mounts a `<canvas>` sized for `width`x`height` logical
 * pixels, scaling its backing store by `devicePixelRatio` so output stays
 * sharp on high-DPI screens. The returned context is pre-scaled, so all
 * drawing (including from {@link LvObject.render}) can be written in
 * logical pixel coordinates regardless of the actual backing-store size.
 */
export function createDisplayDriver(options: DisplayDriverOptions): DisplayDriver {
  const {
    width,
    height,
    colorFormat = 'RGB888',
    devicePixelRatio = getDefaultDevicePixelRatio(),
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * devicePixelRatio);
  canvas.height = Math.round(height * devicePixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to acquire a 2D rendering context for the simulator display.');
  }

  context.scale(devicePixelRatio, devicePixelRatio);

  return { canvas, context, width, height, colorFormat, devicePixelRatio };
}

function getDefaultDevicePixelRatio(): number {
  return typeof window !== 'undefined' && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
}
