import { LvObject, type LvObjectOptions } from '../core/LvObject.js';
import { mergeStyle, type StyleSet } from '../style/Style.js';
import { textMeasurer, fontString } from '../text/measureText.js';
import { wrapLines, type MeasureText } from '../text/layout.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import { Button } from './Button.js';
import { Container } from './Container.js';
import { Label } from './Label.js';

const PADDING = 16;
const GAP = 12;
const HEADER_HEIGHT = 32;
const BUTTON_HEIGHT = 36;
const DEFAULT_BOX_WIDTH = 280;
/** Line height as a multiple of the font size. */
const LINE_HEIGHT_RATIO = 1.3;
/** Width of a character, as a multiple of the font size, until a canvas is available to measure with. */
const FALLBACK_CHAR_RATIO = 0.6;
/** Opacity (0-255) of the dimming behind a modal message box. */
const BACKDROP_OPACITY = 128;

/** Wrapped, left-aligned body text for a {@link Msgbox}. */
class MsgboxText extends LvObject {
  text: string;
  private measureContext: CanvasRenderingContext2D | undefined;

  /** Creates the text block; its height is set by the message box from {@link heightFor}. */
  constructor(text: string, width: number) {
    super({ width, height: 0, clickable: false, scrollable: false });
    this.text = text;
  }

  /** A width measurer: the real canvas once painted, a per-character estimate before that. */
  private get measure(): MeasureText {
    const style = this.resolvedStyle;
    const size = style.textFontSize ?? defaultTheme.fontSize;
    const context = this.measureContext;
    if (context) {
      const font = fontString(size, style.textFontFamily ?? defaultTheme.fontFamily);
      return (text) => textMeasurer.measure(context, text, font);
    }
    return (text) => text.length * size * FALLBACK_CHAR_RATIO;
  }

  private get lineHeight(): number {
    return (this.resolvedStyle.textFontSize ?? defaultTheme.fontSize) * LINE_HEIGHT_RATIO;
  }

  /** The text wrapped to `width`, one entry per line. */
  linesFor(width: number): readonly string[] {
    return wrapLines(this.text, width, this.measure).map((line) =>
      this.text.slice(line.start, line.end).replace(/\s+$/, ''),
    );
  }

  /** How tall the text is when wrapped to `width`. */
  heightFor(width: number): number {
    return this.text === '' ? 0 : this.linesFor(width).length * this.lineHeight;
  }

  /** Draws each wrapped line. */
  protected override paintSelf(context: CanvasRenderingContext2D): void {
    this.measureContext = context;
    if (this.text === '') {
      return;
    }
    const style = this.resolvedStyle;
    const { x, y } = this.getAbsolutePosition();
    context.fillStyle = style.textColor ?? defaultTheme.textColor;
    context.font = fontString(
      style.textFontSize ?? defaultTheme.fontSize,
      style.textFontFamily ?? defaultTheme.fontFamily,
    );
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    this.linesFor(this.width).forEach((line, index) => {
      context.fillText(line, x, y + (index + 0.5) * this.lineHeight);
    });
  }
}

export interface MsgboxOptions extends Omit<LvObjectOptions, 'height'> {
  /** The box's width, or with `modal` the backdrop's (the screen's) width. */
  readonly width: number;
  /** With `modal`, the backdrop's (the screen's) height, which is required. Otherwise the height follows the content. */
  readonly height?: number;
  readonly title?: string;
  readonly text?: string;
  /** Labels of the footer buttons, left to right. Mirrors `lv_msgbox_add_footer_button`. */
  readonly buttons?: readonly string[];
  /** Adds a close button to the header, which closes the box and fires `cancel`. Mirrors `lv_msgbox_add_close_button`. */
  readonly closeButton?: boolean;
  /** Dims everything behind the box, blocks input to it, and centres the box in `width` by `height` (default `false`). */
  readonly modal?: boolean;
  /** Width of the box when `modal` (default 280). */
  readonly boxWidth?: number;
  /** Closes a modal box, firing `cancel`, when the dimmed area outside it is clicked (default `false`). */
  readonly dismissOnBackdrop?: boolean;
  /** Style for the box itself. */
  readonly boxStyle?: StyleSet;
}

/**
 * A message box with a title, text, a close button and footer buttons,
 * mirroring LVGL's `lv_msgbox`. Its height follows the text, which wraps to
 * the box's width. Clicking a footer button fires `valueChanged` with its
 * index in {@link lastButtonIndex} (it does not close the box; call
 * {@link close} when you want it gone). The close button, `Escape` and, when
 * allowed, a click on a modal backdrop fire `cancel` and close it. A `modal`
 * box paints above everything and blocks clicks to what is under it.
 */
export class Msgbox extends LvObject {
  readonly modal: boolean;
  dismissOnBackdrop: boolean;
  /** The index of the footer button clicked last, or `undefined` before any. */
  lastButtonIndex: number | undefined;
  /** The box itself. For a modal message box this sits in the middle of the backdrop. */
  readonly box: Container;

  private readonly titleLabel: Label | undefined;
  private readonly closeButtonObject: Button | undefined;
  private readonly body: MsgboxText;
  private readonly footer: Button[] = [];
  private readonly boxWidth: number;

