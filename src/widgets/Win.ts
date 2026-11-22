import type { LvObjectOptions } from '../core/LvObject.js';
import { mergeStyle, type StyleSet } from '../style/Style.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import { Button } from './Button.js';
import { Container } from './Container.js';
import { Label } from './Label.js';

const DEFAULT_HEADER_HEIGHT = 40;
const HEADER_PADDING = 8;
const HEADER_GAP = 4;
/** Space kept above and below a header's children. */
const HEADER_CHILD_MARGIN = 4;

export interface WinOptions extends LvObjectOptions {
  /** Title shown in the header; add more with {@link Win.addTitle}. */
  readonly title?: string;
  /** Height of the header bar (default 40). Mirrors `lv_win_set_header_height`. */
  readonly headerHeight?: number;
  /** Style for the header bar — LVGL's `LV_PART_HEADER`-like header container. */
  readonly headerStyle?: StyleSet;
  /** Style for the content area below the header. */
  readonly contentStyle?: StyleSet;
}

/**
 * A window with a header bar over a content area, mirroring LVGL's `lv_win`.
 * The header holds a title ({@link addTitle}, which takes up the free width)
 * and buttons ({@link addButton}) in a row; put your own widgets in
 * {@link content}. The header is always on top.
 */
export class Win extends Container {
  /** The header bar. A flex row, so anything added to it lines up with the title and buttons. */
  readonly header: Container;
  /** The area below the header that holds the window's own widgets. Mirrors `lv_win_get_content`. */
  readonly content: Container;
  headerHeight: number;

  /** Creates a window; `options.title` adds a title to the header. */
  constructor(options: WinOptions) {
    super({
      ...options,
      scrollable: options.scrollable ?? false,
      style: {
        base: mergeStyle(
          {
            bgColor: defaultTheme.backgroundColor,
            borderColor: defaultTheme.borderColor,
            borderWidth: 1,
          },
          options.style?.base,
        ),
        states: options.style?.states,
      },
    });
    this.headerHeight = options.headerHeight ?? DEFAULT_HEADER_HEIGHT;
    this.header = new Container({
      width: this.width,
      height: this.headerHeight,
      layout: { type: 'flex', direction: 'row', crossAlign: 'center', columnGap: HEADER_GAP },
      scrollable: false,
      style: {
        base: mergeStyle(
          {
            bgColor: '#eceff1',
            padLeft: HEADER_PADDING,
            padRight: HEADER_PADDING,
          },
          options.headerStyle?.base,
        ),
        states: options.headerStyle?.states,
      },
    });
    this.content = new Container({
      width: this.width,
      height: Math.max(0, this.height - this.headerHeight),
      style: {
        base: mergeStyle({ bgColor: defaultTheme.backgroundColor }, options.contentStyle?.base),
        states: options.contentStyle?.states,
      },
    });
    super.addChild(this.header);
    super.addChild(this.content);
    if (options.title !== undefined) {
      this.addTitle(options.title);
    }
  }

  /** Appends a title to the header and returns it; it grows to fill the header's free width. Mirrors `lv_win_add_title`. */
  addTitle(text: string): Label {
    const title = new Label({
      width: 0,
      height: this.headerHeight - HEADER_CHILD_MARGIN * 2,
      text,
      flexGrow: 1,
    });
    this.header.addChild(title);
    return title;
  }

  /**
   * Appends a button to the header and returns it. `text` is its label (a
   * glyph works as an icon) and `width` its width, defaulting to the header's
   * height so it is square. Mirrors `lv_win_add_button`.
   */
  addButton(text: string, width?: number): Button {
    const button = new Button({
      width: width ?? this.headerHeight - HEADER_CHILD_MARGIN * 2,
      height: this.headerHeight - HEADER_CHILD_MARGIN * 2,
      text,
    });
    this.header.addChild(button);
    return button;
  }

  /** Sizes the header across the top and the content below it, following the window's current size. */
  protected override updateLayout(): void {
    this.header.x = 0;
    this.header.y = 0;
    this.header.width = this.width;
    this.header.height = this.headerHeight;
    this.content.x = 0;
    this.content.y = this.headerHeight;
    this.content.width = this.width;
    this.content.height = Math.max(0, this.height - this.headerHeight);
  }
}
