import { describe, expect, it, vi } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext';
import { defaultTheme } from '../theme/defaultTheme';
import { Switch } from './Switch';

describe('Switch', () => {
  it('defaults to unchecked', () => {
    const toggle = new Switch({ width: 40, height: 20 });

    expect(toggle.checked).toBe(false);
  });

  it('draws the track in the border color, then the knob, when off', () => {
    const context = createFakeCanvasContext();
    const fillColors: string[] = [];
    (context.fill as ReturnType<typeof vi.fn>).mockImplementation(() => {
      fillColors.push(context.fillStyle as string);
    });
    const toggle = new Switch({ width: 40, height: 20, checked: false });

    toggle.render(context);

    expect(fillColors).toEqual([defaultTheme.borderColor, defaultTheme.backgroundColor]);
  });

  it('draws the track in the primary color when on', () => {
    const context = createFakeCanvasContext();
    const fillColors: string[] = [];
    (context.fill as ReturnType<typeof vi.fn>).mockImplementation(() => {
      fillColors.push(context.fillStyle as string);
    });
    const toggle = new Switch({ width: 40, height: 20, checked: true });

    toggle.render(context);

    expect(fillColors[0]).toBe(defaultTheme.primaryColor);
  });

  it('positions the knob on the left when off', () => {
    const context = createFakeCanvasContext();
    const toggle = new Switch({ x: 0, y: 0, width: 40, height: 20, checked: false });

    toggle.render(context);

    // knob diameter = height - 2*inset = 16, left edge at x + inset (2) => center at 2 + 8 = 10
    expect(context.arc).toHaveBeenCalledWith(10, 10, 8, 0, Math.PI * 2);
  });

  it('positions the knob on the right when on', () => {
    const context = createFakeCanvasContext();
    const toggle = new Switch({ x: 0, y: 0, width: 40, height: 20, checked: true });

    toggle.render(context);

    // knob left = width - diameter - inset = 40 - 16 - 2 = 22 => center at 22 + 8 = 30
    expect(context.arc).toHaveBeenCalledWith(30, 10, 8, 0, Math.PI * 2);
  });

  it('lets a caller override the knob color via knobStyle', () => {
    const context = createFakeCanvasContext();
    const fillColors: string[] = [];
    (context.fill as ReturnType<typeof vi.fn>).mockImplementation(() => {
      fillColors.push(context.fillStyle as string);
    });
    const toggle = new Switch({
      width: 40,
      height: 20,
      knobStyle: { base: { bgColor: '#ff00ff' } },
    });

    toggle.render(context);

    expect(fillColors[1]).toBe('#ff00ff');
  });

  it('toggles checked and fires valueChanged when clicked', () => {
    const toggle = new Switch({ width: 40, height: 20, checked: false });
    const valueChanged = vi.fn();
    toggle.addEventListener('valueChanged', valueChanged);

    toggle.dispatchEvent('clicked');

    expect(toggle.checked).toBe(true);
    expect(valueChanged).toHaveBeenCalledWith({ target: toggle });
  });
});