  /** Creates a message box. A `modal` one needs `height` too, as it fills that space. */
  constructor(options: MsgboxOptions) {
    const modal = options.modal ?? false;
    if (modal && options.height === undefined) {
      throw new Error(
        'A modal Msgbox fills the screen behind it, so it needs a height as well as a width.',
      );
    }
    const boxWidth = modal ? (options.boxWidth ?? DEFAULT_BOX_WIDTH) : options.width;
    super({
      ...options,
      height: options.height ?? 0,
      topLayer: options.topLayer ?? modal,
      scrollable: false,
      style: {
        base: mergeStyle(
          modal ? { bgColor: '#000000', bgOpa: BACKDROP_OPACITY } : { bgOpa: 0 },
          options.style?.base,
        ),
        states: options.style?.states,
      },
    });
    this.modal = modal;
    this.boxWidth = boxWidth;
    this.dismissOnBackdrop = options.dismissOnBackdrop ?? false;

    this.box = new Container({
      width: boxWidth,
      height: 0,
      scrollable: false,
      style: {
        base: mergeStyle(
          {
            bgColor: defaultTheme.backgroundColor,
            borderColor: defaultTheme.borderColor,
            borderWidth: 1,
            radius: defaultTheme.radius + 2,
            shadowWidth: modal ? 16 : 0,
            shadowColor: '#000000',
            shadowOpa: 60,
          },
          options.boxStyle?.base,
        ),
        states: options.boxStyle?.states,
      },
    });
    super.addChild(this.box);

    if (options.title !== undefined) {
      this.titleLabel = new Label({
        width: 0,
        height: HEADER_HEIGHT,
        text: options.title,
        style: { base: { textFontSize: defaultTheme.fontSize + 2 } },
      });
      this.box.addChild(this.titleLabel);
    }
    if (options.closeButton) {
      this.closeButtonObject = new Button({
        width: HEADER_HEIGHT,
        height: HEADER_HEIGHT,
        text: '×',
      });
      this.closeButtonObject.addEventListener('clicked', () => this.cancel());
      this.box.addChild(this.closeButtonObject);
    }
    this.body = new MsgboxText(options.text ?? '', boxWidth - PADDING * 2);
    this.box.addChild(this.body);
    (options.buttons ?? []).forEach((label) => this.addButton(label));

    this.addEventListener('clicked', () => {
      if (this.modal && this.dismissOnBackdrop) {
        this.cancel();
      }
    });
    this.addEventListener('key', (event) => {
      if (event.key === 'Escape') {
        this.cancel();
      }
    });
    this.layoutBox();
  }

  /** The title text, or `undefined` when there is none. */
  get title(): string | undefined {
    return this.titleLabel?.text;
  }

  set title(value: string | undefined) {
    if (this.titleLabel && value !== undefined) {
      this.titleLabel.text = value;
    }
  }

  /** The body text. */
  get text(): string {
    return this.body.text;
  }

  set text(value: string) {
    this.body.text = value;
    this.layoutBox();
  }

  /** The footer buttons, left to right. */
  get buttons(): readonly Button[] {
    return this.footer;
  }

  /** The label of the footer button clicked last, or `undefined`. */
  get lastButtonText(): string | undefined {
    return this.lastButtonIndex === undefined ? undefined : this.footer[this.lastButtonIndex]?.text;
  }

  /** The close button, when the box has one. */
  get closeButton(): Button | undefined {
    return this.closeButtonObject;
  }

  /** Adds a footer button labelled `label` and returns it. Mirrors `lv_msgbox_add_footer_button`. */
  addButton(label: string): Button {
    const button = new Button({ width: 0, height: BUTTON_HEIGHT, text: label });
    const index = this.footer.length;
    button.addEventListener('clicked', () => {
      this.lastButtonIndex = index;
      this.dispatchEvent('valueChanged');
    });
    this.footer.push(button);
    this.box.addChild(button);
    this.layoutBox();
    return button;
  }

  /** Removes the message box from its parent. Mirrors `lv_msgbox_close`. */
  close(): void {
    this.parent?.removeChild(this);
  }

  /** Fires `cancel`, then closes the box. */
  private cancel(): void {
    this.dispatchEvent('cancel');
    this.close();
  }

  /** Lays the header, text and footer out inside the box, sizes the box to them, and centres it when modal. */
  private layoutBox(): void {
    const inner = this.boxWidth - PADDING * 2;
    let y = PADDING;
    const hasHeader = this.titleLabel !== undefined || this.closeButtonObject !== undefined;
    if (hasHeader) {
      const closeWidth = this.closeButtonObject ? HEADER_HEIGHT + GAP : 0;
      if (this.titleLabel) {
        this.titleLabel.x = PADDING;
        this.titleLabel.y = y;
        this.titleLabel.width = inner - closeWidth;
        this.titleLabel.height = HEADER_HEIGHT;
      }
      if (this.closeButtonObject) {
        this.closeButtonObject.x = this.boxWidth - PADDING - HEADER_HEIGHT;
        this.closeButtonObject.y = y;
      }
      y += HEADER_HEIGHT + GAP;
    }
    const textHeight = this.body.heightFor(inner);
    this.body.x = PADDING;
    this.body.y = y;
    this.body.width = inner;
    this.body.height = textHeight;
    if (textHeight > 0) {
      y += textHeight + GAP;
    }
    if (this.footer.length > 0) {
      const count = this.footer.length;
      const width = (inner - GAP * (count - 1)) / count;
      this.footer.forEach((button, index) => {
        button.x = PADDING + index * (width + GAP);
        button.y = y;
        button.width = width;
        button.height = BUTTON_HEIGHT;
      });
      y += BUTTON_HEIGHT + GAP;
    }
    // The last gap becomes the bottom padding.
    const boxHeight = Math.max(PADDING * 2, y - GAP + PADDING);
    this.box.width = this.boxWidth;
    this.box.height = boxHeight;
    if (this.modal) {
      this.box.x = (this.width - this.boxWidth) / 2;
      this.box.y = (this.height - boxHeight) / 2;
    } else {
      this.box.x = 0;
      this.box.y = 0;
      this.height = boxHeight;
    }
  }

  /** Re-lays the box out each frame, so wrapped text follows the measured font once it has been painted. */
  protected override updateLayout(): void {
    this.layoutBox();
  }
}
