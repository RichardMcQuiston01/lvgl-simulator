import { describe, expect, it, vi } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import { ButtonMatrix, type ButtonMatrixOptions } from './ButtonMatrix.js';

function matrix(options: Partial<ButtonMatrixOptions> = {}): ButtonMatrix {
  return new ButtonMatrix({
    width: 200,
    height: 100,
    map: ['1', '2', '3', '\n', '4', '5'],
    ...options,
  });
}

/** The centre of button `index`, in matrix-local coordinates. */
function centreOf(target: ButtonMatrix, index: number): { x: number; y: number } {
  const rect = target.buttonRects[index];
  if (!rect) {
    throw new Error(`No button ${index}.`);
  }
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Presses, releases and clicks the point `(x, y)`, the way the interaction controller does. */
function tap(target: ButtonMatrix, x: number, y: number): void {
  target.dispatchEvent('pressed');
  target.handlePointerPosition(x, y);
  target.dispatchEvent('released');
  target.dispatchEvent('clicked');
}

describe('ButtonMatrix map', () => {
  it('counts buttons and exposes their labels', () => {
    const target = matrix();
    expect(target.buttonCount).toBe(5);
    expect(target.buttonText(3)).toBe('4');
    expect(target.buttonText(9)).toBeUndefined();
  });

  it('lays buttons out in rows sharing the height, widths by relative weight', () => {
    const target = matrix({ map: ['a', 'b', '\n', 'c'], controls: [{ width: 3 }] });
    const [a, b, c] = target.buttonRects;
    expect(a?.y).toBe(b?.y);
    expect(c?.y).toBeGreaterThan(a?.y ?? 0);
    expect(a?.width).toBeCloseTo((b?.width ?? 0) * 3, 5);
    expect(c?.width).toBeGreaterThan(a?.width ?? 0);
  });

  it('replaces the buttons with setMap', () => {
    const target = matrix();
    target.setMap(['x', 'y']);
    expect(target.buttonCount).toBe(2);
    expect(target.selectedIndex).toBeUndefined();
  });
});

describe('ButtonMatrix clicks', () => {
  it('selects the clicked button and fires valueChanged', () => {
    const target = matrix();
    const listener = vi.fn();
    target.addEventListener('valueChanged', listener);
    const { x, y } = centreOf(target, 4);
    tap(target, x, y);
    expect(target.selectedIndex).toBe(4);
    expect(target.selectedText).toBe('5');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('ignores a release over a gap or after sliding off the button', () => {
    const target = matrix();
    const listener = vi.fn();
    target.addEventListener('valueChanged', listener);
    target.dispatchEvent('pressed');
    target.handlePointerPosition(centreOf(target, 0).x, centreOf(target, 0).y);
    target.handlePointerPosition(0, 0);
    target.dispatchEvent('released');
    target.dispatchEvent('clicked');
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not press hidden or disabled buttons', () => {
    const target = matrix({ controls: [{ hidden: true }, { disabled: true }] });
    const listener = vi.fn();
    target.addEventListener('valueChanged', listener);
    for (const index of [0, 1]) {
      const { x, y } = centreOf(target, index);
      tap(target, x, y);
    }
    expect(listener).not.toHaveBeenCalled();
    expect(target.pressButton(0)).toBe(false);
    expect(target.pressButton(2)).toBe(true);
  });
});

describe('ButtonMatrix checking', () => {
  it('toggles a checkable button and leaves a plain one alone', () => {
    const target = matrix({ controls: [{ checkable: true }] });
    target.pressButton(0);
    expect(target.isChecked(0)).toBe(true);
    target.pressButton(0);
    expect(target.isChecked(0)).toBe(false);
    target.pressButton(1);
    expect(target.isChecked(1)).toBe(false);
  });

  it('starts with the buttons the controls say are checked', () => {
    const target = matrix({ controls: [{ checkable: true, checked: true }] });
    expect(target.isChecked(0)).toBe(true);
    expect(target.checkedIndex).toBe(0);
  });

  it('keeps exactly one button checked with oneChecked', () => {
    const target = matrix({
      oneChecked: true,
      controls: [{ checkable: true }, { checkable: true }, { checkable: true }],
    });
    expect(target.checkedIndex).toBe(0);
    target.pressButton(2);
    expect([0, 1, 2].map((index) => target.isChecked(index))).toEqual([false, false, true]);
    target.pressButton(2);
    expect(target.isChecked(2)).toBe(true);
    expect(target.setChecked(2, false)).toBe(false);
  });

  it('reports whether setChecked changed anything, and refuses non-checkable buttons', () => {
    const target = matrix({ controls: [{ checkable: true }] });
    expect(target.setChecked(0, true)).toBe(true);
    expect(target.setChecked(0, true)).toBe(false);
    expect(target.setChecked(1, true)).toBe(false);
    expect(target.setChecked(99, true)).toBe(false);
  });

  it('changes flags at runtime with setButtonControl', () => {
    const target = matrix();
    target.setButtonControl(1, { disabled: true });
    expect(target.isPressable(1)).toBe(false);
    target.setButtonControl(1, { disabled: false, checkable: true });
    target.pressButton(1);
    expect(target.isChecked(1)).toBe(true);
    target.setButtonControl(99, { hidden: true });
  });
});

describe('ButtonMatrix keypad', () => {
  it('moves focus with the arrow keys and presses with Enter', () => {
    const target = matrix();
    const listener = vi.fn();
    target.addEventListener('valueChanged', listener);
    target.dispatchEvent('key', { key: 'ArrowRight' });
    expect(target.focusedIndex).toBe(0);
    target.dispatchEvent('key', { key: 'ArrowRight' });
    target.dispatchEvent('key', { key: 'ArrowDown' });
    expect(target.focusedIndex).toBe(4);
    target.dispatchEvent('key', { key: 'Enter' });
    expect(target.selectedIndex).toBe(4);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('skips disabled buttons and presses nothing before a selection exists', () => {
    const target = matrix({ controls: [{ disabled: true }, { hidden: true }] });
    target.dispatchEvent('key', { key: 'Enter' });
    expect(target.selectedIndex).toBeUndefined();
    target.dispatchEvent('key', { key: 'ArrowRight' });
    expect(target.focusedIndex).toBe(2);
  });

  it('forgets the focused button when it loses focus', () => {
    const target = matrix();
    target.dispatchEvent('key', { key: 'ArrowRight' });
    target.dispatchEvent('defocused');
    expect(target.focusedIndex).toBeUndefined();
  });
});

describe('ButtonMatrix painting', () => {
  it('paints each visible button label and skips hidden ones', () => {
    const target = matrix({ controls: [{ hidden: true }] });
    const context = createFakeCanvasContext();
    target.render(context);
    const labels = vi.mocked(context.fillText).mock.calls.map((call) => call[0]);
    expect(labels).toEqual(['2', '3', '4', '5']);
  });

  it('draws a checked button in the primary color with on-primary text', () => {
    const target = matrix({ controls: [{ checkable: true, checked: true }] });
    const fills: string[] = [];
    const context = createFakeCanvasContext();
    vi.mocked(context.fill).mockImplementation(() => {
      fills.push(String(context.fillStyle));
    });
    const textColors: string[] = [];
    vi.mocked(context.fillText).mockImplementation(() => {
      textColors.push(String(context.fillStyle));
    });
    target.render(context);
    expect(fills).toContain(defaultTheme.primaryColor);
    expect(textColors[0]).toBe(defaultTheme.textColorOnPrimary);
    expect(textColors[1]).toBe(defaultTheme.textColor);
  });
});
