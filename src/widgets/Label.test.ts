import { describe, expect, it } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext';
import { defaultTheme } from '../theme/defaultTheme';
import { Label } from './Label';

describe('Label', () => {
  it('draws its text at the vertical center of its box', () => {
    const context = createFakeCanvasContext();
    const label = new Label({ x: 10, y: 20, width: 100, height: 30, text: 'Hello' });

    label.render(context);

    expect(context.fillText).toHaveBeenCalledWith('Hello', 10, 35);
  });

  it('defaults to the theme text color, font size, and font family', () => {
    const label = new Label({ width: 10, height: 10, text: 'x' });

    expect(label.resolvedStyle.textColor).toBe(defaultTheme.textColor);
    expect(label.resolvedStyle.textFontSize).toBe(defaultTheme.fontSize);
    expect(label.resolvedStyle.textFontFamily).toBe(defaultTheme.fontFamily);
  });

  it('respects explicit text styling options', () => {
    const context = createFakeCanvasContext();
    const label = new Label({
      width: 10,
      height: 10,
      text: 'x',
      textColor: '#ff0000',
      fontSize: 20,
      fontFamily: 'monospace',
    });

    label.render(context);

    expect(context.fillStyle).toBe('#ff0000');
    expect(context.font).toBe('20px monospace');
  });
});
