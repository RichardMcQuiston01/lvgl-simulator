import { describe, expect, it, vi } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext';
import { defaultTheme } from '../theme/defaultTheme';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('defaults to unchecked', () => {
    const checkbox = new Checkbox({ width: 100, height: 20 });

    expect(checkbox.checked).toBe(false);
  });

  it('strokes an empty indicator when unchecked', () => {
    const context = createFakeCanvasContext();
    const checkbox = new Checkbox({ width: 100, height: 20, checked: false });

    checkbox.render(context);

    expect(context.stroke).toHaveBeenCalled();
    expect(context.fill).not.toHaveBeenCalled();
  });

  it('fills the indicator and draws a checkmark when checked', () => {
    const context = createFakeCanvasContext();
    const checkbox = new Checkbox({ width: 100, height: 20, checked: true });

    checkbox.render(context);

    expect(context.fill).toHaveBeenCalled();
    expect(context.stroke).toHaveBeenCalled(); // the checkmark itself is stroked
  });

  it('draws its label to the right of the indicator', () => {
    const context = createFakeCanvasContext();
    const checkbox = new Checkbox({ x: 0, y: 0, width: 100, height: 20, text: 'Enabled' });

    checkbox.render(context);

    expect(context.fillText).toHaveBeenCalledWith('Enabled', 28, 10);
  });

  it('skips the label when no text is given', () => {
    const context = createFakeCanvasContext();
    const checkbox = new Checkbox({ width: 100, height: 20 });

    checkbox.render(context);

    expect(context.fillText).not.toHaveBeenCalled();
  });

  it('caps the indicator size to the box height', () => {
    const context = createFakeCanvasContext();
    const checkbox = new Checkbox({ width: 100, height: 8, text: 'x' });

    checkbox.render(context);

    // Indicator is min(20, height=8) = 8px, so the label starts at x + 8 + 8 gap
    expect(context.fillText).toHaveBeenCalledWith('x', 16, 4);
  });

  it('uses the theme primary color for a checked indicator', () => {
    const context = createFakeCanvasContext();
    const checkbox = new Checkbox({ width: 100, height: 20, checked: true });

    checkbox.render(context);

    // The checkmark (stroked last) uses the on-primary color for contrast.
    expect(context.strokeStyle).toBe(defaultTheme.textColorOnPrimary);
  });

  it('lets a caller override the checked indicator color via indicatorStyle', () => {
    const context = createFakeCanvasContext();
    const fillColors: string[] = [];
    (context.fill as ReturnType<typeof vi.fn>).mockImplementation(() => {
      fillColors.push(context.fillStyle as string);
    });
    const checkbox = new Checkbox({
      width: 100,
      height: 20,
      checked: true,
      indicatorStyle: { base: {}, states: { checked: { bgColor: '#ff00ff' } } },
    });

    checkbox.render(context);

    expect(fillColors[0]).toBe('#ff00ff');
  });

  it('does not apply a checked-state indicatorStyle override while unchecked', () => {
    const context = createFakeCanvasContext();
    const checkbox = new Checkbox({
      width: 100,
      height: 20,
      checked: false,
      indicatorStyle: { base: {}, states: { checked: { borderColor: '#ff00ff' } } },
    });

    checkbox.render(context);

    expect(context.strokeStyle).toBe(defaultTheme.borderColor);
  });

  it('toggles checked and fires valueChanged when clicked', () => {
    const checkbox = new Checkbox({ width: 100, height: 20, checked: false });
    const valueChanged = vi.fn();
    checkbox.addEventListener('valueChanged', valueChanged);

    checkbox.dispatchEvent('clicked');

    expect(checkbox.checked).toBe(true);
    expect(valueChanged).toHaveBeenCalledWith({ target: checkbox });

    checkbox.dispatchEvent('clicked');

    expect(checkbox.checked).toBe(false);
    expect(valueChanged).toHaveBeenCalledTimes(2);
  });
});
