import { describe, expect, it } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext';
import { defaultTheme } from '../theme/defaultTheme';
import { Button } from './Button';

describe('Button', () => {
  it('defaults its background to the theme primary color', () => {
    const button = new Button({ width: 80, height: 30 });

    expect(button.backgroundColor).toBe(defaultTheme.primaryColor);
  });

  it('paints a filled rounded rect and its label centered', () => {
    const context = createFakeCanvasContext();
    const button = new Button({ x: 5, y: 5, width: 80, height: 30, text: 'Save' });

    button.render(context);

    expect(context.fill).toHaveBeenCalled();
    expect(context.fillStyle).toBe(defaultTheme.textColorOnPrimary);
    expect(context.fillText).toHaveBeenCalledWith('Save', 45, 20);
  });

  it('skips drawing text when none is given', () => {
    const context = createFakeCanvasContext();
    const button = new Button({ width: 80, height: 30 });

    button.render(context);

    expect(context.fillText).not.toHaveBeenCalled();
  });

  it('respects an explicit background color', () => {
    const context = createFakeCanvasContext();
    const button = new Button({ width: 80, height: 30, backgroundColor: '#00ff00' });

    button.render(context);

    expect(context.fillStyle).toBe('#00ff00');
  });
});
